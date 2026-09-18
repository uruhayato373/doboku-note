#!/usr/bin/env node
// check-rccm-essay.mjs — RCCM 問題III 模範論文（note 教材）の決定的ゲート。
//
// 対象: content/note/RCCM/**/article.md のうち frontmatter に `rccmKeywords` を持つ記事（問題III 型）。
// 検査（判定ロジックは scripts/lib/rccm-essay.mjs に集約・テスト済み）:
//   H1 `## 模範論文` 節が存在し、本文（見出し・空白除く）が 1,200〜1,600 字（協会の出題条件）
//   H2 指定用語（rccmKeywords）を「」で囲んで 4 語以上使用（協会の出題条件）
//   H3 節内に `### ①` と `### ②` の見出しがある
//   H4 `## 試験問題` `## 過去問` 等の問題再現節が無い（過去問は事務局非公開・転載禁止）
//   H5 paidBoundary が本文の H2 に prefix 一致で実在する
//   W1 使用語が 5 語未満（--strict で違反扱い）
//   W2 字数が 1,400〜1,550 の推奨帯の外（--strict で違反扱い）
//
// 使い方:
//   node scripts/check-rccm-essay.mjs                       # 全件（CI 用）
//   node scripts/check-rccm-essay.mjs --staged              # git staged の article.md のみ（pre-commit 用）
//   node scripts/check-rccm-essay.mjs <path...> [--strict]   # 指定ファイル（writer/qa の返却前ゲート）
// exit: 0 合格 / 1 違反あり / 2 検査不成立（対象 0 件をパスと呼ばない）
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { evaluateRccmEssay } from './lib/rccm-essay.mjs';

const ROOT = 'content/note/RCCM';
const STRICT = process.argv.includes('--strict');
const STAGED = process.argv.includes('--staged');
const explicit = process.argv.slice(2).filter((a) => !a.startsWith('--'));

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/^article(-[^/]+)?\.md$/.test(e)) out.push(p.split('\\').join('/'));
  }
  return out;
}

let files;
if (explicit.length) {
  files = explicit;
} else if (STAGED) {
  let staged = [];
  try {
    staged = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
      .split('\n').map((s) => s.trim()).filter(Boolean);
  } catch { staged = []; }
  files = staged.filter((f) => f.startsWith(`${ROOT}/`) && /(^|\/)article(-[^/]+)?\.md$/.test(f) && existsSync(f));
} else {
  files = walk(ROOT);
}

const missing = files.filter((f) => !existsSync(f));
if (missing.length) {
  for (const f of missing) console.error(`[check-rccm-essay] ファイルが無い: ${f}`);
  process.exit(2);
}

let targets = 0;
let violations = 0;
for (const file of files) {
  const { data, content } = matter(readFileSync(file, 'utf8'));
  if (!Array.isArray(data.rccmKeywords)) continue; // 問題III 型でない記事は対象外
  targets++;
  const r = evaluateRccmEssay(content, data, { strict: STRICT });
  const status = r.errors.length ? '✗' : r.warnings.length ? '△' : '✓';
  console.log(`${status} ${file} — 模範論文 ${r.essayChars} 字 / 指定用語「」 ${r.keywordsUsed.length} 語（${r.keywordsUsed.join('・') || 'なし'}）`);
  for (const e of r.errors) console.log(`    ✗ ${e}`);
  for (const w of r.warnings) console.log(`    △ ${w}`);
  if (r.errors.length) violations++;
}

const mode = explicit.length ? '指定' : STAGED ? 'staged' : '全件';
if (targets === 0) {
  console.log(`[check-rccm-essay] 対象 0 件（${mode}・rccmKeywords を持つ article.md が無い）— 検査していない`);
  process.exit(STAGED ? 0 : 2);
}
console.log(`[check-rccm-essay] ${violations ? '✗' : '✓'} ${mode} ${targets} 件を実検査 / 違反 ${violations} 件${STRICT ? '（--strict: 推奨帯外も違反）' : ''}`);
process.exit(violations ? 1 : 0);
