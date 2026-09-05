#!/usr/bin/env node
/**
 * note-reanchor-boundary.mjs
 * ---------------------------------------------------------------------------
 * 有料記事の「有料境界」だけを frontmatter の paidBoundary（H2 先頭一致）へ再設定する。
 * 本文・画像・PDF 添付には一切触れない（全文置換をしないので添付が消えず、画像も再アップロードしない）。
 *
 * 用途: note-article-price-sweep.mjs は「有料エリア設定」を開いてライン位置を再設定せずに保存するため、
 *   価格変更のたびに境界が先頭へ戻り無料プレビューが消える（2026-07-24 実証・全ロック化）。
 *   これまでの復旧手段は note-update-body --commit（全文置換）だったが、それは PDF 添付を消し、
 *   画像を再アップロードして 1 日 100 ファイル上限を消費する。境界だけ戻す本スクリプトで分離する。
 *
 * 使い方:
 *   node scripts/note-reanchor-boundary.mjs --article <article.md>            # dry-run（境界の解決結果だけ表示）
 *   node scripts/note-reanchor-boundary.mjs --article <article.md> --commit   # 再設定して更新
 *   node scripts/note-reanchor-boundary.mjs --list <paths.txt> --commit
 *   --boundary-h2 "<regex>"   frontmatter paidBoundary より優先する H2 パターン
 *
 * 検証: 更新後に公開 API の無料プレビュー本文が空でないこと（空＝全ロックのまま）を 1 記事ずつ確認する。
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveProfileDir } from './lib/playwright-auth-profile.mjs';
import { publishLive } from './lib/note-live-publish.mjs';
import { fetchNoteBody } from './lib/note-live-check.mjs';
import { listAttachedFiles } from './lib/note-attach.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROFILE = resolveProfileDir('note', { cwd: ROOT, repoRoot: ROOT });
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const DEFAULT_BOUNDARY = '試験問題|予想問題';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const argv = process.argv.slice(2);
const getArg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const ARTICLE_ARG = getArg('--article');
const LIST_ARG = getArg('--list');
const BOUNDARY_ARG = getArg('--boundary-h2');
const COMMIT = argv.includes('--commit');
if ((!ARTICLE_ARG && !LIST_ARG) || (ARTICLE_ARG && LIST_ARG)) {
  console.error('--article <path> または --list <file> のどちらか一方を指定してください。');
  process.exit(1);
}
mkdirSync(join(ROOT, '.tmp'), { recursive: true });

function fmField(fm, key) {
  return (fm.match(new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|(.+?))\\s*$`, 'm')) || []).slice(1).find((v) => v) || '';
}

function parseArticle(p) {
  const abs = resolve(ROOT, p);
  if (!existsSync(abs)) throw new Error(`記事が見つかりません: ${abs}`);
  const raw = readFileSync(abs, 'utf8').replace(/^﻿/, '');
  const fm = (raw.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1];
  if (!fm) throw new Error('frontmatter がありません');
  const noteId = fmField(fm, 'noteId') || (fmField(fm, 'noteUrl').match(/\/n\/(n[0-9a-z]+)/i) || [])[1] || '';
  if (!/^n[0-9a-z]{6,}$/i.test(noteId)) throw new Error(`noteId が取れません: ${p}`);
  const pricing = fmField(fm, 'notePricing');
  if (pricing !== 'paid') throw new Error(`有料記事ではありません（notePricing=${pricing || '(空)'}）: ${p}`);
  const boundary = BOUNDARY_ARG || fmField(fm, 'paidBoundary') || DEFAULT_BOUNDARY;
  new RegExp(boundary); // 不正な正規表現は例外で止める
  const body = raw.slice(raw.indexOf('---', 3) + 3);
  const h2s = body.split(/\r?\n/).filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  const anchor = h2s.find((h) => new RegExp('^(?:' + boundary + ')').test(h));
  return { abs, rel: relative(ROOT, abs).replaceAll('\\', '/'), noteId, boundary, anchor, h2s: h2s.length };
}

async function accountGate(page) {
  await page.goto('https://note.com/settings/account', { waitUntil: 'domcontentloaded', timeout: 60000 });
  for (let i = 0; i < 10; i++) {
    await sleep(2000);
    if (/dobokunote/.test(await page.evaluate(() => document.body.innerText || ''))) { console.log('[1] account gate OK (dobokunote)'); return true; }
  }
  return false;
}

async function main() {
  const paths = LIST_ARG
    ? readFileSync(resolve(ROOT, LIST_ARG), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    : [ARTICLE_ARG];
  const articles = [];
  for (const p of paths) {
    try { articles.push(parseArticle(p)); } catch (e) { console.error(`[SKIP] ${p}: ${e.message}`); }
  }
  console.log(`=== note-reanchor-boundary: ${articles.length} 件 / mode=${COMMIT ? 'COMMIT' : 'DRY-RUN'} ===`);
  for (const a of articles) {
    console.log(`  ${a.noteId}  boundary=/${a.boundary}/  anchorH2=${a.anchor ? `"${a.anchor}"` : '(源泉に一致 H2 なし)'}  h2=${a.h2s}`);
  }
  const noAnchor = articles.filter((a) => !a.anchor);
  if (noAnchor.length) {
    console.error(`\n[ABORT] 源泉に境界 H2 が見つからない記事 ${noAnchor.length} 件。paidBoundary を直してから再実行`);
    process.exit(2);
  }
  if (!COMMIT) { console.log('\nDRY-RUN のみ（--commit で再設定）'); return; }

  const context = await chromium.launchPersistentContext(PROFILE, {
    headless: false, channel: 'chrome', proxy: PROXY ? { server: PROXY } : undefined,
    ignoreHTTPSErrors: true, viewport: { width: 1366, height: 1000 }, args: ['--disable-blink-features=AutomationControlled'],
  });
  let ok = 0, fail = 0;
  try {
    const page = await context.newPage();
    if (!(await accountGate(page))) throw new Error('account gate NG（dobokunote でログインしていない）');
    for (const a of articles) {
      console.log(`\n[article] ${a.noteId} — ${a.rel}`);
      try {
        await page.goto(`https://editor.note.com/notes/${a.noteId}/edit/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('[contenteditable=true]', { timeout: 30000 });
        await sleep(4000);
        // PDF 添付ゲート: 本文は触らないが、保存前後で添付数が減っていないことを機械で確認する
        const attachedBefore = await listAttachedFiles(page);
        const live = await publishLive(page, a.noteId, a.boundary, true, { screenshotPrefix: 'reanchor' });
        if (!live) { console.error(`[FAIL] ${a.noteId} 境界の再設定に失敗`); fail++; continue; }
        // 「更新する」後はエディタを離れて記事ページへ遷移するため、その DOM で数えると常に 0 になる。
        // エディタを開き直してから数える（保存済みの実体を見る）。
        await page.goto(`https://editor.note.com/notes/${a.noteId}/edit/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('[contenteditable=true]', { timeout: 30000 });
        await sleep(4000);
        const attachedAfter = await listAttachedFiles(page);
        if (attachedAfter.length < attachedBefore.length) {
          console.error(`[FAIL] ${a.noteId} 添付が減少 ${attachedBefore.length}→${attachedAfter.length}（保存後）→ 要手動確認`); fail++; continue;
        }
        if (attachedBefore.length) console.log(`[attach] ${attachedBefore.length} 件維持`);
        await sleep(3000);
        const chk = await fetchNoteBody(a.noteId);
        const previewLen = chk?.body ? chk.body.replace(/<[^>]+>/g, '').length : 0;
        if (chk?.error) console.log(`[verify] WARN: API 取得失敗（${chk.error}）→ 手動確認`);
        else if (previewLen < 50) { console.error(`[FAIL] ${a.noteId} 無料プレビューが ${previewLen} 字＝全ロックのまま`); fail++; continue; }
        else console.log(`[verify] 無料プレビュー ${previewLen} 字 OK`);
        console.log(`[OK] ${a.noteId} 境界を "${a.anchor}" へ再設定`);
        ok++;
      } catch (e) {
        console.error(`[FAIL] ${a.noteId} ${e.message}`); fail++;
      }
    }
  } finally {
    await context.close();
  }
  console.log(`\n[done] ok=${ok} fail=${fail} / ${articles.length}`);
  process.exitCode = fail ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exit(1); });
