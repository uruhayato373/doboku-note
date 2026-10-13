// cli-run — 検査 script を「CLI としても、別モジュールから run() でも」呼べるようにする共通部品（DN-0236）。
//
// session-start.mjs は SessionStart の検査を 1 プロセス内で順次 import して run({ quiet: true }) を呼ぶ。
// そのため各 script の run() は process.exit を呼ばず、出力を console へ直接書かずにこの sink へ書き、
// { code, stdout, stderr } を返す。CLI 経路（node で直接起動）は quiet=false でそのまま console へ流す。

import { format } from 'node:util';
import { realpathSync } from 'node:fs';
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

/**
 * この module が `node <file>` で直接起動されたか（import されただけなら false）。
 * import.meta.url は realpath 済みなので、argv[1] も realpath で比べる（macOS の /var → /private/var のように
 * シンボリックリンク越しに起動すると文字列比較では一致せず、CLI が何も実行せず exit 0 になる）
 */
export function isCliEntry(moduleUrl) {
  if (!process.argv[1]) return false;
  const self = fileURLToPath(moduleUrl);
  if (resolve(process.argv[1]) === self) return true;
  try {
    return realpathSync(process.argv[1]) === realpathSync(self);
  } catch {
    return false;
  }
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

/**
 * process.exit の代わりに投げる合図。run() の外へは出さず runBody が exit code に変える。
 * （in-process で呼ばれる検査が process.exit を呼ぶと、呼び出し元のプロセスごと終わってしまう）
 */
export class ExitSignal extends Error {
  constructor(code) {
    super(`exit ${code}`);
    this.code = code;
  }
}

/**
 * 「ファイルの先頭から書いてある検査」を run() にするための枠（DN-0688）。
 * body には { argv, exit, status } を渡す。
 *   argv    process.argv と同じ形（['node', このファイル, ...引数]）。`process.argv` の読み替え先
 *   exit(c) process.exit(c) の読み替え先。ExitSignal を投げ、ここで { code } に変える
 *   status  process.exitCode = n の読み替え先（status.code = n）。exit() に値が無いとこの値で終わる
 * 戻り値は { code }。CLI で起動したときは runAsCli が exitCode に入れるので、終了コードは従来と同じ。
 */
export async function runBody(argv, moduleUrl, body) {
  const status = { code: 0 };
  const exit = (c) => {
    throw new ExitSignal(c ?? status.code);
  };
  try {
    await body({ argv: ['node', fileURLToPath(moduleUrl), ...argv], exit, status });
  } catch (e) {
    if (e instanceof ExitSignal) return { code: e.code };
    throw e;
  }
  return { code: status.code };
}

/** main() の途中で exit code を決めて抜ける（process.exit の代わり）。runMain が { code } に変える */
export function exitWith(code) {
  throw new ExitSignal(code ?? 0);
}

/** 既存の main(argv) を run() にする。main が exitWith で抜ければその code、数値を返せばその値、何も返さなければ 0 */
export async function runMain(main, argv) {
  try {
    const r = await main(argv);
    return { code: typeof r === 'number' ? r : 0 };
  } catch (e) {
    if (e instanceof ExitSignal) return { code: e.code };
    throw e;
  }
}
