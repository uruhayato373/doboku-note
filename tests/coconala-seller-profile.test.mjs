import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRatingCount } from '../scripts/coconala-seller-profile.mjs';

test('parseRatingCount: 公開プロフィールの説明文の「評価: N件」を読み、無ければ null', () => {
  assert.equal(parseRatingCount('<meta name="description" content="元自治体土木の発注者視点で | 評価: 4件">'), 4);
  assert.equal(parseRatingCount('評価: 1,024件'), 1024);
  assert.equal(parseRatingCount('<html>評価はまだありません</html>'), null);
});
