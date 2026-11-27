#!/usr/bin/env node
// note 記事のコメントへスレッド返信を投稿する。node scripts/note/note-comment-reply.mjs <noteId> <本文txt> --comment <コメントID か通知URL> [--submit]。既定は入力までで停止（draft-first）、送信は --submit のときだけ。
// 罠: 投稿は読者に公開され取り消せない。返信は対象コメントの吹き出し→「@相手さんに返信」の下の欄から入れる（トップレベルの欄に入れても返信にならない・2026-11-27）。成否は「返信N件」の増加と本文の一致で決め、再送は件数を読み直して増えていないときだけ。コメントには 1 時間あたりの上限がある。
import { resolveProfileDir } from '../lib/playwright-auth-profile.mjs';
/**
 * note-comment-reply.mjs
 * ---------------------------------------------------------------------------
 * note 記事のコメントへ**スレッド返信を投稿**するブラウザ CLI（DN-1308）。
 *
 * 位置づけ: コメントは読者に公開され、投稿後の取り消しは実質できない。
 * よって既定は **入力までで停止（draft-first）**、送信は `--submit` を明示したときだけ。
 * 入力だけのときは取消（×）で返信欄を閉じてから終わる。
 *
 * 実機仕様（2026-11-27 確認・判定の詳細は scripts/lib/note-comment-thread.mjs）:
 *   - 対象コメントは `li#note-comment-<コメントID>`。コメント ID は通知 URL の `c=` の値。
 *   - その li の吹き出しアイコン → li の中に開く `form[data-testid=comment-form]` の textarea → button[type=submit]（↑）。
 *   - 返信は相手にだけ通知が届く。トップレベルの「コメントする」欄はこのスクリプトでは使わない。
 *
 * 安全設計:
 *   - note ID が dobokunote であることを assert。
 *   - 本文は**ファイルから読む**（コマンドラインに長文を書かない・改行を保つ）。
 *   - 送信前に同じ本文が既にスレッドに在れば中断（二重投稿の防止）。
 *   - 送信後は「返信N件」の増加と本文の一致で検証。送信が無反応でも、再読込して件数が増えていないときだけ 1 回再送する。
 *
 * 使い方:
 *   node scripts/note/note-comment-reply.mjs <noteId> <本文txt> --comment nc4cd5cc7e131c            # 入力のみ
 *   node scripts/note/note-comment-reply.mjs <noteId> <本文txt> --comment nc4cd5cc7e131c --submit   # 投稿
 *   （--comment には通知の URL（…?c=nc…）をそのまま渡してもよい）
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { leanContextOptions } from '../lib/playwright-launch.mjs';
import { NOTE_BASE } from '../lib/site-identity.mjs';
import { REPO_ROOT as ROOT } from '../lib/repository-paths.mjs';
import { sleep } from '../lib/sleep.mjs';
import { parseCliArgs } from '../lib/cli-args.mjs';
import { parseCommentId, parseReplyCount, bodyIncluded, replyVerdict, mayResend } from '../lib/note-comment-thread.mjs';

const USAGE = 'usage: node scripts/note/note-comment-reply.mjs <noteId> <本文txt> --comment <コメントID|通知URL> [--submit]';
const args = parseCliArgs({ comment: { type: 'string' }, submit: { type: 'boolean' } });
const [NOTE, BODY_FILE] = args._;
const COMMENT = parseCommentId(args.comment);
const SUBMIT = args.submit;
if (!NOTE || !BODY_FILE) { console.error(USAGE); process.exit(1); }
if (!COMMENT) { console.error(`ABORT: --comment にコメント ID（nc…）か通知 URL（…?c=nc…）が要る（受け取った値: ${args.comment ?? 'なし'}）\n${USAGE}`); process.exit(1); }
const BODY = readFileSync(BODY_FILE, 'utf8').trim();
if (!BODY) { console.error('ABORT: 本文が空'); process.exit(1); }

const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const LI = `#note-comment-${COMMENT}`;
const TA = `${LI} form[data-testid="comment-form"] textarea[placeholder="コメントする"]`;
mkdirSync(join(ROOT, '.tmp'), { recursive: true });

/** スレッドを開き「もっとみる」を全部開いてから、li の文と返信件数を読む。 */
async function readThread(page) {
  const opener = page.locator(`${LI} button[aria-label$="を開く"]`);
  if (await opener.count()) { await opener.first().click().catch(() => {}); await sleep(2000); }
  // 「もっとみる」は 1 件に 2 つあり片方は非表示（locator.click は表示を待って止まる・2026-11-27 実測）。表示中のものだけ DOM で押す。
  await page.evaluate((sel) => {
    for (const b of document.querySelectorAll(`${sel} button`)) {
      if ((b.innerText || '').trim() === 'もっとみる' && b.offsetParent !== null) b.click();
    }
  }, LI);
  await sleep(1000);
  const text = await page.locator(LI).innerText();
  return { text, count: parseReplyCount(text) };
}

/** 対象コメントの吹き出しアイコンを押して返信欄を開く。li の先頭（＝相手のコメント）の吹き出しを使う。 */
async function openReplyBox(page) {
  if (await page.locator(TA).count()) return true;
  const idx = await page.evaluate((sel) => {
    const btns = [...document.querySelectorAll(`${sel} button[data-id="ButtonIcon"]`)];
    return btns.findIndex((b) => !b.hasAttribute('aria-pressed') && !b.hasAttribute('aria-haspopup') && !b.closest('form'));
  }, LI);
  if (idx < 0) return false;
  await page.locator(`${LI} button[data-id="ButtonIcon"]`).nth(idx).click();
  await sleep(2500);
  return (await page.locator(TA).count()) > 0;
}

async function loadArticle(page) {
  await page.goto(`${NOTE_BASE}/n/${NOTE}?scrollpos=comment`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  try { await page.waitForLoadState('networkidle', { timeout: 25000 }); } catch {}
  await sleep(6000);
  const li = page.locator(LI);
  if (!(await li.count())) return false;
  await li.scrollIntoViewIfNeeded().catch(() => {});
  return true;
}

async function fillReply(page) {
  if (!(await openReplyBox(page))) return 'no-reply-box';
  const ta = page.locator(TA).first();
  await ta.fill(BODY);
  await sleep(1000);
  const filled = (await ta.inputValue()).trim();
  console.log(`[3] 返信欄に入力 ${[...filled].length} 字 / 一致=${filled === BODY}`);
  return filled === BODY ? 'ok' : 'mismatch';
}

async function cancelReply(page) {
  const cancel = page.locator(`${LI} form[data-testid="comment-form"] button[type="button"]`);
  if (await cancel.count()) { await cancel.first().click().catch(() => {}); await sleep(1000); }
  const stillOpen = await page.locator(TA).count();
  if (stillOpen) await page.locator(TA).first().fill('').catch(() => {});
  console.log(`[x] 返信欄を閉じた（残っている欄=${stillOpen ? 'あり→空にした' : 'なし'}）`);
}

const ctx = await chromium.launchPersistentContext(resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT }), leanContextOptions({
  channel: 'chrome', headless: false, ignoreHTTPSErrors: true, viewport: { width: 1400, height: 1050 },
  args: ['--disable-blink-features=AutomationControlled'], ...(PROXY ? { proxy: { server: PROXY } } : {}),
}));
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3500);
  if (!/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) {
    console.error('ABORT: account != dobokunote'); process.exitCode = 2;
  } else {
    console.log('[1] account gate OK');
    await run(page);
  }
} finally { await ctx.close(); }

async function run(page) {
  if (!(await loadArticle(page))) { console.error(`ABORT: 記事 ${NOTE} に コメント ${COMMENT} が見つからない`); process.exitCode = 3; return; }
  const before = await readThread(page);
  console.log(`[2] 対象コメント ${COMMENT}: 返信 ${before.count} 件`);
  if (bodyIncluded(before.text, BODY)) { console.error('ABORT: 同じ本文の返信が既にスレッドに在る（二重投稿を防ぐ）'); process.exitCode = 6; return; }

  const fill = await fillReply(page);
  if (fill !== 'ok') { console.error(`ABORT: 返信欄に入れられない（${fill}）`); await cancelReply(page); process.exitCode = 4; return; }
  await page.screenshot({ path: join(ROOT, `.tmp/note-comment-filled-${NOTE}-${COMMENT}.png`), fullPage: false });

  if (!SUBMIT) {
    await cancelReply(page);
    console.log('>>> 入力のみ。投稿していません（--submit で投稿）。');
    return;
  }

  for (let attempt = 1; ; attempt++) {
    const send = page.locator(`${LI} form[data-testid="comment-form"] button[type="submit"]`);
    if (!(await send.count()) || (await send.first().isDisabled())) { console.error('ABORT: 送信ボタンが無いか押せない'); process.exitCode = 5; return; }
    await send.first().click();
    console.log(`[4] 送信（${attempt} 回目）`);
    await sleep(7000);
    if (!(await loadArticle(page))) { console.error('FAIL: 再読込でコメントが見つからない。再送はしない'); process.exitCode = 7; return; }
    const after = await readThread(page);
    const bodyFound = bodyIncluded(after.text, BODY);
    const verdict = replyVerdict({ before: before.count, after: after.count, bodyFound });
    console.log(`[5] 検証: 返信 ${before.count}→${after.count} 件 / 本文の一致=${bodyFound} → ${verdict}`);
    await page.screenshot({ path: join(ROOT, `.tmp/note-comment-posted-${NOTE}-${COMMENT}.png`), fullPage: false });
    if (verdict === 'posted') { console.log('[done] スレッドに返信を投稿しました'); return; }
    if (!mayResend({ verdict, before: before.count, current: after.count, attempts: attempt })) {
      console.error(`FAIL: 投稿を確かめられない（${verdict}）。再送はしない。記事のコメント欄を目で確かめること`);
      process.exitCode = 7; return;
    }
    console.log('[6] 返信件数が増えていない → 返信欄を開き直して 1 回だけ再送');
    const refill = await fillReply(page);
    if (refill !== 'ok') { console.error(`FAIL: 再送の入力ができない（${refill}）`); await cancelReply(page); process.exitCode = 7; return; }
  }
}
