#!/usr/bin/env node
/**
 * coconala-send.mjs — ココナラのトークルームへ、運営者が確認した文と添付ファイルを通常メッセージで送る。
 * ---------------------------------------------------------------------------
 * なぜ要るか: 2026-11-28、診断の納品文と PDF を送るのにその場で Playwright を 5 回書き直した
 * （送信ボタンが getByRole で見つからない・添付の表示名が要素に分かれて切れる・案内の吹き出しが重なる）。
 * 途中で止まった回が送信済みか分からず、二重送信の恐れがあった。手順をここに固める。
 *
 * 送るのは運営者が文面を確認し、チャットで「送って」と言ったものだけ（coconala-operations.md・外部誘導の禁止）。
 * 正式な納品（チェック）はしない。通常メッセージだけ。
 *
 * 使い方:
 *   node scripts/coconala/coconala-send.mjs --talkroom <id> --message <本文.txt> [--attach <file>]...   # 確認だけ（既定・送らない）
 *   node scripts/coconala/coconala-send.mjs --talkroom <id> --message <本文.txt> --attach <file> --send
 * 確認すること（どれか外れたら送らない）:
 *   - ログインしたアカウント（assertAccount）
 *   - 同じ本文がまだトークルームに無い（本文の先頭 30 字で判定。あれば送信済みとして止める＝二重送信の防止）
 *   - 入力欄の文字が本文と一致し、添付が入力欄の箱に表示されている
 *   - 「正式な納品」にチェックが入っていない
 * 送信後: 入力欄が空になり、画面を読み直して本文がちょうど 1 回あることを確かめる。
 * exit: 0 = 送った（または確認だけで問題なし）/ 1 = 送る前の確認で外れた・送信後の確認で外れた / 2 = ログイン・アカウント
 * 罠: 送信ボタンは役割の名前では見つからない（文字で探す）。案内の吹き出しが重なるので閉じてから押す。
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseCliArgs } from '../lib/cli-args.mjs';
import { launchContext, waitForLogin, assertAccount, sleep } from '../lib/coconala-session.mjs';
import { attachmentShown, countFingerprint, messageFingerprint } from '../lib/coconala-send.mjs';

const args = parseCliArgs({
  talkroom: { type: 'string' },
  message: { type: 'string' },
  attach: { type: 'string', multiple: true },
  send: { type: 'boolean' },
});
if (!/^\d+$/.test(args.talkroom || '') || !args.message) { console.error('--talkroom <数字> と --message <本文のファイル> が要る'); process.exit(1); }
const TEXT = fs.readFileSync(args.message, 'utf8').trim();
const FILES = (args.attach || []).map((f) => path.resolve(f));
for (const f of FILES) if (!fs.existsSync(f)) { console.error(`添付が無い: ${f}`); process.exit(1); }
const FP = messageFingerprint(TEXT);
const URL = `https://coconala.com/talkrooms/${args.talkroom}`;
const TAG = '[coconala-send]';

const composerLeafTexts = (page) => page.evaluate(() => {
  const t = document.querySelector('textarea[placeholder="メッセージを入力"]');
  let box = t;
  while (box && !box.querySelector('input[type=file]')) box = box.parentElement;
  return box ? [...box.querySelectorAll('*')].filter((e) => e.children.length === 0).map((e) => e.textContent || '') : [];
});

const ctx = await launchContext({ headless: false });
let code = 0;
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  const lg = await waitForLogin(page, { tag: TAG });
  if (!lg.ok) { console.error('ABORT:', lg.reason); code = 2; throw new Error('login'); }
  const acc = await assertAccount(page, { tag: TAG });
  if (!acc.ok) { console.error('ABORT:', acc.reason); code = 2; throw new Error('account'); }
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(6000);

  const before = countFingerprint(await page.evaluate(() => document.body.innerText), FP);
  if (before > 0) { console.error(`${TAG} 同じ本文がすでにトークルームにある（${before} 件）→ 送信済みとみなして送らない`); code = 1; throw new Error('already'); }

  const ta = page.locator('textarea[placeholder="メッセージを入力"]');
  if (await ta.count() !== 1) { console.error(`${TAG} 入力欄が一意に見つからない`); code = 1; throw new Error('composer'); }
  if (FILES.length) {
    const idx = await page.evaluate(() => {
      const t = document.querySelector('textarea[placeholder="メッセージを入力"]');
      const ins = [...document.querySelectorAll('input[type=file]')];
      for (let el = t; el; el = el.parentElement) { const i = ins.findIndex((x) => el.contains(x)); if (i >= 0) return i; }
      return -1;
    });
    if (idx < 0) { console.error(`${TAG} 入力欄の箱に添付の欄が無い`); code = 1; throw new Error('file-input'); }
    await page.locator('input[type=file]').nth(idx).setInputFiles(FILES);
    await sleep(5000);
  }
  await ta.click(); await ta.fill(TEXT); await sleep(800);
  const leaf = await composerLeafTexts(page);
  const checks = {
    本文一致: (await ta.inputValue()).trim() === TEXT,
    添付表示: FILES.every((f) => attachmentShown(leaf, path.basename(f))),
    正式な納品のチェックなし: !(await page.locator('input[type=checkbox]').first().isChecked().catch(() => false)),
  };
  console.log(`${TAG} 送る前の確認:`, JSON.stringify(checks));
  if (!Object.values(checks).every(Boolean)) { console.error(`${TAG} 送る前の確認で外れた → 送らない`); code = 1; throw new Error('precheck'); }
  if (!args.send) { console.log(`${TAG} 確認だけ（--send で送る）。入力欄の文と添付は送らずに閉じる`); throw new Error('dry'); }

  // 案内の吹き出し（「正式な納品はこちらから行えます」など）が送信ボタンに重なるので消してから押す
  await page.keyboard.press('Escape').catch(() => {});
  await page.evaluate(() => { for (const el of document.querySelectorAll('[class*="tooltip"], [class*="Tooltip"], [class*="balloon"], [class*="Balloon"], [class*="popover"]')) el.remove(); });
  const btn = page.locator('button').filter({ hasText: /^\s*送信\s*$/ });
  if (await btn.count() !== 1) { console.error(`${TAG} 送信ボタンが ${await btn.count()} 個`); code = 1; throw new Error('button'); }
  await btn.click({ timeout: 15000 });
  let sent = false;
  for (let i = 0; i < 20 && !sent; i++) {
    await sleep(1500);
    sent = (await ta.inputValue().catch(() => '')).trim() === '' && countFingerprint(await page.evaluate(() => document.body.innerText), FP) >= 1;
  }
  await page.reload({ waitUntil: 'domcontentloaded' }); await sleep(6000);
  const after = countFingerprint(await page.evaluate(() => document.body.innerText), FP);
  console.log(`${TAG} 送信後: 入力欄が空=${sent} / 画面の本文 ${after} 件`);
  if (after !== 1) { console.error(`${TAG} 送信後の確認で外れた（本文 ${after} 件）→ トークルームを目で確かめる`); code = 1; }
  else console.log(`${TAG} 送った: ${URL}${FILES.length ? `（添付 ${FILES.map((f) => path.basename(f)).join('・')}）` : ''}`);
} catch (e) {
  if (!['login', 'account', 'already', 'composer', 'file-input', 'precheck', 'dry', 'button'].includes(e.message)) { console.error(`${TAG} 失敗: ${e.message.split('\n')[0]}`); code = 1; }
} finally {
  await ctx.close().catch(() => {});
}
process.exit(code);
