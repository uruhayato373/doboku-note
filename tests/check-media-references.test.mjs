import test from 'node:test';
import assert from 'node:assert/strict';
import { missingMedia } from '../scripts/check-media-references.mjs';

const path = '.tmp/media/a/b/work/cover.1234abcd.png';
test('文書が指す素材が台帳に無ければ返す', () => {
  const r = missingMedia([{ file: 'x.json', text: `{"path":"${path}"}` }], {});
  assert.equal(r.checked, 1);
  assert.deepEqual(r.missing, [{ file: 'x.json', path }]);
});
test('台帳にある素材は欠けにしない', () => {
  assert.deepEqual(missingMedia([{ file: 'x.json', text: path }], { [path]: {} }).missing, []);
});
