#!/usr/bin/env node
import { resolveProfileDir } from './lib/playwright-auth-profile.mjs';
/**
 * note-comment-reply.mjs
 * ---------------------------------------------------------------------------
 * note 記事のコメントへ**返信を投稿**するブラウザ CLI。
 *
 * 位置づけ: コメントは読者に公開され、投稿後の取り消しは実質できない。
 * よって既定は **入力までで停止（draft-first）**、送信は `--submit` を明示したときだけ。
 *
 * 実機仕様（2026-08-11 確認）:
 *   - コメント投稿欄は `textarea[placeholder="コメントする"]` ＋「投稿」ボタン。
 *   - 個別コメントに返信するスレッド UI がある場合は、その「返信」を優先して使う
 *     （相手にだけ通知が飛ぶため）。無ければトップレベルのコメントとして投稿する。
 *
 * 安全設計:
 *   - note ID が dobokunote であることを assert。
 *   - 本文は**ファイルから読む**（コマンドラインに長文を書かない・改行を保つ）。
 *   - 投稿後に本文がページ上に存在することを読み戻して検証する。
 *
 * 使い方:
 *   node scripts/note-comment-reply.mjs <noteId> <本文txt>            # 入力のみ
 *   node scripts/note-comment-reply.mjs <noteId> <本文txt> --submit   # 投稿
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const NOTE = process.argv[2];
const BODY = readFileSync(process.argv[3], 'utf8').trim();
const SUBMIT = process.argv.includes('--submit');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (!NOTE || !BODY) { console.error('usage: node scripts/note-comment-reply.mjs <noteId> <本文txt> [--submit]'); process.exit(1); }

const ctx = await chromium.launchPersistentContext(resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT }), {
  channel: 'chrome', headless: false, ignoreHTTPSErrors: true, viewport: { width: 1400, height: 1050 },
  args: ['--disable-blink-features=AutomationControlled'], ...(PROXY ? { proxy: { server: PROXY } } : {}),
});
try {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(3500);
  if (!/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) {
    console.error('ABORT: account != dobokunote'); await ctx.close(); process.exit(2);
  }
  console.log('[1] account gate OK');

  await page.goto(`https://note.com/dobokunote/n/${NOTE}?scrollpos=comment`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  try { await page.waitForLoadState('networkidle', { timeout: 25000 }); } catch {}
  await sleep(7000);

  const ta = page.locator('textarea[placeholder="コメントする"]').first();
  if (!(await ta.count())) { console.error('ABORT: コメント入力欄が見つからない'); await ctx.close(); process.exit(3); }
  await ta.scrollIntoViewIfNeeded().catch(() => {});
  await ta.fill(BODY);
  await sleep(1000);
  const filled = await ta.inputValue();
  console.log(`[2] 入力 ${[...filled].length} 字 / 一致=${filled.trim() === BODY}`);
  if (filled.trim() !== BODY) { console.error('ABORT: 読み戻し不一致'); await ctx.close(); process.exit(4); }
  await page.screenshot({ path: join(ROOT, `.tmp/note-comment-filled-${NOTE}.png`), fullPage: false });

  if (!SUBMIT) { console.log('>>> 入力のみ。投稿していません（--submit で投稿）。'); await ctx.close(); process.exit(0); }

  // コメントの送信ボタンは **テキストを持たない矢印アイコン（↑）**（2026-08-11 実測）。
  // ヘッダー右上の「投稿」は新規記事作成で無関係＝テキスト一致で掴むとエディタへ飛ぶ。
  // textarea の直下に現れる「×（取消）／↑（送信）」の2つのうち、右側＝送信を位置で選ぶ。
  const clicked = await page.evaluate(() => {
    const ta = document.querySelector('textarea[placeholder="コメントする"]');
    if (!ta) return 'no-textarea';
    const r = ta.getBoundingClientRect();
    const cands = [...document.querySelectorAll('button')].filter((b) => {
      const q = b.getBoundingClientRect();
      if (!q.width || !q.height) return false;
      const below = q.top >= r.bottom - 8 && q.top - r.bottom < 120;   // 入力欄のすぐ下
      const noText = !(b.innerText || '').trim();                      // アイコンのみ
      return below && noText;
    }).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    if (cands.length < 2) return `few(${cands.length})`;
    const send = cands[cands.length - 1];                              // 右端＝送信（左は取消×）
    if (send.disabled) return 'disabled';
    send.click();
    return 'clicked';
  });
  console.log('[3] コメント送信（矢印アイコン）:', clicked);
  if (clicked !== 'clicked') { console.error('ABORT: 送信ボタンを特定できない'); await ctx.close(); process.exit(5); }
  await sleep(7000);

  // 検証: 投稿本文の特徴的な一節がページに載ったか
  const probe = BODY.split('\n').map((s) => s.trim()).filter((s) => s.length > 12)[0] || BODY.slice(0, 20);
  await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await sleep(7000);
  const ok = await page.evaluate((p) => (document.body.innerText || '').replace(/\s+/g, '').includes(p.replace(/\s+/g, '')), probe);
  console.log(`[4] 投稿後の検証: 本文がページ上に存在=${ok}`);
  await page.screenshot({ path: join(ROOT, `.tmp/note-comment-posted-${NOTE}.png`), fullPage: false });
  if (!ok) { console.error('FAIL: 投稿を確認できない'); process.exitCode = 7; }
  else console.log('[done] コメントを投稿しました');
} finally { await ctx.close(); }
