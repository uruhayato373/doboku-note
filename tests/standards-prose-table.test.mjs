import { test } from 'node:test';
import assert from 'node:assert/strict';
import { helpers } from '../scripts/lib/standards-structure.mjs';

// DN-0430: 版面の桁揃えで語間に広い空白が入った散文段落を表（コードブロック）と誤判定しない。
const { segmentToBlocks } = helpers;
const seg = (lines) => lines.map((text) => ({ text, page: 1 }));

test('アルカリシリカ反応抑制対策の段落は散文になる', () => {
  const blocks = segmentToBlocks(seg([
    '    受注者は、コンクリートの使用にあたって「アルカリ骨材反応抑制対策について」',
    '  （平成14年7月31日      国官技第112号、国港環第35号、国空建第78号）及び「「アル',
    '  カリ骨材反応抑制対策について」の運用について」（平成14年7月31日               国官技第',
    '  113号、国港環第36号、国空建第79号）を遵守し、アルカリシリカ反応抑制対策の適',
    '  合を確かめなければならない。',
  ]));
  assert.deepEqual(blocks.map((b) => b.type), ['paragraph']);
  assert.equal(blocks[0].lines.length, 5);
});

test('道路標示に関する命令の段落は散文になる', () => {
  const blocks = segmentToBlocks(seg([
    '    受注者は、供用中の公共道路に係る工事の施工にあたっては、交通の安全について、監督職員、道路管理者及び所轄警察署と打合せを行うとともに、「道路標識、区画線',
    '  及び道路標示に関する命令」（令和6年6月             内閣府・国土交通省令第4号）、「道路',
    '  工事現場における標示施設等の設置基準」（昭和37年8月30日            建設省道路局長通',
    '  知）、「道路工事現場における標示施設等の設置基準等の一部改正について」（平成',
    '  18年3月31日 国道利第37号、国道国防第205号）、「道路工事現場における工事情報',
    '  看板及び工事説明看板の設置について」（平成18年3月31日           国道利第38号、国道国',
    '  防第206号）及び「道路工事保安施設設置基準（案）」（令和6年2月           国土交通省道',
    '  路局国道・技術課）に基づき、安全対策を講じなければならない。',
  ]));
  assert.deepEqual(blocks.map((b) => b.type), ['paragraph']);
});

test('2列組の一覧（句点で終わらない）は表のまま', () => {
  const blocks = segmentToBlocks(seg([
    '  日本道路協会        道路橋示方書・同解説',
    '  日本道路協会        舗装調査・試験法便覧',
    '  土木学会            コンクリート標準示方書',
  ]));
  assert.deepEqual(blocks.map((b) => b.type), ['table']);
});

test('多列の表の行は句点で終わっても表のまま', () => {
  const blocks = segmentToBlocks(seg([
    '  項目      規格値      備考',
    '  厚さ      ±10mm      平均値とする。',
  ]));
  assert.deepEqual(blocks.map((b) => b.type), ['table']);
});
