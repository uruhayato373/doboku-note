/**
 * write-all-sync.mjs — 標準出力などの fd へ、文字列を最後まで同期で書き切る。
 *
 * `writeSync(1, 長い文字列)` は、出力先がパイプだと一度に書けた分のバイト数を返すだけで
 * 残りを捨てる（非ブロッキングのパイプでは EAGAIN も投げる）。戻り値を見ないと、
 * `--json` の出力が途中で切れて受け側の JSON.parse が落ちる。
 * 2026-09-23 に check-bold-rendering --json（149 件・約 70KB）を fix-bold-rendering が
 * 読んだところ、4KB 付近で切れて修正ツールが起動しなかった。
 */
import { writeSync } from 'node:fs';

export function writeAllSync(fd, text) {
  const buf = Buffer.from(text, 'utf8');
  let offset = 0;
  while (offset < buf.length) {
    try {
      offset += writeSync(fd, buf, offset, buf.length - offset);
    } catch (e) {
      // 受け側が読み進めるまで待つ（非ブロッキングのパイプ）
      if (e.code === 'EAGAIN') continue;
      throw e;
    }
  }
}
