import test from 'node:test';
import assert from 'node:assert/strict';
import { examPalette, loadImageRules, routeViolations, usesDiagramLed } from '../scripts/lib/image-rules.mjs';

const routes = [{ id: 'a', entry: 'a.mjs' }];
const codex = "import { generateWithCodex } from './lib/codex-image.mjs';";

test('登録された経路の Codex は通る', () => {
  const { callers, errors } = routeViolations(['a.mjs'], () => codex, routes, () => true);
  assert.equal(callers, 1);
  assert.deepEqual(errors, []);
});

test('台帳に無い経路の Codex は止める', () => {
  assert.match(routeViolations(['b.mjs'], () => codex, routes, () => true).errors.join(), /routes に無い/);
});

test('先生の特徴をコードへ書くと止める', () => {
  assert.match(routeViolations(['b.mjs'], () => '先生は黒縁眼鏡', routes, () => true).errors.join(), /先生の特徴/);
});

test('入口が消えた経路は止める', () => {
  assert.match(routeViolations([], () => '', routes, () => false).errors.join(), /入口が無い/);
});

test('資格の色はトークンから引き、未知の資格は推測しない', () => {
  assert.match(examPalette('concrete-engineer'), /#168080/);
  assert.throws(() => examPalette('unknown-exam'), /資格の色が無い/);
});

test('図解主体の資格は設定で分かれる', () => {
  assert.equal(usesDiagramLed('civil-construction-2'), true);
  assert.equal(usesDiagramLed('concrete-engineer'), false);
  assert.ok(loadImageRules().routes.some((route) => route.id === 'shorts'));
});

test('routeViolations: codex-image.mjs を通さない codex の直接起動を止める（DN-1015）', () => {
  const routes = [{ id: 'a', entry: 'a.mjs' }];
  for (const text of [
    "spawn('codex', ['exec'])",
    'execFileSync("codex", args)',
    'execSync(`codex exec --json ${p}`)',
    "spawnSync('codex.cmd', [])",
  ]) {
    assert.match(routeViolations(['a.mjs'], () => text, routes, () => true).errors.join(), /直接起動/, text);
  }
  assert.equal(routeViolations(['a.mjs'], () => "spawn('codexer', [])", routes, () => true).errors.length, 0, '別名は止めない');
});
