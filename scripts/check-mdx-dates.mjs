#!/usr/bin/env node
// check-mdx-dates.mjs — 記事の日付が frontmatter に揃っているかのゲート。
//
// なぜ要るか: sitemap lastmod / JSON-LD datePublished / RSS は **frontmatter の日付**から
// 作られる（2026-08-22 に git log 由来から反転）。frontmatter に日付が無いと、ビルドは
// git 履歴へフォールバックする——それは反転前の状態に戻るということで、
// **公開 SEO 信号がリポジトリ基盤に依存し、ビルドが全履歴を要求する**状態に逆戻りする。
//
// 日付を書き込むのは pre-commit（`backfill-mdx-dates.mjs --staged`）。ここはそれが
// `--no-verify` や bot コミットで飛ばされた場合の受け皿。
//
// 検査するもの:
//   1. 公開記事の frontmatter に created / dateModified があるか
//   2. 値が YYYY-MM-DD 形式か（gray-matter が Date にパースする裸の日付も許容）
//   3. dateModified >= created（逆転していないか）
//
// git には触らない（shallow clone でも動く）。
//
// 使い方: node scripts/check-mdx-dates.mjs [--json]
// exit 0 = 健全 / 1 = 欠落あり・検査不成立

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { SITE_CONTENT_ROOT, REPO_ROOT } from './lib/repository-paths.mjs';

const JSON_OUT = process.argv.includes('--json');
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

const field = (fm, key) => {
  const m = fm.match(new RegExp('^' + key + ':\\s*["\']?([^"\'\\r\\n]+)', 'm'));
  return m ? m[1].trim() : null;
};

const files = walk(SITE_CONTENT_ROOT);
const missing = [];
const badFormat = [];
const inverted = [];
let checked = 0;
let unpublished = 0;

for (const f of files) {
  const raw = readFileSync(f, 'utf-8').slice(0, 6000);
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) continue;
  const fm = fmMatch[1];
  if (/^published:\s*false/m.test(fm)) { unpublished++; continue; }
  checked++;
  const rel = relative(REPO_ROOT, f).replace(/\\/g, '/');
  const created = field(fm, 'created');
  const modified = field(fm, 'dateModified');
  if (!created || !modified) { missing.push(rel + '（' + (!created ? 'created' : '') + (!created && !modified ? ' / ' : '') + (!modified ? 'dateModified' : '') + '）'); continue; }
  if (!DATE_RE.test(created) || !DATE_RE.test(modified)) { badFormat.push(rel + ' created=' + created + ' dateModified=' + modified); continue; }
  if (modified < created) inverted.push(rel + ' created=' + created + ' > dateModified=' + modified);
}

const problems = missing.length + badFormat.length + inverted.length;

if (JSON_OUT) {
  console.log(JSON.stringify({ checked, unpublished, missing, badFormat, inverted }, null, 2));
} else {
  console.log('[check-mdx-dates] 公開記事 ' + checked + ' 件を実検査（非公開 ' + unpublished + ' 件は対象外）');
  // 検査ゼロを PASS と呼ばない（CLAUDE.md §9）
  if (checked === 0) {
    console.error('✗ 検査対象 0 件＝走査が壊れている疑い（検査不成立）');
    process.exit(1);
  }
  for (const m of missing.slice(0, 15)) console.error('  [欠落] ' + m);
  for (const m of badFormat.slice(0, 10)) console.error('  [形式] ' + m);
  for (const m of inverted.slice(0, 10)) console.error('  [逆転] ' + m);
  if (problems === 0) {
    console.log('  ✓ 日付はすべて frontmatter に揃っている（ビルドは git 履歴に触れない）');
  } else {
    console.error('\n✗ 問題 ' + problems + ' 件（欠落 ' + missing.length + ' / 形式 ' + badFormat.length + ' / 逆転 ' + inverted.length + '）');
    console.error('  → node .claude/scripts/backfill-mdx-dates.mjs で frontmatter へ書き込むこと');
    console.error('  日付が無いとビルドが git 履歴へフォールバックし、反転前の状態（公開 SEO 信号が');
    console.error('  リポジトリ操作で動く・build が全履歴を要求する）に逆戻りする。');
  }
}
process.exit(problems ? 1 : 0);
