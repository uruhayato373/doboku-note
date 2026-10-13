#!/usr/bin/env node
/**
 * reference-book-status.mjs — 書籍ごとの網羅の状況を 1 行で出す（読むだけ）。
 *
 * 「教材は全部画像化・文字起こし済みか」に、Drive のページ画像を開かずに答えるための入口（2026-10-13）。
 * 原本のページ数と除外（excludedPdfPageRanges・理由つき）は参考文献の台帳 config/reference-sources.json、
 * ページ画像と文字起こしの状態は git の content/sources/books/<id>/book-manifest.json が正本。
 * Drive 側の book-manifest.json には除外の理由が載らないので、そちらだけを見て「理由が無い」と判断しない。
 * 実体（原本の bytes・PDF の実ページ数）との照合は npm run check-reference-book-pages（Drive がある端末）。
 *
 * 使い方:
 *   npm run reference-book-status                         # 全書籍
 *   npm run reference-book-status -- --grep コンクリート   # 題名・id で絞る
 *   npm run reference-book-status -- --source-id concrete-basics-5th --reasons
 *   npm run reference-book-status -- --json
 * exit: 0（読むだけ）/ 2 対象 0 件
 */
import fs from 'node:fs';
import path from 'node:path';
import { parseCliArgs } from './lib/cli-args.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { loadReferenceSources } from './lib/reference-sources.mjs';
import { bookCoverageSummary, summarizeExclusions, manifestRepoPath } from './lib/reference-book-bundle.mjs';

const args = parseCliArgs({ json: { type: 'boolean' }, reasons: { type: 'boolean' }, 'source-id': { type: 'string' }, grep: { type: 'string' } });
let books = loadReferenceSources().sources.filter((s) => s.bookBundle);
if (args.sourceId) books = books.filter((s) => s.id === args.sourceId);
if (args.grep) books = books.filter((s) => `${s.id} ${s.title ?? ''} ${s.bookBundle.directory}`.includes(args.grep));
if (books.length === 0) { console.error('[reference-book-status] 対象 0 件'); process.exit(2); }

const rows = books.map((s) => {
  const file = path.join(REPO_ROOT, manifestRepoPath(s));
  const manifest = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  const c = bookCoverageSummary(s, manifest);
  const issues = [];
  if (!manifest) issues.push('book-manifest が無い');
  else if (!c.manifestMatchesPlan) issues.push(`画像 ${c.imagedPages} ≠ 計画 ${c.plannedPages}`);
  if (c.ocr && c.ocr.pending + c.ocr.other > 0) issues.push(`文字起こし未完了 ${c.ocr.pending + c.ocr.other}`);
  return { id: s.id, title: s.title ?? s.bookBundle.directory.split('__')[1], ...c, exclusions: summarizeExclusions(c.excluded), issues };
});

if (args.json) { process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`); process.exit(0); }
const done = rows.filter((r) => r.issues.length === 0).length;
console.log(`[reference-book-status] 書籍 ${rows.length} 冊 / 画像化・文字起こしとも完了 ${done} 冊 / 要対応 ${rows.length - done} 冊`);
for (const r of rows) {
  const ocr = r.ocr ? `${r.ocr.complete}/${r.imagedPages}` : '—';
  const ex = r.excludedPdfPages ? `除外 ${r.excludedPdfPages}` : '除外 0';
  console.log(`  ${r.issues.length ? '△' : '✓'} ${r.id.padEnd(34)} 原本 ${String(r.pdfPages).padStart(4)} 頁 · ${ex.padEnd(7)} · 画像 ${String(r.imagedPages ?? '—').padStart(4)} · 文字起こし ${ocr}${r.issues.length ? `  ← ${r.issues.join('・')}` : ''}`);
  if (args.reasons || args.sourceId) for (const e of r.exclusions) console.log(`      除外 ${e.pages} 頁（分冊 ${e.files.join(',')}）: ${e.reason}`);
}
console.log('除外の理由は --reasons。正本は参考文献の台帳（reference-sources.json）の excludedPdfPageRanges（Drive の book-manifest には載らない）。');
