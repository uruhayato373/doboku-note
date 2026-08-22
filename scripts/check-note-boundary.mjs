#!/usr/bin/env node
// note 有料記事の「有料境界（paidBoundary）」事前ゲート。network 不要・creds 不要。
//
// ルール（真実源: .claude/knowledge/reference/note-api-verification.md「有料境界（paidBoundary）のマガジン別 SSOT」）:
//   notePricing: paid かつ published（noteUrl/noteId あり）の記事は、有料境界が一意に解決できること。
//   境界解決順（note-publish/note-update-body/check-note-structure と統一）:
//     frontmatter `paidBoundary` があり、そのH2が本文に prefix 一致で実在する
//     または 既定 `試験問題|予想問題` H2 が本文に実在する。
//   どちらも満たさなければ赤落ち（＝公開時に境界が定まらず全ロック/漏洩の温床になる RULE_GAP）。
//
// 背景: 2026-07-24 に全 paid published の paidBoundary を手動で 0化したが、機械ゲートが無いと
//   新規 paid 記事で境界欠落が再発する。check-note-structure（ライブ事後監査）とは直交で、
//   こちらは「境界定義そのもの」をソースだけで事前検査する（pre-commit / CI 全量）。
//
// 使い方:
//   node scripts/check-note-boundary.mjs            # published paid 全件（CI 用・exit 1）
//   node scripts/check-note-boundary.mjs --staged   # git staged の article*.md のみ（pre-commit 用）
//   node scripts/check-note-boundary.mjs --all      # 全件を一覧（集計のみ・exit 0）
// 境界未解決が 1 件でもあれば exit 1（--all は集計のみで exit 0）。

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = 'content/note';
const DEFAULT_BOUNDARY = '試験問題|予想問題';
const STAGED = process.argv.includes('--staged');
const ALL = process.argv.includes('--all');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/^article(-[^/]+)?\.md$/.test(e)) out.push(p.split('\\').join('/'));
  }
  return out;
}
const fm = (raw, k) => { const m = raw.match(new RegExp('^' + k + ':[ \\t]*(.*)$', 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : null; };
const stripFm = (raw) => raw.replace(/^---[\s\S]*?---\r?\n/, '');

// 境界H2が本文に prefix 一致で実在するか（check-note-structure.mjs の boundaryIndex と同ロジック）。
function boundaryExists(body, boundary) {
  const alts = boundary.split('|').map((s) => s.trim()).filter(Boolean);
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^##\s+(.+)$/);
    if (m && alts.some((a) => m[1].trim().startsWith(a))) return true;
  }
  return false;
}

let files;
if (STAGED) {
  let staged = [];
  try {
    staged = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch { staged = []; }
  files = staged.filter((f) => f.startsWith(`${ROOT}/`) && /(^|\/)article(-[^/]+)?\.md$/.test(f) && existsSync(f));
} else {
  files = walk(ROOT);
}

const violations = [];
let checked = 0;
for (const f of files) {
  const raw = readFileSync(f, 'utf8');
  if (fm(raw, 'notePricing') !== 'paid') continue;
  if (!fm(raw, 'noteUrl') && !fm(raw, 'noteId')) continue; // 未公開は対象外（公開時に確定すればよい）
  checked++;
  const body = stripFm(raw);
  const pb = fm(raw, 'paidBoundary');
  const rel = f.replace(`${ROOT}/`, '');
  if (pb) {
    if (!boundaryExists(body, pb)) violations.push({ f: rel, reason: `paidBoundary "${pb}" が本文H2に無い` });
  } else if (!boundaryExists(body, DEFAULT_BOUNDARY)) {
    violations.push({ f: rel, reason: `paidBoundary 未設定＋既定「${DEFAULT_BOUNDARY}」H2も無い` });
  }
}

const scope = STAGED ? 'staged ' : '';
if (ALL) {
  console.log(`=== note 有料境界チェック（${checked} 件・paid published）===`);
  console.log(`境界未解決: ${violations.length}`);
  for (const v of violations) console.log(`  ✗ ${v.f}\n      ${v.reason}`);
  process.exit(0);
}
if (!violations.length) {
  console.log(`[check-note-boundary] ✓ ${scope}${checked} 件の paid 記事は有料境界が全て解決可能`);
  process.exit(0);
}
console.error(`[check-note-boundary] ✗ 有料境界が未解決の記事 ${violations.length} 件（${scope}${checked} 件中）:`);
for (const v of violations) console.error(`     ${v.f}\n       ${v.reason}`);
console.error(`\n  frontmatter に paidBoundary（境界H2の先頭一致）を付与してください。SSOT: .claude/knowledge/reference/note-api-verification.md`);
process.exit(1);
