#!/usr/bin/env node
// session-start — Claude Code の SessionStart で走る 7 検査を 1 プロセスから順次呼ぶ。
//
// それまで .claude/settings.json は 6 本の `node …` を同時起動していた（async）。同一マシンで複数セッションが
// 並行する常態では起動のたびに node が 6 本 × セッション数立ち上がり、空きメモリ 3 GiB 未満の端末で重い処理ゲート
// （local-resource-run）に引っかかる一因になっていた（2026-09-14・15.6 GB 中空き 2.6 GB を実測）。
// ここでは順次 1 本ずつ spawn し、**出力が非空の検査だけ** `[name]` を付けて表示する（静かな緑は出さない）。
//
// 各 script は CLI 経路（main() モジュール内）のままなので子プロセスは残る。in-process 化（run() の export）は DN-0236。
// 使い方: node scripts/session-start.mjs [--only a,b] [--json]

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');

/** 順番は「早く終わる・並行セッションの安全に効く」順。timeout は旧 settings.json の値を踏襲 */
export const CHECKS = [
  { name: 'git-sync', script: 'scripts/check-git-sync.mjs', args: [], timeout: 30_000 },
  { name: 'shared-policy', script: 'scripts/check-shared-policy.mjs', args: [], timeout: 20_000 },
  { name: 'plan-staleness', script: 'scripts/check-plan-staleness.mjs', args: [], timeout: 10_000 },
  { name: 'backlog-due', script: 'scripts/check-backlog-health.mjs', args: ['--due'], timeout: 15_000 },
  { name: 'weekly-review-due', script: 'scripts/check-weekly-review-due.mjs', args: [], timeout: 10_000 },
  { name: 'resources', script: 'scripts/local-resource-audit.mjs', args: ['--quick'], timeout: 30_000 },
  { name: 'disk-hygiene', script: 'scripts/check-disk-hygiene.mjs', args: ['--quick'], timeout: 15_000 },
  { name: 'x-sync', script: 'scripts/x-sync-status.mjs', args: ['--dry'], timeout: 60_000 },
];

export function runCheck(check) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [resolve(ROOT, check.script), ...check.args], { cwd: ROOT, encoding: 'utf8', timeout: check.timeout, windowsHide: true });
  const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
  return { name: check.name, status: r.error?.code === 'ETIMEDOUT' ? 'timeout' : r.status ?? 'error', ms: Date.now() - t0, out };
}

function main() {
  const argv = process.argv.slice(2);
  const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1].split(',') : null;
  const json = argv.includes('--json');
  const results = [];
  for (const c of CHECKS) {
    if (only && !only.includes(c.name)) continue;
    results.push(runCheck(c));
  }
  if (json) {
    console.log(JSON.stringify(results, null, 2));
    return 0;
  }
  for (const r of results) {
    if (r.status === 'timeout') console.log(`[${r.name}] timeout（${Math.round(r.ms / 1000)}s）`);
    else if (r.out) console.log(r.out.split(/\r?\n/).map((l) => (l.startsWith('[') ? l : `[${r.name}] ${l}`)).join('\n'));
  }
  return 0; // SessionStart は常に非ブロック
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) process.exit(main());
