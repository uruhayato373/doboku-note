#!/usr/bin/env node
// check-shared-policy — 共有 SSOT の写し（.claude/shared-policy/）が manifest どおりかを SessionStart で静かに検査する。
//
// 正本は Obsidian vault の memos/*SSOT.md（共通事業方針・リパーパス戦略・note記事構成）。ここにあるのは配布された写しで、
// 手編集・欠落・（正本が ../obsidian に checkout されていれば）陳腐化を sync.mjs --check が検出する。
// session-start.mjs は「出力が非空の検査だけ表示」なので、OK のときは何も出さない。壊れた写しを読んで
// 記事や戦略を書き始める前に気づかせるのが目的（2026-09-15）。
// session-start.mjs は import して run({ quiet: true }) を呼ぶ（DN-0236）。sync.mjs も spawn せず、
// その export（verify / synchronize）を in-process で呼ぶ。sync.mjs は配布物なのでここからは書き換えない。
// 使い方: node scripts/check-shared-policy.mjs   （exit は常に 0・SessionStart は非ブロック）

import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createOutput, isCliEntry, runAsCli } from './lib/cli-run.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const sync = resolve(ROOT, '.claude/shared-policy/sync.mjs');

/**
 * `node sync.mjs --check` を消費側（doboku-note）で叩いたときと同じ経路:
 * 正本 ../obsidian が無ければ写しの自己整合（verify）だけ、在れば正本との一致まで（synchronize check）。
 */
async function checkSharedPolicy() {
  const { verify, synchronize } = await import(pathToFileURL(sync).href);
  const source = resolve(ROOT, '../obsidian');
  if (!existsSync(source)) verify(ROOT);
  else synchronize({ source, targets: [ROOT], check: true });
}

export async function run({ quiet = false } = {}) {
  const out = createOutput({ quiet });
  if (!existsSync(sync)) {
    out.log('共有 SSOT の写し（.claude/shared-policy/sync.mjs）が無い → obsidian で `npm run policy:sync`');
    return out.result(0);
  }
  try {
    await checkSharedPolicy();
    return out.result(0);
  } catch (e) {
    const reason = String(e?.message ?? e).trim().split(/\r?\n/).pop() || 'unknown error';
    out.log(`共有 SSOT の写し（.claude/shared-policy/）に問題: ${reason}`);
    out.log('  → 正本は Obsidian vault memos/*SSOT.md。写しは手編集せず、obsidian で `npm run policy:sync` → ここで commit（規約: .claude/rules/shared-business-policy.md）');
    return out.result(0);
  }
}

if (isCliEntry(import.meta.url)) runAsCli(run);
