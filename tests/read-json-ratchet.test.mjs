/**
 * `readJson` を各スクリプトが個別に定義するのを増やさない（ラチェット）。
 * 以前は 40 を超えるファイルが同名の `readJson` を定義し（壊れたときに場所が出ない・握りつぶす・握りつぶさないが混在）、
 * business-direction.mjs と（退役した）seo-rank-watch.mjs には同名同形の export が 2 つあった。共通部品は scripts/lib/json-io.mjs
 * （`readJson`・`readJsonIf`・`writeJson`・依存ゼロ）と、台帳の id で読む scripts/lib/dataset-io.mjs。
 *
 * 基準値（.claude/config/code-ratchet-baseline.json の readJson）より増えたら落ちる。減ったら pre-commit の tighten-ratchets が下げる（DN-0802）。握りつぶす版（失敗を null や既定値にする）は
 * 意味が違うので、無理に json-io へ寄せない。新しく定義するときは、名前を変える（例: readJsonOrNull）か json-io から import する。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJson as ioReadJson } from '../scripts/lib/json-io.mjs';
import { readJson as directionReadJson } from '../scripts/lib/business-direction.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';
import { CODE_RATCHET_BASELINE, DEFINES_READ_JSON, readJsonDefiners } from '../scripts/lib/code-ratchets.mjs';

const BASELINE = JSON.parse(readFileSync(join(ROOT, CODE_RATCHET_BASELINE), 'utf8')).readJson;
const definers = () => readJsonDefiners(ROOT);

test('readJson を各自定義するファイルは基準値より増えない', () => {
  const found = definers();
  assert.ok(
    found.length <= BASELINE,
    `readJson を定義するファイルが ${found.length} 件（基準 ${BASELINE}）。scripts/lib/json-io.mjs の readJson を import する:\n${found.join('\n')}`,
  );
});

test('business-direction.mjs の readJson は json-io.mjs の再公開（別の実装を持たない）', () => {
  assert.equal(directionReadJson, ioReadJson);
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
