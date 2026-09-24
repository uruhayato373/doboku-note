// cli-run — 検査 script を「CLI としても、別モジュールから run() でも」呼べるようにする共通部品（DN-0236）。
//
// session-start.mjs は SessionStart の検査を 1 プロセス内で順次 import して run({ quiet: true }) を呼ぶ。
// そのため各 script の run() は process.exit を呼ばず、出力を console へ直接書かずにこの sink へ書き、
// { code, stdout, stderr } を返す。CLI 経路（node で直接起動）は quiet=false でそのまま console へ流す。

import { format } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** quiet=false は console.log/error へそのまま、quiet=true は捕まえて result() で返す。 */
export function createOutput({ quiet = false } = {}) {
  const stdout = [];
  const stderr = [];
  return {
    log: (...args) => (quiet ? stdout.push(format(...args)) : console.log(...args)),
    error: (...args) => (quiet ? stderr.push(format(...args)) : console.error(...args)),
    /** console と同じく 1 呼び出し = 1 行（末尾改行つき）で連結する */
    result: (code) => ({
      code,
      stdout: stdout.map((l) => `${l}\n`).join(''),
      stderr: stderr.map((l) => `${l}\n`).join(''),
    }),
  };
}

/** この module が `node <file>` で直接起動されたか（import されただけなら false） */
export function isCliEntry(moduleUrl) {
  return Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(moduleUrl);
}

/**
 * CLI 経路: run() を argv つきで呼び、戻り値の code を exit code にする。
 * process.exit ではなく exitCode にするのは、パイプ先へ出力を書き切ってから終わるため（code ルール）。
 */
export function runAsCli(run) {
  Promise.resolve(run({ argv: process.argv.slice(2), quiet: false })).then(
    (r) => { process.exitCode = r?.code ?? 0; },
    (e) => { console.error(e?.stack || String(e)); process.exitCode = 1; },
  );
}
