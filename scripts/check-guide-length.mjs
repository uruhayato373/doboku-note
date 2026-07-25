#!/usr/bin/env node
// ガイド記事（group: guide）の本文ボリューム下限ゲート。
//
// ルール（真実源: .claude/knowledge/reference/content-principles.md §25）:
//   published かつ group: guide の記事は、本文（frontmatter を除き空白除去後）
//   3,000 字以上を必須とする。下回るものは「薄い記事（thin content）」として赤落ち。
//
// 背景: ガイド記事は検索流入の入口かつ note 有料コンテンツへのコンバージョン地点
//   （content-principles §20）。各 H2 セクションが §17（散文 200〜400 字/セクション）を
//   満たせば標準構成で自然に 3,000 字を超える。下回るのは散文が痩せている兆候。
//
// 適用範囲: group: guide のみ。過去問（primary/secondary）・キーワード・textbook は対象外
//   （§5 §188 の図表中心ページ例外を侵さない）。
//
// 使い方:
//   node scripts/check-guide-length.mjs            # published guide 全件を検査（CI 用）
//   node scripts/check-guide-length.mjs --staged   # git staged のガイド MDX のみ（pre-commit 用）
//   node scripts/check-guide-length.mjs --all      # published 問わず全 guide を一覧（バーンダウン進捗確認）
// 下限未満が 1 件でもあれば exit 1（--all は集計のみで exit 0）。

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const THRESHOLD = 3000;
const ROOT = '.local/r2/posts';
const STAGED = process.argv.includes('--staged');
const ALL = process.argv.includes('--all');

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith('.mdx')) out.push(p.split('\\').join('/'));
  }
  return out;
}

// frontmatter を分離し、{ fm, body } を返す。frontmatter が無ければ null。
function parse(file) {
  const t = readFileSync(file, 'utf8');
  const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  return { fm: m[1], body: t.slice(m[0].length) };
}

function field(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim() : undefined;
}

// 本文文字数（frontmatter 除外・空白除去後）。check-guide-length の SoT 計測。
function bodyLen(body) {
  return body.replace(/\s/g, '').length;
}

let files;
if (STAGED) {
  let staged = [];
  try {
    staged = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACM'], {
      encoding: 'utf8',
    })
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    staged = [];
  }
  files = staged.filter((f) => f.startsWith(`${ROOT}/`) && f.endsWith('.mdx') && existsSync(f));
} else {
  files = walk(ROOT);
}

const rows = [];
for (const f of files) {
  const parsed = parse(f);
  if (!parsed) continue;
  if (field(parsed.fm, 'group') !== 'guide') continue;
  const published = /^published:\s*true\s*$/m.test(parsed.fm);
  if (!ALL && !STAGED && !published) continue; // CI 既定: published のみ
  rows.push({ f, len: bodyLen(parsed.body), published });
}

rows.sort((a, b) => a.len - b.len);

if (ALL) {
  const under = rows.filter((r) => r.len < THRESHOLD);
  console.log(`[check-guide-length] guide 記事 ${rows.length} 件 / 下限 ${THRESHOLD} 字未満 ${under.length} 件`);
  for (const r of under) {
    console.log(`  ${String(r.len).padStart(5)}  ${r.published ? '' : '(draft) '}${r.f}`);
  }
  process.exit(0);
}

const fails = rows.filter((r) => r.len < THRESHOLD);
if (fails.length === 0) {
  const scope = STAGED ? 'staged ' : 'published ';
  console.log(`[check-guide-length] ✓ ${scope}guide 記事 ${rows.length} 件は全て ${THRESHOLD} 字以上`);
  process.exit(0);
}

console.error(`[check-guide-length] ✗ ${fails.length} 件のガイド記事が本文 ${THRESHOLD} 字未満（薄い記事）`);
console.error(`  真実源: .claude/knowledge/reference/content-principles.md §25`);
for (const r of fails) {
  const short = THRESHOLD - r.len;
  console.error(`  ${String(r.len).padStart(5)} 字（あと ${short} 字）  ${r.f}`);
}
console.error(`  → 各 H2 セクションの散文導入を §17（200〜400字/セクション）に沿って充実させてください。`);
process.exit(1);
