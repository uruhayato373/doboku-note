import test from 'node:test';
import assert from 'node:assert/strict';
import { findDuplicateKeys } from '../scripts/lib/json-duplicate-keys.mjs';

test('findDuplicateKeys: 同じオブジェクトの重複キーを行番号つきで返す', () => {
  assert.deepEqual(findDuplicateKeys('{\n  "a": 1,\n  "a": 2\n}'), [{ key: 'a', line: 3 }]);
  assert.deepEqual(findDuplicateKeys('{"x": {"phase": "a", "b": 1, "phase": "c"}}'), [{ key: 'phase', line: 1 }]);
});

test('findDuplicateKeys: 別のオブジェクト・配列の要素・値の文字列・エスケープは重複にしない', () => {
  assert.deepEqual(findDuplicateKeys('{"a": {"k": 1}, "b": {"k": 2}}'), []);
  assert.deepEqual(findDuplicateKeys('[{"k": 1}, {"k": 2}]'), []);
  assert.deepEqual(findDuplicateKeys('{"a": "a", "b": ["a", "a"]}'), []);
  assert.deepEqual(findDuplicateKeys('{"a\\"b": 1, "c": "x\\\\", "d": "{\\"a\\"b\\": 1}"}'), []);
});
