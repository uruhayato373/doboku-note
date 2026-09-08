#!/usr/bin/env node
// check-claude-md-size.mjs — CLAUDE.md（常時読み込みの核）の肥大化と、.claude/rules の常時読み込み化を止めるゲート。
//
// 守りたい事故: CLAUDE.md は毎ターン再送される。2026-09-08 時点で 311 行 / 69 KB（≈17k tokens）まで
// 太り、Claude Code 公式の目安（1 ファイル 200 行以下）を大きく超えていた。頻用コマンド表と索引を
// .claude/knowledge/reference/ へ、領域限定の規約を .claude/rules/*.md（paths: frontmatter による
// 条件付き読み込み）へ移して 150 行以下にした。放っておくと「1 行足すだけ」で元へ戻るので機械で止める。
//
// 検査:
//   1. CLAUDE.md が MAX_LINES 行以下・MAX_BYTES バイト以下
//   2. 「## 12 原則」の `### N. ` 見出しが 1..12 ちょうど揃っている（約 170 箇所が §番号で参照する）
//   3. `<!-- BEGIN:nextjs-agent-rules -->` … `<!-- END:nextjs-agent-rules -->` が末尾にある
//      （next dev が再付与する自動生成部。途中にあると next dev が末尾へもう 1 つ足す）
//   4. .claude/rules/**/*.md すべてに `paths:` frontmatter と 1 件以上のパターンがある
//      （無いと起動時に常時読み込みになり、分離した意味が消える。sync-codex-compat も同条件で FAIL する）
//
// 使い方: node scripts/check-claude-md-size.mjs [--root <dir>] [--json]
// exit 0 = 健全 / 1 = 違反あり・検査不成立（CLAUDE.md が読めない）

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { REPO_ROOT } from './lib/repository-paths.mjs';

export const MAX_LINES = 150;
export const MAX_BYTES = 20 * 1024;
export const PRINCIPLE_COUNT = 12;
const RULES_DIR = '.claude/rules';
const NEXT_BEGIN = '<!-- BEGIN:nextjs-agent-rules -->';
const NEXT_END = '<!-- END:nextjs-agent-rules -->';

function walkMd(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkMd(p, acc);
    else if (e.isFile() && e.name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

/** `paths:` frontmatter を持ち、パターンが 1 件以上あるか（line-based・フル YAML パーサは入れない） */
export function ruleHasPaths(content) {
  const lines = content.replace(/^﻿/, '').split(/\r?\n/);
  if (lines[0] !== '---') return false;
  const end = lines.indexOf('---', 1);
  if (end === -1) return false;
  const fm = lines.slice(1, end);
  const idx = fm.findIndex((l) => /^paths\s*:/.test(l));
  if (idx === -1) return false;
  const inline = fm[idx].replace(/^paths\s*:/, '').trim();
  if (inline && inline !== '[]') return true;
  return fm.slice(idx + 1).some((l) => /^\s+-\s+\S/.test(l));
}

/** @returns {{ violations: string[], stats: object } | null} CLAUDE.md が無ければ null（検査不成立） */
export function checkClaudeMd(root) {
  const claudePath = join(root, 'CLAUDE.md');
  if (!existsSync(claudePath)) return null;
  const src = readFileSync(claudePath, 'utf8');
  const bytes = Buffer.byteLength(src, 'utf8');
  const lines = src.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  const violations = [];

  if (lines.length > MAX_LINES) violations.push(`CLAUDE.md が ${lines.length} 行（上限 ${MAX_LINES}）。移設先は .claude/rules/（paths: 条件付き）か .claude/knowledge/reference/`);
  if (bytes > MAX_BYTES) violations.push(`CLAUDE.md が ${bytes} bytes（上限 ${MAX_BYTES}）`);

  const nums = [...src.matchAll(/^### (\d+)\. /gm)].map((m) => Number(m[1]));
  const expected = Array.from({ length: PRINCIPLE_COUNT }, (_, i) => i + 1);
  if (nums.join(',') !== expected.join(',')) {
    violations.push(`12 原則の見出し \`### N. \` が 1..${PRINCIPLE_COUNT} と一致しない（実際: ${nums.join(',') || '無し'}）。§番号は他 doc から参照されるので増減・改番しない`);
  }

  const begin = src.indexOf(NEXT_BEGIN);
  const endIdx = src.indexOf(NEXT_END);
  if (begin === -1 || endIdx === -1 || endIdx < begin) {
    violations.push('nextjs-agent-rules ブロック（BEGIN/END）が無い。next dev が再付与するので消さず末尾に置く');
  } else if (src.slice(endIdx + NEXT_END.length).trim() !== '') {
    violations.push('nextjs-agent-rules ブロックの後に本文がある。ブロックは末尾に置く');
  }

  const ruleFiles = walkMd(join(root, RULES_DIR)).sort();
  const rulesWithoutPaths = ruleFiles.filter((p) => !ruleHasPaths(readFileSync(p, 'utf8'))).map((p) => relative(root, p).split(sep).join('/'));
  for (const p of rulesWithoutPaths) violations.push(`${p}: paths: frontmatter が無い（常時読み込みになる。領域を限定できないなら CLAUDE.md に書く）`);

  return {
    violations,
    stats: { lines: lines.length, bytes, principles: nums.length, rules: ruleFiles.length, rulesWithoutPaths: rulesWithoutPaths.length },
  };
}

function main() {
  const argv = process.argv.slice(2);
  const rootIdx = argv.indexOf('--root');
  const root = rootIdx !== -1 ? argv[rootIdx + 1] : REPO_ROOT;
  const jsonOut = argv.includes('--json');
  const r = checkClaudeMd(root);
  if (!r) {
    console.error('[check-claude-md-size] ✗ CLAUDE.md が読めない（検査不成立）: ' + root);
    return 1;
  }
  if (jsonOut) {
    console.log(JSON.stringify(r, null, 2));
    return r.violations.length ? 1 : 0;
  }
  console.log(`[check-claude-md-size] CLAUDE.md ${r.stats.lines} 行 / ${r.stats.bytes} bytes（上限 ${MAX_LINES} 行 / ${MAX_BYTES} bytes）・原則見出し ${r.stats.principles} 本・rules ${r.stats.rules} 件（paths 無し ${r.stats.rulesWithoutPaths}）`);
  if (r.violations.length) {
    for (const v of r.violations) console.error('  ✗ ' + v);
    console.error(`\n✗ ${r.violations.length} 件の違反。常時読み込みの核は短く保ち、細部は .claude/rules/ と reference へ移す`);
    return 1;
  }
  console.log('  ✓ CLAUDE.md は上限内・12 原則は揃っている・rules はすべて paths: 条件付き');
  return 0;
}

if (process.argv[1] && statSync(process.argv[1]).isFile() && process.argv[1].endsWith('check-claude-md-size.mjs')) {
  process.exit(main());
}
