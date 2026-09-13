import test from 'node:test';
import assert from 'node:assert/strict';
import { applyReadingDict } from '../.claude/scripts/lib/sns-common/reading-dict.mjs';
test('technical narration distinguishes aggregate and water conditions', () => {
  assert.equal(applyReadingDict('粗骨材・細骨材・骨材：絶乾、気乾、表乾、表面乾燥飽水'), 'そこつざい・さいこつざい・こつざい：ぜっかん、きかん、ひょうかん、ひょうめんかんそうほうすい');
});
test('leveling and calculation readings preserve ordinary text and symbols', () => {
  assert.equal(applyReadingDict('野帳で後視−前視。標尺と視準線。導関数 f′(x) を確認'), 'やちょうでこうし−ぜんし。ひょうしゃくとしじゅんせん。どうかんすう f′(x) を確認');
});
