import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isTransientReadError } from '../scripts/lib/transient-read-error.mjs';

test('Drive のマウントの一時的な読み出し失敗だけを読み直しの対象にする', () => {
  // 2026-10-11 の週次で実際に出た形（Node が darwin の -11 を名前に引けない）
  assert.equal(isTransientReadError({ errno: -11, code: 'Unknown system error -11' }), true);
  assert.equal(isTransientReadError({ code: 'ETIMEDOUT' }), true);
  assert.equal(isTransientReadError({ code: 'EDEADLK' }), true);
  // 無い・権限が無いは、待っても直らない
  assert.equal(isTransientReadError({ code: 'ENOENT', errno: -2 }), false);
  assert.equal(isTransientReadError({ code: 'EACCES', errno: -13 }), false);
  assert.equal(isTransientReadError(undefined), false);
});
