/**
 * `readJson` を各スクリプトが個別に定義するのを増やさない（ラチェット）。
 * 以前は 40 を超えるファイルが同名の `readJson` を定義し（壊れたときに場所が出ない・握りつぶす・握りつぶさないが混在）、
 * business-direction.mjs と seo-rank-watch.mjs には同名同形の export が 2 つあった。共通部品は scripts/lib/json-io.mjs
 * （`readJson`・`readJsonIf`・`writeJson`・依存ゼロ）と、台帳の id で読む scripts/lib/dataset-io.mjs。
 *
 * 基準値より増えたら落ちる。減らしたときは基準値を下げる（上げない）。握りつぶす版（失敗を null や既定値にする）は
 * 意味が違うので、無理に json-io へ寄せない。新しく定義するときは、名前を変える（例: readJsonOrNull）か json-io から import する。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson as ioReadJson } from '../scripts/lib/json-io.mjs';
import { readJson as directionReadJson } from '../scripts/lib/business-direction.mjs';
import { readJson as watchReadJson } from '../scripts/lib/seo-rank-watch.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 今の数（scripts・.claude・tools の本番コード。tests は数えない）。減らしたら下げる */
const BASELINE = 29;

/** `const readJson =`・`function readJson(` の定義（再公開 `export { readJson }` と import は数えない） */
const DEFINES_READ_JSON = /^[ \t]*(?:export\s+)?(?:(?:const|let|var)\s+readJson\s*=|(?:async\s+)?function\s+readJson\s*\()/m;

function definers() {
  const files = execFileSync('git', ['ls-files', '-z', '--', 'scripts', '.claude', 'tools'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 })
    .split('\0')
    .filter((f) => /\.(mjs|cjs|js|mts|ts|tsx)$/.test(f) && !f.includes('node_modules'));
  assert.ok(files.length > 500, `走査したコード ${files.length} ファイル（検査不成立）`);
  return files.filter((f) => DEFINES_READ_JSON.test(readFileSync(join(ROOT, f), 'utf8')));
}

test('readJson を各自定義するファイルは基準値より増えない', () => {
  const found = definers();
  assert.ok(
    found.length <= BASELINE,
    `readJson を定義するファイルが ${found.length} 件（基準 ${BASELINE}）。scripts/lib/json-io.mjs の readJson を import する:\n${found.join('\n')}`,
  );
});

test('基準値は今の数のまま（減らしたら BASELINE を下げる＝ラチェットを締める）', () => {
  assert.equal(definers().length, BASELINE);
});

test('business-direction.mjs・seo-rank-watch.mjs の readJson は json-io.mjs の再公開（別の実装を持たない）', () => {
  assert.equal(directionReadJson, ioReadJson);
  assert.equal(watchReadJson, ioReadJson);
});

test('検出の型: 定義は数え、import と再公開は数えない', () => {
  assert.ok(DEFINES_READ_JSON.test('const readJson = (p) => JSON.parse(p);'));
  assert.ok(DEFINES_READ_JSON.test('  const readJson = (root, rel) => {};'));
  assert.ok(DEFINES_READ_JSON.test('export const readJson = (a) => a;'));
  assert.ok(DEFINES_READ_JSON.test('function readJson(path) {'));
  assert.ok(DEFINES_READ_JSON.test('async function readJson(path) {'));
  assert.ok(DEFINES_READ_JSON.test('function readJson(path: string) {'));
  assert.equal(DEFINES_READ_JSON.test("import { readJson } from './json-io.mjs';"), false);
  assert.equal(DEFINES_READ_JSON.test('export { readJson };'), false);
  assert.equal(DEFINES_READ_JSON.test('function readJsonOrReport(root, path) {'), false);
  assert.equal(DEFINES_READ_JSON.test('const readJsonAt = (root, p) => p;'), false);
});
