#!/usr/bin/env node
// session-start — Claude Code の SessionStart で走る 8 検査を 1 プロセス内で順次呼ぶ。
//
// それまで .claude/settings.json は 6 本の `node …` を同時起動していた（async）。同一マシンで複数セッションが
// 並行する常態では起動のたびに node が 6 本 × セッション数立ち上がり、空きメモリ 3 GiB 未満の端末で重い処理ゲート
// （local-resource-run）に引っかかる一因になっていた（2026-09-14・15.6 GB 中空き 2.6 GB を実測）。
// 09-14 に順次 spawn へ直したあと、DN-0236 で各 script が export する run() を **import して呼ぶ**形にした。
// 子の node は 1 本も立てない（git / df / Playwright の browser は従来どおり各検査が起動する）。
// **出力が非空の検査だけ** `[name]` を付けて表示する（静かな緑は出さない）。
//
// run({ argv, quiet: true }) の契約: process.exit を呼ばず、出力は返り値 { code, stdout, stderr } に入れる
// （共通部品は scripts/lib/cli-run.mjs）。各 script を node で直接叩く CLI 経路はそのまま残っている。
// timeout は async な待ち（x-sync の Playwright）だけに効く。同期処理は途中で打ち切れないので、
// 外部コマンド側に上限を置く（git fetch 25s・git blame 30s 等）。
// 使い方: node scripts/session-start.mjs [--only a,b] [--json]

import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');

/** 順番は「早く終わる・並行セッションの安全に効く」順。timeout は旧 settings.json の値を踏襲 */
export const CHECKS = [
  { name: 'git-sync', script: 'scripts/check-git-sync.mjs', args: [], timeout: 30_000 },
  { name: 'shared-policy', script: 'scripts/check-shared-policy.mjs', args: [], timeout: 20_000 },
  { name: 'plan-staleness', script: 'scripts/check-plan-staleness.mjs', args: [], timeout: 10_000 },
  { name: 'backlog-due', script: 'scripts/check-backlog-health.mjs', args: ['--due'], timeout: 15_000 },
  { name: 'weekly-review-due', script: 'scripts/check-weekly-review-due.mjs', args: [], timeout: 10_000 },
  { name: 'gsc-login', script: 'scripts/check-gsc-login.mjs', args: [], timeout: 5_000 },
  { name: 'resources', script: 'scripts/local-resource-audit.mjs', args: ['--quick'], timeout: 30_000 },
  { name: 'disk-hygiene', script: 'scripts/check-disk-hygiene.mjs', args: ['--quick'], timeout: 15_000 },
  { name: 'x-sync', script: 'scripts/x-sync-status.mjs', args: ['--dry'], timeout: 60_000 },
];

const TIMEOUT = Symbol('timeout');

/** 1 検査を in-process で実行する。戻り値の形は旧 spawn 版と同じ { name, status, ms, out } */
export async function runCheck(check) {
  const t0 = Date.now();
  let timer;
  try {
    const mod = await import(pathToFileURL(resolve(ROOT, check.script)).href);
    if (typeof mod.run !== 'function') throw new Error(`${check.script} が run() を export していない`);
    const r = await Promise.race([
      mod.run({ argv: check.args, quiet: true, root: ROOT }),
      new Promise((res) => { timer = setTimeout(() => res(TIMEOUT), check.timeout); timer.unref?.(); }),
    ]);
    if (r === TIMEOUT) return { name: check.name, status: 'timeout', ms: Date.now() - t0, out: '' };
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim();
    return { name: check.name, status: r.code ?? 0, ms: Date.now() - t0, out };
  } catch (e) {
    // 旧 spawn 版で子が落ちたときと同じく、原因を出力に載せる（SessionStart 全体は止めない）
    return { name: check.name, status: 'error', ms: Date.now() - t0, out: String(e?.stack || e).trim() };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1].split(',') : null;
  const json = argv.includes('--json');
  // 旧 spawn 版は各検査を cwd: ROOT で起動していた（git と x-sync は cwd 基準で動く）
  process.chdir(ROOT);
  const results = [];
  for (const c of CHECKS) {
    if (only && !only.includes(c.name)) continue;
    results.push(await runCheck(c));
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

// in-process では timeout した検査（Playwright 等）の handle が残り得るので、書き切ってから明示的に終える
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().then((code) => process.stdout.write('', () => process.exit(code)));
}
