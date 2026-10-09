import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRange } from '../scripts/lib/http-range.mjs';

test('parseRange: 単一範囲', () => {
  assert.deepEqual(parseRange('bytes=0-0', 100), { start: 0, end: 0 });
  assert.deepEqual(parseRange('bytes=10-19', 100), { start: 10, end: 19 });
  assert.deepEqual(parseRange('bytes=99-99', 100), { start: 99, end: 99 });
  assert.deepEqual(parseRange('bytes=90-500', 100), { start: 90, end: 99 });
  assert.deepEqual(parseRange('bytes=0-', 100), { start: 0, end: 99 });
  assert.deepEqual(parseRange('bytes=99-', 100), { start: 99, end: 99 });
});

test('parseRange: 末尾 n バイト', () => {
  assert.deepEqual(parseRange('bytes=-10', 100), { start: 90, end: 99 });
  assert.deepEqual(parseRange('bytes=-500', 100), { start: 0, end: 99 });
  assert.equal(parseRange('bytes=-0', 100), 'unsatisfiable');
});

test('parseRange: 範囲外は unsatisfiable', () => {
  assert.equal(parseRange('bytes=100-', 100), 'unsatisfiable');
  assert.equal(parseRange('bytes=100-200', 100), 'unsatisfiable');
  assert.equal(parseRange('bytes=0-0', 0), 'unsatisfiable');
  assert.equal(parseRange('bytes=-5', 0), 'unsatisfiable');
});

test('parseRange: 不正・対象外は null（範囲なし扱い）', () => {
  for (const h of [undefined, null, '', 'bytes=', 'bytes=-', 'bytes=abc', 'bytes=5-2', 'items=0-1', 'bytes=0-1,5-9', 'bytes=1-2-3', 'bytes=-1-2']) {
    assert.equal(parseRange(h, 100), null, String(h));
  }
});
