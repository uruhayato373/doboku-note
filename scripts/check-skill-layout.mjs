#!/usr/bin/env node
// check-skill-layout.mjs — スキルの置き場が Claude Code に読み込まれる形かを止めるゲート。
//
// 守りたい事故: Claude Code が探すのは `.claude/skills/<name>/SKILL.md` の 1 階層だけ。
// カテゴリのフォルダを挟んだ `.claude/skills/<カテゴリ>/<name>/SKILL.md` は読み込まれず、
// 2026-11-10 まで 98 本すべてが `Unknown skill` だった（/deploy・/doc-sync が動かない）。
// 作業の種類は frontmatter の `category:` に書く（管理画面のスキル一覧が読む）。
//
// 検査（.claude/skills の下の SKILL.md すべて）:
//   1. 置き場が `.claude/skills/<name>/SKILL.md`（深さ 1）
//   2. frontmatter の name がディレクトリ名と一致
//   3. frontmatter に category があり、語彙（CATEGORIES）の中
//
// 使い方: node scripts/check-skill-layout.mjs [--root <dir>]
// exit 0 = 健全 / 1 = 違反あり・検査不成立（SKILL.md が 0 件）

import { readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { isCliEntry, runAsCli } from './lib/cli-run.mjs';

export const CATEGORIES = ['ads', 'analytics', 'authoring', 'conversion', 'dev', 'management', 'metrics', 'quality', 'social', 'ui'];
const SKILLS_DIR = '.claude/skills';

/** frontmatter の 1 行値（name・category）を読む（line-based・フル YAML パーサは入れない） */
export function frontmatterValue(content, key) {
  const lines = content.replace(/^﻿/, '').split(/\r?\n/);
  if (lines[0] !== '---') return null;
  const end = lines.indexOf('---', 1);
  if (end === -1) return null;
  const line = lines.slice(1, end).find((l) => l.startsWith(`${key}:`));
  if (!line) return null;
  return line.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, '') || null;
}

/** relPath は `.claude/skills/...` からの POSIX パス。違反の文の配列を返す */
export function checkSkillFile(relPath, content) {
  const parts = relPath.split('/');
  const out = [];
  if (parts.length !== 4) {
    out.push(`${relPath}: 置き場は .claude/skills/<name>/SKILL.md の 1 階層だけ（入れ子は Claude Code が読み込まない）`);
    return out;
  }
  const dir = parts[2];
  const name = frontmatterValue(content, 'name');
  if (name !== dir) out.push(`${relPath}: name（${name ?? '無し'}）がディレクトリ名 ${dir} と違う`);
  const category = frontmatterValue(content, 'category');
  if (!category) out.push(`${relPath}: frontmatter に category が無い（${CATEGORIES.join(' / ')}）`);
  else if (!CATEGORIES.includes(category)) out.push(`${relPath}: category ${category} は語彙外（${CATEGORIES.join(' / ')}）`);
  return out;
}

export function checkSkillLayout(root) {
  const files = listFiles(join(root, SKILLS_DIR), { match: (_p, name) => name === 'SKILL.md', allowMissing: true })
    .map((abs) => relative(root, abs).split(sep).join('/'))
    .sort();
  const violations = files.flatMap((rel) => checkSkillFile(rel, readFileSync(join(root, rel), 'utf8')));
  return { checked: files.length, violations };
}

function main(argv) {
  const rootIdx = argv.indexOf('--root');
  const root = rootIdx !== -1 ? argv[rootIdx + 1] : REPO_ROOT;
  const r = checkSkillLayout(root);
  console.log(`[check-skill-layout] SKILL.md ${r.checked} 件を実検査・違反 ${r.violations.length} 件`);
  if (r.checked === 0) {
    console.error('[check-skill-layout] ✗ SKILL.md が 0 件（検査不成立）: ' + join(root, SKILLS_DIR));
    return 1;
  }
  if (r.violations.length) {
    for (const v of r.violations) console.error('  ✗ ' + v);
    return 1;
  }
  console.log('  ✓ スキルはすべて .claude/skills/<name>/SKILL.md に置かれ、category が付いている');
  return 0;
}

/** pre-commit-dispatch が in-process で呼ぶ入口（process.exit を呼ばず { code } を返す） */
export function run({ argv = process.argv.slice(2) } = {}) {
  return { code: main(argv) };
}

if (isCliEntry(import.meta.url)) runAsCli(run);
