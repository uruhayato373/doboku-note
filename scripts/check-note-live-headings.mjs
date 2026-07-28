#!/usr/bin/env node
/**
 * check-note-live-headings.mjs — note 公開記事の live 本文整合性 横断検査（3検査）
 *
 * SoT（docs/note/⋆⋆/article.md frontmatter noteStatus=published）の全記事について
 * note public API で live 本文を取得し、次の破損を検出する:
 *   (1) URL 見出し   — <h1-6> 内に URL（cardify グリッチ・目次に URL 露出。2026-07-14 発覚）
 *   (2) 空引用       — 中身空の <blockquote>（複数行 blockquote が paste 脱落した痕跡）
 *   (3) 画像欠落     — live <img> 数 < SoT 期待枚数（本文画像が除去されて載らない。2026-07-15 発覚）
 *
 * SoT 期待画像数 = 本文の `![](...)` 行数（frontmatter/コメント除く）。有料記事は API 本文が
 * paywall で切断されるため「有料境界より前の画像のみ」を期待値とし、境界が SoT に無い有料は
 * 画像検査を skip（PARTIAL 表示）。
 *
 * 使い方:
 *   npm run check-note-live-headings              # 全 published を検査（並列8・約1分）
 *   node scripts/check-note-live-headings.mjs 共通 # パス部分一致で絞り込み
 *   node scripts/check-note-live-headings.mjs --paths  # BAD の article.md パスのみ出力（修復list生成用）
 *
 * 終了コード: BAD 1件以上 → exit 1。FETCH_ERR は WARN 扱い（ネットワーク偽陰性と区別）。
 * 真実源: .claude/knowledge/reference/note-api-verification.md「live 本文整合性検査」
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchNoteBody, findUrlHeadings, countEmptyBlockquotes, countImgs } from './lib/note-live-check.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawArgs = process.argv.slice(2);
const PATHS_ONLY = rawArgs.includes('--paths');
const FILTER = rawArgs.find((a) => !a.startsWith('--')) || '';
const CONCURRENCY = 8;

function walk(dir, acc) {
  for (const c of readdirSync(dir)) {
    const p = join(dir, c);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (c === 'article.md') acc.push(p);
  }
  return acc;
}

// SoT から期待画像数を導出（有料は境界より前のみ）。境界不明の有料は null（画像検査 skip）。
function expectedImagesOf(raw) {
  const fm = raw.startsWith('---') ? raw.split('---')[1] || '' : '';
  const isPaid = /notePricing:\s*"?paid"?/.test(fm);
  const boundary = (fm.match(/paidBoundary:\s*"?(.+?)"?\s*$/m) || [])[1] || '試験問題|予想問題';
  let body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/, '').replace(/<!--[\s\S]*?-->\r?\n?/g, '');
  const lines = body.split('\n');
  const isImg = (l) => /^\s*!\[[^\]]*\]\([^)]+\)\s*$/.test(l) && !/^\s*!\[[^\]]*\]\(https?:/.test(l);
  if (!isPaid) return lines.filter(isImg).length;
  const bre = new RegExp('^##\\s+(' + boundary + ')');
  const bIdx = lines.findIndex((l) => bre.test(l.trim()));
  if (bIdx < 0) return null; // 境界不明の有料＝機械検証不能（PARTIAL）
  return lines.slice(0, bIdx).filter(isImg).length;
}

const targets = [];
for (const f of walk(join(ROOT, 'docs/note'), [])) {
  if (FILTER && !f.includes(FILTER)) continue;
  const raw = readFileSync(f, 'utf8');
  if (!raw.startsWith('---')) continue;
  const fm = raw.split('---')[1] || '';
  if (!/noteStatus:\s*"?published"?/.test(fm)) continue;
  const m = fm.match(/noteId:\s*"?(n[0-9a-f]{12})"?/);
  if (m) targets.push({ noteId: m[1], path: f.slice(ROOT.length + 1), expectedImgs: expectedImagesOf(raw) });
}
if (!PATHS_ONLY) console.log(`[check-note-live-headings] published ${targets.length} 件を検査`);

async function check({ noteId, path, expectedImgs }) {
  const { body, error } = await fetchNoteBody(noteId, { retries: 2, delayMs: 2000 });
  if (error) return { noteId, path, status: 'FETCH_ERR', labels: [], err: error.slice(0, 50) };
  const urlH = findUrlHeadings(body);
  const emptyBq = countEmptyBlockquotes(body);
  const imgLive = countImgs(body);
  const labels = [];
  if (urlH.length) labels.push(`[URL見出し ${urlH.length}]`);
  if (emptyBq) labels.push(`[空引用 ${emptyBq}]`);
  const partial = expectedImgs == null;
  if (!partial && imgLive < expectedImgs) labels.push(`[画像欠落 live=${imgLive}/sot=${expectedImgs}]`);
  return { noteId, path, status: labels.length ? 'BAD' : (partial && expectedImgs !== 0 ? 'PARTIAL' : 'OK'), labels, urlH };
}

const results = [];
for (let i = 0; i < targets.length; i += CONCURRENCY) {
  results.push(...(await Promise.all(targets.slice(i, i + CONCURRENCY).map(check))));
}

const bad = results.filter((r) => r.status === 'BAD');
const errs = results.filter((r) => r.status === 'FETCH_ERR');
const partials = results.filter((r) => r.status === 'PARTIAL');

if (PATHS_ONLY) {
  for (const r of bad) console.log(r.path);
  process.exit(bad.length ? 1 : 0);
}

for (const r of bad) {
  console.error(`  BAD ${r.noteId} ${r.path} ${r.labels.join(' ')}`);
  if (r.urlH.length) console.error(`      ${r.urlH.join('\n      ')}`);
}
if (partials.length) console.log(`  PARTIAL: 有料で境界不明のため画像検査skip ${partials.length} 件（paywall で機械検証不能）`);
if (errs.length) console.log(`  WARN: FETCH_ERR ${errs.length} 件（ネットワーク未達・再実行かプロキシ外で確認）: ${errs.slice(0, 3).map((r) => r.noteId).join(', ')}${errs.length > 3 ? '…' : ''}`);

if (bad.length) {
  console.error(`[check-note-live-headings] ✗ live 本文に不整合 ${bad.length} 件（URL見出し/空引用/画像欠落）。修復: node scripts/note-update-body.mjs --article <path> --commit`);
  process.exit(1);
}

// 検査不成立を PASS にしない: 取得できていないなら「不整合なし」ではなく「検査できていない」。
// （2026-07-28 まで、全件 FETCH_ERR でも「✓ 0 件検査・不整合なし」と出て緑になっていた）
const failRate = targets.length ? errs.length / targets.length : 0;
if (targets.length > 0 && failRate > 0.2) {
  console.error(`\n[check-note-live-headings] ✗ 検査不成立: ${targets.length}本中${errs.length}本が取得失敗（${Math.round(failRate * 100)}%）`);
  console.error('  live を取得できていないため「不整合なし」は成立しない。curl が使えるか・プロキシ env・レート制限を確認する。');
  process.exit(1);
}
console.log(`[check-note-live-headings] ✓ ${results.length - errs.length} 件検査・不整合なし${partials.length ? `（PARTIAL ${partials.length}）` : ''}${errs.length ? `（未達 ${errs.length} 件は要再実行）` : ''}`);
