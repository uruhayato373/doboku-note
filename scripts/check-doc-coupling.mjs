#!/usr/bin/env node
// スキル / エージェントの「追加・削除・description 変更」に対し、対応する台帳ドキュメント
// （skills-guide.md / skills-registry.md / agents-registry.md）が同一コミットに含まれているかを検証する。
//
// 背景: CLAUDE.md §8「スキル/エージェント更新ルール」は人手の規律として存在するが、
// 強制力が無いため取りこぼす（例: 新スキルを足したのに skills-guide.md を更新し忘れる）。
// check-doc-refs.mjs が「壊れたパス参照」を機械検知するのと対をなし、本ガードは
// 「台帳の更新もれ（capability ドリフト）」を機械検知してコミットを止める。
//
// 検査ルール（staged のみ・index ベース）:
//   - skills SKILL.md 追加(A)/削除(D)        → skills-guide.md ＋ skills-registry.md が staged 必須
//   - skills SKILL.md 修正(M) で description 変更 → skills-guide.md が staged 必須
//   - agents *.md 追加(A)/削除(D)            → agents-registry.md が staged 必須
//   - agents *.md 修正(M) で description 変更   → agents-registry.md が staged 必須
//
// 意図的に「本体ファイルの軽微な本文修正（description 不変）」は対象外（誤検知ゼロ優先）。
// 台帳更新が不要な正当なケースのための緊急回避: 環境変数 SKIP_DOC_COUPLING=1、または `git commit --no-verify`。
//
// 使い方:
//   node scripts/check-doc-coupling.mjs --staged   # pre-commit 用（既定挙動）
//   npm run check-doc-coupling
// 違反が 1 件でもあれば exit 1。
//
// 真実源ルール: .claude/knowledge/reference/information-architecture.md「SSOT と参照規律」/ CLAUDE.md §8。

import { execFileSync } from 'node:child_process';

const SKILLS_GUIDE = '.claude/knowledge/reference/skills-guide.md';
const SKILLS_REGISTRY = '.claude/knowledge/reference/skills-registry.md';
const AGENTS_REGISTRY = '.claude/knowledge/reference/agents-registry.md';

if (process.env.SKIP_DOC_COUPLING === '1') {
  console.log('[check-doc-coupling] スキップ（SKIP_DOC_COUPLING=1）');
  process.exit(0);
}

// staged の name-status（リネームは A+D に分解して単純化）
function stagedNameStatus() {
  const out = execFileSync(
    'git',
    ['diff', '--cached', '--no-renames', '--name-status', '--diff-filter=ADM'],
    { encoding: 'utf8' }
  );
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [status, ...rest] = l.split('\t');
      return { status: status[0], path: rest.join('\t') };
    });
}

const staged = stagedNameStatus();
const stagedPaths = new Set(staged.map((s) => s.path));

// index（staged）/ HEAD のファイル内容を取得（存在しなければ null）
function showBlob(ref, path) {
  try {
    return execFileSync('git', ['show', `${ref}:${path}`], { encoding: 'utf8' });
  } catch {
    return null;
  }
}

// frontmatter の description フィールド値を抽出（plain / `>` 折りたたみ両対応）。
// 次の「トップレベル key:」または frontmatter 終端(---)までを値とみなし、空白を畳んで返す。
function extractDescription(content) {
  if (!content) return null;
  // BOM(U+FEFF) 付きファイル（Windows 由来・例 ig-carousel-writer.md）で /^---/ が外れて
  // 「description 取得失敗→安全側で常に変更あり」と誤検知する false positive を防ぐ（2026-07-11）
  content = content.replace(/^﻿/, '');
  const fm = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const lines = fm[1].split('\n');
  const start = lines.findIndex((l) => /^description\s*:/.test(l));
  if (start === -1) return null;
  const first = lines[start].replace(/^description\s*:/, '').trim();
  const buf = [];
  if (first && first !== '>' && first !== '|' && first !== '>-' && first !== '|-') buf.push(first);
  for (let i = start + 1; i < lines.length; i++) {
    // 次のトップレベル key（インデント無し + `key:`）で打ち切り
    if (/^[A-Za-z0-9_-]+\s*:/.test(lines[i])) break;
    buf.push(lines[i].trim());
  }
  return buf.join(' ').replace(/\s+/g, ' ').trim();
}

function descriptionChanged(path) {
  const head = extractDescription(showBlob('HEAD', path));
  const idx = extractDescription(showBlob('', path)); // ':path' = index/staged
  // HEAD が取れない（取得失敗）場合は安全側で「変更あり」とみなす
  if (head === null) return true;
  return head !== idx;
}

const violations = [];

for (const { status, path } of staged) {
  const isSkill = path.startsWith('.claude/skills/') && /\/SKILL\.md$/.test(path);
  const isAgent = path.startsWith('.claude/agents/') && /\.md$/.test(path);
  if (!isSkill && !isAgent) continue;

  if (isSkill) {
    if (status === 'A' || status === 'D') {
      const label = status === 'A' ? '追加' : '削除';
      const missing = [SKILLS_GUIDE, SKILLS_REGISTRY].filter((d) => !stagedPaths.has(d));
      if (missing.length) {
        violations.push(`スキル${label}: ${path}\n      → 同一コミットに未 staged: ${missing.join(' , ')}`);
      }
    } else if (status === 'M' && descriptionChanged(path)) {
      if (!stagedPaths.has(SKILLS_GUIDE)) {
        violations.push(`スキル description 変更: ${path}\n      → 同一コミットに未 staged: ${SKILLS_GUIDE}`);
      }
    }
  }

  if (isAgent) {
    if (status === 'A' || status === 'D') {
      const label = status === 'A' ? '追加' : '削除';
      if (!stagedPaths.has(AGENTS_REGISTRY)) {
        violations.push(`エージェント${label}: ${path}\n      → 同一コミットに未 staged: ${AGENTS_REGISTRY}`);
      }
    } else if (status === 'M' && descriptionChanged(path)) {
      if (!stagedPaths.has(AGENTS_REGISTRY)) {
        violations.push(`エージェント description 変更: ${path}\n      → 同一コミットに未 staged: ${AGENTS_REGISTRY}`);
      }
    }
  }
}

if (violations.length) {
  console.error(`[check-doc-coupling] ✗ 台帳の更新もれ ${violations.length} 件:`);
  for (const v of violations) console.error('  ' + v);
  console.error('\n対処: スキル/エージェントの追加・削除・description 変更は、同一コミットで対応台帳も更新する。');
  console.error('      skills → skills-guide.md（一覧）＋ skills-registry.md（退役/追加ログ） / agents → agents-registry.md');
  console.error('      正当に台帳更新が不要なら SKIP_DOC_COUPLING=1 または git commit --no-verify で回避。');
  console.error('      ルール: CLAUDE.md §8 / .claude/knowledge/reference/information-architecture.md「SSOT と参照規律」');
  process.exit(1);
}

console.log('[check-doc-coupling] ✓ スキル/エージェントの台帳更新もれなし');
