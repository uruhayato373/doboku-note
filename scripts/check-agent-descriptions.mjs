#!/usr/bin/env node
// check-agent-descriptions — .claude/agents/*.md の frontmatter `description` の長さを baseline ラチェットで止める。
//
// 守りたい事故: 81 件の description は**毎セッションの system prompt に全文載る**（合計 17.6k 文字・2026-09-14 実測）。
// 「担当範囲・安全弁・関連スクリプト」まで description に書く癖で 32 件が 300 文字超（最大 1,179＝coconala-operator）。
// 詳細は本文と agents-registry.md にあるので二重。上限 300 code points（`Use when` の有無は数えるだけ＝skill から呼ばれる
// Generator/Evaluator は trigger 句を持たないのが正常）。
// 既存の超過は .claude/state/quality/agent-descriptions-baseline.json に載せ、**新規の超過と既存の悪化**だけ赤にする
// （返済は DN-0232。返したら --update-baseline で締める）。
//
// 使い方:
//   node scripts/check-agent-descriptions.mjs                  # 全件（quality-audit ci:true）
//   node scripts/check-agent-descriptions.mjs --staged         # git index の .claude/agents/*.md だけ（pre-commit）
//   node scripts/check-agent-descriptions.mjs --update-baseline
//   node scripts/check-agent-descriptions.mjs --json
// exit 0 = 増加なし / 1 = 新規超過・悪化 / 2 = 検査不成立（agents 0 件・baseline 欠落）

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './lib/repository-paths.mjs';

export const MAX_CHARS = 300;
const AGENTS_DIR = '.claude/agents';
const BASELINE = '.claude/state/quality/agent-descriptions-baseline.json';
const USE_WHEN = /Use when/;

/** frontmatter の description（同一行 / `>` `|` 折り返し）。次のトップレベル key か frontmatter 終端まで */
export function extractDescription(content) {
  if (!content) return null;
  const src = content.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const fm = src.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const lines = fm[1].split('\n');
  const start = lines.findIndex((l) => /^description\s*:/.test(l));
  if (start === -1) return null;
  const first = lines[start].replace(/^description\s*:/, '').trim();
  const buf = [];
  if (first && !/^[>|][-+]?$/.test(first)) buf.push(first);
  for (let i = start + 1; i < lines.length; i++) {
    if (/^[A-Za-z0-9_-]+\s*:/.test(lines[i])) break;
    buf.push(lines[i].trim());
  }
  return buf.join(' ').replace(/\s+/g, ' ').trim();
}

/** @returns {{ name, chars, over: boolean, useWhen: boolean }} */
export function inspectAgent(name, content) {
  const d = extractDescription(content) ?? '';
  const chars = [...d].length; // code point 数（サロゲートペアを 1 と数える）
  return { name, chars, over: chars > MAX_CHARS, useWhen: USE_WHEN.test(d) };
}

/**
 * ラチェット判定（純粋）。baseline = { name: chars }（超過している agent だけ持つ）
 * @returns {{ newOver: string[], worsened: string[], repaid: string[], missingUseWhen: string[] }}
 */
export function ratchet(inspected, baseline) {
  const newOver = [];
  const worsened = [];
  const missingUseWhen = [];
  const seen = new Set();
  for (const a of inspected) {
    seen.add(a.name);
    if (!a.useWhen) missingUseWhen.push(a.name);
    if (!a.over) continue;
    if (!(a.name in baseline)) newOver.push(`${a.name}（${a.chars}）`);
    else if (a.chars > baseline[a.name]) worsened.push(`${a.name}（${baseline[a.name]} → ${a.chars}）`);
  }
  const repaid = Object.keys(baseline).filter((n) => seen.has(n) && !inspected.find((a) => a.name === n)?.over);
  return { newOver, worsened, repaid, missingUseWhen };
}

function listWorkingTree() {
  const dir = join(REPO_ROOT, AGENTS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => ({ name: f.slice(0, -3), content: readFileSync(join(dir, f), 'utf8') }));
}

function listStaged() {
  const out = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=AM', '--', AGENTS_DIR], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return out
    .split(/\r?\n/)
    .filter((p) => p.endsWith('.md') && !p.slice(AGENTS_DIR.length + 1).includes('/'))
    .map((p) => ({ name: p.slice(AGENTS_DIR.length + 1, -3), content: execFileSync('git', ['show', `:${p}`], { cwd: REPO_ROOT, encoding: 'utf8' }) }));
}

function main() {
  const argv = process.argv.slice(2);
  const staged = argv.includes('--staged');
  const update = argv.includes('--update-baseline');
  const json = argv.includes('--json');
  const tag = '[check-agent-descriptions]';

  const files = staged ? listStaged() : listWorkingTree();
  if (!staged && files.length === 0) {
    console.error(`${tag} ✗ 検査不成立: ${AGENTS_DIR} に agent が 0 件`);
    return 2;
  }
  const inspected = files.map((f) => inspectAgent(f.name, f.content));

  const baselinePath = join(REPO_ROOT, BASELINE);
  if (update) {
    const next = Object.fromEntries(inspected.filter((a) => a.over).map((a) => [a.name, a.chars]));
    writeFileSync(baselinePath, JSON.stringify({ _doc: `description が ${MAX_CHARS} code points を超えている agent とその長さ。新規の超過と悪化を止めるラチェット（scripts/check-agent-descriptions.mjs）。返済したら --update-baseline で縮める`, updatedAt: new Date().toISOString(), maxChars: MAX_CHARS, over: next }, null, 2) + '\n');
    console.log(`${tag} baseline を更新: 超過 ${Object.keys(next).length} 件 / ${inspected.length} agent`);
    return 0;
  }
  if (!existsSync(baselinePath)) {
    console.error(`${tag} ✗ 検査不成立: baseline が無い（${BASELINE}。--update-baseline で作る）`);
    return 2;
  }
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')).over || {};
  const r = ratchet(inspected, baseline);
  const total = inspected.reduce((n, a) => n + a.chars, 0);

  if (json) {
    console.log(JSON.stringify({ examined: inspected.length, totalChars: total, maxChars: MAX_CHARS, baselineOver: Object.keys(baseline).length, ...r, agents: inspected }, null, 2));
  } else {
    console.log(`${tag} ${staged ? 'staged' : '全件'} ${inspected.length} agent を実検査（description 合計 ${total} 文字・上限 ${MAX_CHARS}）/ baseline 超過 ${Object.keys(baseline).length} / 新規超過 ${r.newOver.length} / 悪化 ${r.worsened.length} / Use when 無し ${r.missingUseWhen.length}（情報のみ）/ 返済 ${r.repaid.length}`);
    for (const x of r.newOver) console.error(`  ✗ 新規超過: ${x} — 「何をする / 何をしない / Use when」の 3 文に圧縮し、詳細は本文と agents-registry.md へ`);
    for (const x of r.worsened) console.error(`  ✗ 悪化: ${x}`);
    for (const x of r.repaid) console.log(`  ▽ 返済済み: ${x} — --update-baseline で baseline を締める`);
  }
  const fail = r.newOver.length || r.worsened.length;
  if (fail) return 1;
  if (!json) console.log(`  ✓ 新規の超過・悪化なし`);
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('check-agent-descriptions.mjs')) process.exit(main());
