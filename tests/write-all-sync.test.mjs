/**
 * writeAllSync: パイプ越しの長い出力が途中で切れないことを固定する。
 * writeSync(1, 長い文字列) は戻り値を見ないとパイプで途中まで書いて残りを捨て、
 * check-bold-rendering --json を読む fix-bold-rendering が JSON.parse で落ちていた（2026-09-23）。
 */
import { strict as assert } from 'node:assert';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const LIB = join(dirname(fileURLToPath(import.meta.url)), '../scripts/lib/write-all-sync.mjs');

test('パイプへ 400KB の JSON を書いても最後まで届き、parse できる', () => {
  const code = `import { writeAllSync } from ${JSON.stringify(LIB)};
// process.stdout に触れると libuv がパイプを非ブロッキングにする（実スクリプトは import 経由で触れる）。
// 触れないと writeSync でも書き切れてしまい、このテストは旧実装でも通ってしまう。
void process.stdout;
const items = Array.from({ length: 4000 }, (_, i) => ({ i, text: '日本語の本文'.repeat(8) }));
writeAllSync(1, JSON.stringify({ items }) + '\\n');
process.exit(0);`;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', maxBuffer: 64 << 20 });
  assert.ok(Buffer.byteLength(out) > 400_000);
  assert.equal(JSON.parse(out).items.length, 4000);
});
