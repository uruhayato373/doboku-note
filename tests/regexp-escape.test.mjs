import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeRegExp } from '../scripts/lib/regexp-escape.mjs';

const META = '.*+?^${}()|[]\\';

test('正規表現の特殊文字をすべて逃がす（CodeQL: Incomplete string escaping）', () => {
  for (const ch of META) {
    const re = new RegExp(`^${escapeRegExp(ch)}$`);
    assert.ok(re.test(ch), `${ch} がリテラルとして一致しない`);
  }
  const all = new RegExp(`^${escapeRegExp(META)}$`);
  assert.ok(all.test(META));
});

test('逃がした文字列は元の文字列だけに一致する（. が任意の 1 文字にならない・\\ が連鎖しない）', () => {
  assert.equal(new RegExp(`^${escapeRegExp('a.b')}$`).test('axb'), false);
  assert.equal(new RegExp(`^${escapeRegExp('a\\')}$`).test('a\\'), true);
  assert.equal(new RegExp(`^${escapeRegExp('(x|y)+')}$`).test('x'), false);
  assert.equal(escapeRegExp('abc-/@ 日本語'), 'abc-/@ 日本語');
});

test('u フラグ付きの正規表現でも使える（- と / は逃がさない）', () => {
  assert.doesNotThrow(() => new RegExp(escapeRegExp('a-b/c.d'), 'u'));
  assert.equal(escapeRegExp(12.5), '12\\.5');
});
