#!/usr/bin/env node
/**
 * check-doc-lifecycle.mjs — ドキュメントのライフサイクル候補を決定論で surface する機械ガード。
 *
 * 役割（2 層の機械側）:
 *   機械（本スクリプト）= 「棚卸しすべき doc 候補」を鮮度・orphan・完了マーカーで列挙する。
 *   LLM（doc-curator + /doc-declutter）= その候補を読んで KEEP/TRIM/DELETE/CONSOLIDATE を判定・適用する（handoff は extract→削除が既定・2026-07-11 archive 廃止）。
 * 本スクリプトは**判定しない**（age や orphan は「古い＝不要」を意味しない）。あくまで人間/curator が
 * 見るべき候補を絞るだけ。**非ブロッキング**（常に exit 0）。
 *
 * 対象: docs/handoffs/*.md（active のみ・_archive は除外）。
 *
 * シグナル:
 *   - age: ファイル名 YYYY-MM-DD-*.md から経過日数を算出（>= --days で stale-age 候補）。
 *   - orphan: その handoff の basename を参照している active doc が 0 件（追跡されていない）。
 *   - tracked: .claude/todo/** から参照されている（＝意図的に追跡中＝削除は慎重に）。
 *   - refs: 本文が言及する PR(#NNN)・commit SHA（完了照合のヒント。親が gh/git で実体確認する）。
 *
 * 使い方:
 *   node scripts/check-doc-lifecycle.mjs            # 人間可読の候補一覧
 *   node scripts/check-doc-lifecycle.mjs --days 21  # stale-age 閾値を変更（既定 14）
 *   node scripts/check-doc-lifecycle.mjs --json      # 機械可読（/doc-declutter が消費）
 */

import { readdirSync, readFileSync, statSync, writeSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const JSON_OUT = argv.includes('--json');
const daysIdx = argv.indexOf('--days');
const STALE_DAYS = daysIdx !== -1 ? Number(argv[daysIdx + 1]) : 14;

const HANDOFF_DIR = join(ROOT, 'docs/handoffs');

// active doc コーパス（orphan / tracked 判定用）。_archive と handoff 自身は除外。
const CORPUS_ROOTS = ['docs', '.claude'];
const CORPUS_EXCLUDE = ['node_modules', '.git', 'out', '_archive'];

function walk(dir, acc) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.claude') continue;
    if (CORPUS_EXCLUDE.includes(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (extname(e.name) === '.md') acc.push(full);
  }
  return acc;
}

// コーパス（active .md 全文を 1 つに連結し、basename の出現で参照判定）。
const corpusFiles = [];
for (const r of CORPUS_ROOTS) walk(join(ROOT, r), corpusFiles);
const claudeMd = join(ROOT, 'CLAUDE.md');
try {
  statSync(claudeMd);
  corpusFiles.push(claudeMd);
} catch {}

// ファイルごとの全文をキャッシュ（参照元の特定に使う）。
const corpus = corpusFiles.map((f) => ({ path: f.replace(ROOT + '/', ''), text: readFileSync(f, 'utf8') }));

function referencedBy(slug, selfPath) {
  // slug（拡張子なし basename）を含む active doc を列挙（自分自身は除く）。
  return corpus.filter((c) => c.path !== selfPath && c.text.includes(slug)).map((c) => c.path);
}

function ageDays(fileName) {
  const m = fileName.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const fileDate = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  const now = new Date();
  return Math.floor((now - fileDate) / 86400000);
}

let handoffs;
try {
  handoffs = readdirSync(HANDOFF_DIR).filter((f) => extname(f) === '.md');
} catch {
  console.log('[check-doc-lifecycle] docs/handoffs/ が見つかりません。終了。');
  process.exit(0);
}

const results = [];
for (const f of handoffs) {
  const rel = `docs/handoffs/${f}`;
  const slug = basename(f, '.md');
  const text = readFileSync(join(HANDOFF_DIR, f), 'utf8');
  const refs = referencedBy(slug, rel);
  const trackedBy = refs.filter((p) => p.startsWith('.claude/todo/'));
  const prs = [...new Set((text.match(/#\d{2,5}\b/g) || []))];
  const commits = [...new Set((text.match(/\b[0-9a-f]{7,40}\b/g) || []))].filter((s) => /[a-f]/.test(s) && /\d/.test(s)).slice(0, 8);
  const age = ageDays(f);

  const flags = [];
  if (age !== null && age >= STALE_DAYS) flags.push(`stale-age(${age}d)`);
  if (refs.length === 0) flags.push('orphan');
  if (trackedBy.length > 0) flags.push('tracked-by-todo');

  results.push({ path: rel, age, flags, refs, trackedBy, prs, commits });
}

// 候補（flag が付いたもの）を優先表示。tracked-by-todo は「削除は慎重に」マーク。
const candidates = results.filter((r) => r.flags.some((x) => x.startsWith('stale-age') || x === 'orphan'));

if (JSON_OUT) {
  writeSync(1, JSON.stringify({ staleDays: STALE_DAYS, total: results.length, candidates }, null, 2) + '\n');
  process.exit(0);
}

console.log(`[check-doc-lifecycle] active handoff: ${results.length} 本 / 棚卸し候補(age>=${STALE_DAYS}d or orphan): ${candidates.length} 本`);
console.log('  （機械は候補を surface するだけ。KEEP/TRIM/DELETE の判定は /doc-declutter → doc-curator）\n');

if (candidates.length === 0) {
  console.log('  候補なし。');
  process.exit(0);
}

for (const r of candidates.sort((a, b) => (b.age ?? 0) - (a.age ?? 0))) {
  console.log(`  ● ${r.path}`);
  console.log(`      flags: ${r.flags.join(', ') || '-'}`);
  if (r.prs.length) console.log(`      言及PR: ${r.prs.join(' ')}（merged 状態は gh で実体確認）`);
  if (r.commits.length) console.log(`      言及commit: ${r.commits.join(' ')}（develop/main 取込は git で確認）`);
  console.log(`      参照元: ${r.refs.length ? r.refs.join(', ') : '（なし＝orphan）'}`);
  console.log('');
}

console.log('次の一手: `/doc-declutter` で候補を doc-curator に判定させ、承認の上で抽出→削除/trim/統廃合する（記録は git 履歴）。');
process.exit(0);
