/**
 * coconala-dm.mjs — DM（ダイレクトメッセージ）1件のスレッドと添付ファイルを手元に取得する
 * ---------------------------------------------------------------------------
 * なぜ必要か:
 *   coconala-orders.mjs は個人情報を持ち帰らない設計で、DM は ID・日付・未読だけを取り、本文は取らない。
 *   しかし取引後の DM（追加の添削・質問）に答えるには本文を読む必要がある。2026-09-28 に
 *   DM 10227804 を読むため一時スクリプトを3回書き直した（古いメッセージは「過去のメッセージを
 *   読み込む」を押さないと出ない・Playwright の click は重なりでタイムアウトするので DOM から押す・
 *   一覧の項目は <a> ではない）。その手順をここに固定する。
 *
 * 個人情報の扱い:
 *   出力は .tmp/coconala/dm/{id}/ だけ（.gitignore 済み・リポジトリに入らない）。orders-log には何も書かない。
 *
 * 操作の範囲:
 *   送信・見積り提案・クリックによる状態変更はしない（押すのは「過去のメッセージを読み込む」だけ）。
 *   ※ DM を開くとココナラ上で既読になる（人が未読で気づく経路は減る）。
 *   DM の ID は coconala-orders の orders-snapshot.json（inquiries[].dmId）で分かる。
 *
 * 出力:
 *   thread.txt          DM 画面のテキスト（全メッセージを展開した状態）
 *   messages.json       メッセージ単位（from / at / mine / body）と件数
 *   attachments/<name>  添付ファイル（docx は <name>.txt に本文も書き出す）
 *   manifest.json       取得日時・件数・添付ごとの bytes / sha256
 *
 * 使い方:
 *   node scripts/coconala-dm.mjs <dmId> [--out <dir>] [--no-attachments] [--headless]
 *   添付は .uploaded_files のリンクを同じログイン状態で直接取得する（トークルームのホバーボタン方式とは別）
 * exit: 0=取得完了 / 2=検査不成立（ログイン不可・DM を開けない・メッセージ 0 件・
 *       過去分を展開しきれない・添付の一部が取れない）
 * ---------------------------------------------------------------------------
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { launchContext, waitForLogin, assertAccount, readAccount, sleep, ROOT } from './lib/coconala-session.mjs';
import { docxToText } from './lib/docx-text.mjs';
import { parseDmThread } from './lib/coconala-dm-parse.mjs';

const TAG = '[coconala-dm]';
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const id = argv.find((a, i) => /^\d+$/.test(a) && argv[i - 1] !== '--out');
const HEADLESS = argv.includes('--headless');
const WITH_ATTACHMENTS = !argv.includes('--no-attachments');
const OUT = opt('--out') || join(ROOT, '.tmp/coconala/dm', String(id));
const MAX_EXPAND = 20;

const safeName = (s) => basename(String(s)).replace(/[\\/:*?"<>|]/g, '_').trim() || 'file';

// 「過去のメッセージを読み込む」を DOM から押す（Playwright の click は重なり判定でタイムアウトする）。
// 全件を読み込んだ後も要素は残るので、押した結果メッセージ（日時の行）が増えたかで終わりを判断する。
const clickLoadMore = (page) => page.evaluate(() => {
  const el = [...document.querySelectorAll('a,button,span,div,p')]
    .find((e) => e.children.length === 0 && /過去のメッセージを読み込む/.test(e.textContent));
  if (!el) return false;
  el.click();
  return true;
});
const countStamps = (page) => page.evaluate(() =>
  ((document.querySelector('main')?.innerText || document.body.innerText).match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/gm) || []).length);

async function main() {
  if (!id) {
    console.error(`${TAG} 使い方: node scripts/coconala-dm.mjs <dmId> [--out <dir>] [--no-attachments] [--headless]`);
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

    await page.goto(`https://coconala.com/mypage/direct_message/${id}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
    await sleep(3000);
    if (!/\/direct_message\/\d+/.test(page.url())) { console.error(`${TAG} DM を開けない: ${page.url()}`); return 2; }

    let expanded = 0;
    let stamps = await countStamps(page);
    for (let k = 0; k < MAX_EXPAND; k++) {
      if (!(await clickLoadMore(page))) break;
      await sleep(3000);
      const now = await countStamps(page);
      if (now <= stamps) break; // 増えなければ全件読み込み済み
      stamps = now;
      expanded++;
    }
    if (expanded === MAX_EXPAND) {
      console.error(`${TAG} 過去のメッセージを ${MAX_EXPAND} 回読み込んでもまだ増え続けている（取りこぼしの可能性）`);
      return 2;
    }

    const text = await page.evaluate(() => document.querySelector('main')?.innerText || document.body.innerText);
    writeFileSync(join(OUT, 'thread.txt'), text, 'utf8');
    const { messages, composerFound } = parseDmThread(text, { self: readAccount().sellerName || 'dobokunote' });
    writeFileSync(join(OUT, 'messages.json'), JSON.stringify({ dmId: String(id), count: messages.length, messages }, null, 2) + '\n', 'utf8');
    console.log(`${TAG} メッセージ ${messages.length} 件（過去分の展開 ${expanded} 回）→ ${join(OUT, 'messages.json')}`);
    if (!messages.length || !composerFound) {
      console.error(`${TAG} メッセージを分けられない（${messages.length} 件・入力欄 ${composerFound ? 'あり' : 'なし'}）。画面の形が変わった可能性。thread.txt を確認する`);
      return 2;
    }
    const last = messages[messages.length - 1];
    console.log(`${TAG} 最新: ${last.at} ${last.mine ? '自分' : '相手'}（${last.body.length} 字）`);

    // DM の添付はトークルームと違い、.uploaded_files 内の通常リンク（/uploaded_files/view/{id}）
    const links = await page.$$eval('.uploaded_files a[href*="/uploaded_files/view/"]',
      (as) => as.map((a) => ({ href: a.href, label: a.textContent.trim() })));
    const shown = links.length;
    const attachments = [];
    let failed = 0;
    if (WITH_ATTACHMENTS) {
      for (const [i, { href, label }] of links.entries()) {
        try {
          const res = await ctx.request.get(href, { timeout: 120000 });
          if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
          const type = res.headers()['content-type'] || '';
          if (/text\/html/i.test(type)) throw new Error(`ファイルでなく HTML が返った（${type}）`);
          const bytes = await res.body();
          const name = safeName(label || `attachment-${i + 1}`);
          const path = join(OUT, 'attachments', name);
          writeFileSync(path, bytes);
          const entry = { name, href, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), path, textPath: null };
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
          attachments.push({ name: label || `attachment-${i + 1}`, href, error: e.message.split('\n')[0] });
          console.log(`${TAG} ✗ 添付を取得できない: ${label || i + 1}（${e.message.split('\n')[0]}）`);
        }
      }
    }

    writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({
      dmId: String(id),
      fetchedAt: new Date().toISOString(),
      messages: messages.length,
      expandedTimes: expanded,
      attachmentsShown: shown,
      attachmentsSaved: attachments.filter((a) => !a.error).length,
      attachments,
    }, null, 2) + '\n', 'utf8');

    console.log(`${TAG} 添付 画面表示 ${shown} 件 / 取得 ${WITH_ATTACHMENTS ? shown - failed : 0} 件${WITH_ATTACHMENTS ? '' : '（--no-attachments で未取得）'} → ${OUT}`);
    return failed ? 2 : 0;
  } finally {
    await ctx.close();
  }
}

process.exitCode = await main();
