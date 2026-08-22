// tests/image-audit.test.mjs
// 画像アセット判定 純ロジックの回帰テスト。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  extOf, classifyBySize, isDangerousName, diffBaseline, buildBaseline,
} from '../.claude/scripts/lib/image-audit.mjs';

const MAX = { svg: 10240, png: 102400, jpg: 204800, webp: 153600 };

test('extOf は小文字拡張子を返す', () => {
  assert.equal(extOf('a/b/C.PNG'), 'png');
  assert.equal(extOf('x.webp'), 'webp');
  assert.equal(extOf('noext'), '');
});

test('classifyBySize: 上限超過を over:true に', () => {
  const c = classifyBySize('a/img/x.png', 200000, MAX);
  assert.equal(c.over, true);
  assert.equal(c.limit, 102400);
});

test('classifyBySize: 上限内は over:false', () => {
  assert.equal(classifyBySize('a/img/x.png', 50000, MAX).over, false);
});

test('classifyBySize: 未知拡張子は対象外 null', () => {
  assert.equal(classifyBySize('a/x.pdf', 999999, MAX), null);
});

test('isDangerousName: 大文字は許容（過去問クロップ q-I3-3.webp）', () => {
  const pat = '^[A-Za-z0-9][A-Za-z0-9._-]*$';
  assert.equal(isDangerousName('a/img/q-I3-3.webp', pat), false);
});

test('isDangerousName: 空白・非ASCII を危険と判定', () => {
  const pat = '^[A-Za-z0-9][A-Za-z0-9._-]*$';
  assert.equal(isDangerousName('a/img/my photo.png', pat), true);
  assert.equal(isDangerousName('a/img/図版.png', pat), true);
});

test('diffBaseline: baseline に無いものは fresh', () => {
  const over = [{ relPath: 'x.png', bytes: 200000 }, { relPath: 'y.png', bytes: 300000 }];
  const { fresh, grew } = diffBaseline(over, { 'y.png': 300000 });
  assert.deepEqual(fresh.map((f) => f.relPath), ['x.png']);
  assert.equal(grew.length, 0);
});

test('diffBaseline: 記録から増えたら grew', () => {
  const over = [{ relPath: 'y.png', bytes: 320000 }];
  const { fresh, grew } = diffBaseline(over, { 'y.png': 300000 });
  assert.equal(fresh.length, 0);
  assert.equal(grew.length, 1);
  assert.equal(grew[0].was, 300000);
});

test('buildBaseline: relPath→bytes を昇順で構築', () => {
  const b = buildBaseline([{ relPath: 'b.png', bytes: 2 }, { relPath: 'a.png', bytes: 1 }]);
  assert.deepEqual(Object.keys(b), ['a.png', 'b.png']);
  assert.equal(b['a.png'], 1);
});
