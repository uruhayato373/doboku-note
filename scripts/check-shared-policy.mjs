#!/usr/bin/env node
// check-shared-policy — 共有 SSOT の写し（.claude/shared-policy/）が manifest どおりかを SessionStart で静かに検査する。
//
// 正本は Obsidian vault の memos/*SSOT.md（共通事業方針・リパーパス戦略・note記事構成）。ここにあるのは配布された写しで、
// 手編集・欠落・（正本が ../obsidian に checkout されていれば）陳腐化を sync.mjs --check が検出する。
// session-start.mjs は「出力が非空の検査だけ表示」なので、OK のときは何も出さない。壊れた写しを読んで
// 記事や戦略を書き始める前に気づかせるのが目的（2026-09-15）。
// 使い方: node scripts/check-shared-policy.mjs   （exit は常に 0・SessionStart は非ブロック）

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const sync = resolve(ROOT, '.claude/shared-policy/sync.mjs');

if (!existsSync(sync)) {
  console.log('共有 SSOT の写し（.claude/shared-policy/sync.mjs）が無い → obsidian で `npm run policy:sync`');
  process.exit(0);
}
const r = spawnSync(process.execPath, [sync, '--check'], { cwd: ROOT, encoding: 'utf8', timeout: 20_000, windowsHide: true });
if (r.status === 0) process.exit(0);
const reason = `${r.stderr || ''}${r.stdout || ''}`.trim().split(/\r?\n/).pop() || `exit ${r.status}`;
console.log(`共有 SSOT の写し（.claude/shared-policy/）に問題: ${reason}`);
console.log('  → 正本は Obsidian vault memos/*SSOT.md。写しは手編集せず、obsidian で `npm run policy:sync` → ここで commit（規約: .claude/rules/shared-business-policy.md）');
process.exit(0);
