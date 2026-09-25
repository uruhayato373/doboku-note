#!/usr/bin/env node
/**
 * coconala-talkroom.mjs — トークルーム1件のメッセージと添付ファイルを手元に取得する
 * ---------------------------------------------------------------------------
 * なぜ必要か:
 *   coconala-orders.mjs は個人情報を持ち帰らない設計で、トークルーム本文も添付も取らない。
 *   しかし受注処理（/coconala-order）では、購入者のメッセージと添付の答案を読まないと
 *   添削に入れない。2026-09-25 の S2 初回受注では、その場で Playwright を4回書き直して
 *   ようやく読めた（添付はクリックでは落ちず、ホバーで出るボタンにしかない・画像は saveAs が
 *   ブラウザ終了と競合して失敗する）。その手順をここに固定する。
 *
 * 個人情報の扱い:
 *   出力は .tmp/coconala/talkrooms/{id}/ だけ（.gitignore 済み・リポジトリに入らない）。
 *   取引が閉じたら削除してよい。orders-log には何も書かない。
 *
 * 操作の範囲:
 *   送信・納品・クリックによる状態変更はしない。添付はダウンロードボタンで発生する
 *   download イベントから署名付き URL だけを受け取り、同じログイン状態で直接取得する。
 *   ※ トークルームを開くとココナラ上で既読になる（人が未読で気づく経路は減る）。
 *
 * 出力:
 *   messages.txt        トークルーム画面のテキスト（メッセージ・日時・添付名）
 *   attachments/<name>  添付ファイル（docx は <name>.txt に本文も書き出す）
 *   manifest.json       取得日時・添付ごとの bytes / sha256 / 本文テキストのパス
 *
 * 使い方:
 *   node scripts/coconala-talkroom.mjs <talkroomId> [--out <dir>] [--no-attachments] [--headless]
 * exit: 0=全件取得 / 2=検査不成立（ログイン不可・添付の一部が取れない・添付0件なのに画面に添付表示あり）
 * ---------------------------------------------------------------------------
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { launchContext, waitForLogin, assertAccount, sleep, ROOT } from './lib/coconala-session.mjs';
import { docxToText } from './lib/docx-text.mjs';

const TAG = '[coconala-talkroom]';
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const id = argv.find((a, i) => /^\d+$/.test(a) && argv[i - 1] !== '--out');
const HEADLESS = argv.includes('--headless');
const WITH_ATTACHMENTS = !argv.includes('--no-attachments');
const OUT = opt('--out') || join(ROOT, '.tmp/coconala/talkrooms', String(id));

const safeName = (s) => basename(String(s)).replace(/[\\/:*?"<>|]/g, '_').trim() || 'file';

async function main() {
  if (!id) {
    console.error(`${TAG} 使い方: node scripts/coconala-talkroom.mjs <talkroomId> [--out <dir>]`);
    return 2;
  }
  mkdirSync(join(OUT, 'attachments'), { recursive: true });
  const ctx = await launchContext({ headless: HEADLESS });
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    const login = await waitForLogin(page, { tag: TAG });
    if (!login.ok) { console.error(`${TAG} ${login.reason}`); return 2; }
    const acct = await assertAccount(page, { tag: TAG });
    if (!acct.ok) { console.error(`${TAG} ${acct.reason}`); return 2; }

    await page.goto(`https://coconala.com/talkrooms/${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
    await sleep(3000);
    if (!/\/talkrooms\/\d+/.test(page.url())) { console.error(`${TAG} トークルームを開けない: ${page.url()}`); return 2; }

    const text = await page.evaluate(() => document.querySelector('main')?.innerText || document.body.innerText);
    writeFileSync(join(OUT, 'messages.txt'), text, 'utf8');
    console.log(`${TAG} メッセージ ${text.length} 字 → ${join(OUT, 'messages.txt')}`);

    const items = page.locator('.d-talkroomMessage_attachedFiles .d-attachedFile');
    const shown = await items.count();
    const attachments = [];
    let failed = 0;
    if (WITH_ATTACHMENTS) {
      for (let i = 0; i < shown; i++) {
        const item = items.nth(i);
        const label = (await item.locator('.tooltip-content').first().textContent().catch(() => '') || '').trim();
        try {
          // ボタンは display:none（ホバーで出る）なので DOM から直接 click する
          const [dl] = await Promise.all([
            page.waitForEvent('download', { timeout: 30000 }),
            item.evaluate((el) => el.querySelector('.d-attachedFileControls_button .-download')?.parentElement?.click()),
          ]);
          const url = dl.url();
          await dl.cancel().catch(() => {});
          const res = await ctx.request.get(url, { timeout: 120000 });
          if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
          const bytes = await res.body();
          const name = safeName(dl.suggestedFilename() || label || `attachment-${i + 1}`);
          const path = join(OUT, 'attachments', name);
          writeFileSync(path, bytes);
          const entry = { name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), path, textPath: null };
          if (/\.docx$/i.test(name)) {
            try {
              entry.textPath = `${path}.txt`;
              writeFileSync(entry.textPath, docxToText(bytes), 'utf8');
            } catch (e) { entry.textPath = null; entry.textError = e.message; }
          }
          attachments.push(entry);
          console.log(`${TAG} 添付 ${name}（${bytes.length} bytes）${entry.textPath ? ' → 本文 .txt あり' : ''}`);
        } catch (e) {
          failed++;
          attachments.push({ name: label || `attachment-${i + 1}`, error: e.message.split('\n')[0] });
          console.log(`${TAG} ✗ 添付を取得できない: ${label || i + 1}（${e.message.split('\n')[0]}）`);
        }
      }
    }

    writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({
      talkroomId: String(id),
      fetchedAt: new Date().toISOString(),
      messagesPath: join(OUT, 'messages.txt'),
      attachmentsShown: shown,
      attachmentsSaved: attachments.filter((a) => !a.error).length,
      attachments,
    }, null, 2) + '\n', 'utf8');

    console.log(`${TAG} 添付 画面表示 ${shown} 件 / 取得 ${shown - failed} 件${WITH_ATTACHMENTS ? '' : '（--no-attachments で未取得）'} → ${OUT}`);
    return failed ? 2 : 0;
  } finally {
    await ctx.close();
  }
}

process.exitCode = await main();
