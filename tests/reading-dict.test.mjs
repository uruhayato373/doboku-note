import test from 'node:test';
import assert from 'node:assert/strict';
import { applyReadingDict } from '../.claude/scripts/lib/sns-common/reading-dict.mjs';
test('technical narration distinguishes aggregate and water conditions', () => {
  assert.equal(applyReadingDict('粗骨材・細骨材・骨材：絶乾、気乾、表乾、表面乾燥飽水'), 'そこつざい・さいこつざい・こつざい：ぜっかん、きかん、ひょうかん、ひょうめんかんそうほうすい');
});
test('leveling and calculation readings preserve ordinary text and symbols', () => {
  assert.equal(applyReadingDict('野帳で後視−前視。標尺と視準線。導関数 f′(x) を確認'), 'やちょうでこうし−ぜんし。ひょうしゃくとしじゅんせん。どうかんすう f′(x) を確認');
});

test('試験の区分と年度を読める形にする', () => {
  assert.equal(applyReadingDict('II-1の32問'), 'にのいちの32問');
  assert.equal(applyReadingDict('R04のI-1とIII-2-1、必須科目I、Ⅲ'), 'れいわよんのいちのいちとさんのにのいち、必須科目いち、さん');
  assert.equal(applyReadingDict('健全性IVとIV-1'), '健全性よんとよんのいち');
  assert.equal(applyReadingDict('Ⅲ-13では'), 'さんの13では');
  assert.equal(applyReadingDict('IT と ICT、CO2、R10、抵抗R1の電流I'), 'あいてぃー と あいしーてぃー、CO2、R10、抵抗R1の電流I');
});
