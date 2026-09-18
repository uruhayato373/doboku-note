import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTargetPath, parseLegacyRedirects } from '../scripts/lib/legacy-routes.mjs';

const redirects = [
  '# comment',
  '/docs/pe-comprehensive-management-alarp-principle /exam/pe-comprehensive-management/keywords/alarp-principle 301',
  '/docs/civil-construction-1-guide-textbooks   /exam/civil-construction-1/guide/study-method 301',
  '/category/foo /exam/foo 301',
].join('\r\n');
const map = parseLegacyRedirects(redirects);

test('_redirects から /docs 系の静的 301 だけを Map にする', () => {
  assert.equal(map.size, 2);
  assert.equal(map.get('/docs/civil-construction-1-guide-textbooks'), '/exam/civil-construction-1/guide/study-method');
});

test('旧 /docs パス・裸の slug・絶対 URL を正規パスにそろえる', () => {
  const want = '/exam/pe-comprehensive-management/keywords/alarp-principle';
  assert.equal(normalizeTargetPath('/docs/pe-comprehensive-management-alarp-principle', map), want);
  assert.equal(normalizeTargetPath('pe-comprehensive-management-alarp-principle', map), want);
  assert.equal(normalizeTargetPath('https://doboku-note.com/docs/pe-comprehensive-management-alarp-principle/', map), want);
  assert.equal(normalizeTargetPath(`https://doboku-note.com${want}?utm=x#h2`, map), want);
});

test('正規パスはそのまま、転送先の無い旧 /docs は捨てずに返す、空は null', () => {
  assert.equal(normalizeTargetPath('/standards/kyushu/common', map), '/standards/kyushu/common');
  assert.equal(normalizeTargetPath('/docs/unknown-slug', map), '/docs/unknown-slug');
  assert.equal(normalizeTargetPath('   ', map), null);
});

test('Git Bash（MSYS）が書き換えた "C:/Program Files/Git/exam/..." を元のパスに戻す', () => {
  assert.equal(normalizeTargetPath('C:/Program Files/Git/exam/civil-construction-1/guide/vs-pe', map), '/exam/civil-construction-1/guide/vs-pe');
  assert.equal(normalizeTargetPath('C:/Program Files/Git/docs/pe-comprehensive-management-alarp-principle', map), '/exam/pe-comprehensive-management/keywords/alarp-principle');
});
