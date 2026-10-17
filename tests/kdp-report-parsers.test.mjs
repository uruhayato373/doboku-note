import test from 'node:test';
import assert from 'node:assert/strict';
import { parseKdpMarketplaces, parseKdpKenpTotal, kdpScope } from '../scripts/lib/kdp-report-parsers.mjs';

test('確定KENPの専用画面で集計と全80冊の合計を照合する', () => {
  assert.equal(parseKdpKenpTotal('既読ページ数\n6,870\n80 冊の本すべて\n日付\n80 冊の本すべて\n6,870', 80), 6870);
  assert.throws(() => parseKdpKenpTotal('既読ページ数\n6870\n80 冊の本すべて\n2,245', 80), /照合できない/);
  assert.throws(() => parseKdpKenpTotal('既読ページ数\n6870', 80), /照合できない/);
});

test('確定PMRのKENP金額2245.00円を224500ページに変換しない', () => {
  const result = parseKdpMarketplaces('\t日本\tJPY\t7,742.00\t0.00\t0.00\t2,245.00\t9,987.00\t\n\tアメリカ\tUSD\t0.00\t0.00\t0.00\t0.00\t0.00\t');
  assert.equal(result.scanned, 2);
  assert.deepEqual(result.rows, [{ marketplace: '日本', currency: 'JPY', ebook: 7742, paperback: 0, hardcover: 0, kenpPages: null, kenpRoyalty: 2245, royalty: 9987 }]);
});

test('未確定PMRの既読KENP表記だけをページとして読み、未知の列はゼロにしない', () => {
  assert.equal(parseKdpMarketplaces('\t日本\tJPY\t7742\t0\t0\t6,870 既読 KENP\t-').rows[0].kenpPages, 6870);
  assert.equal(parseKdpMarketplaces('\t日本\tJPY\t-\t0\t0\t未知\t-').scanned, 0);
  assert.equal(parseKdpMarketplaces('読めない').scanned, 0);
});

test('対象外の停止済み2冊があっても公開46冊の母数を超えて数えない', () => {
  const expected = ['a', 'b'];
  const result = kdpScope([{ bookId: 'a', royalty: 10 }, { bookId: 'b', royalty: 20 }, { bookId: 'old', royalty: 30 }, { bookId: null, royalty: 40 }], 4, expected);
  assert.equal(result.matchedDobokuBooks, 2);
  assert.equal(result.expectedDobokuBooks, 2);
  assert.equal(result.dobokuRoyalty, 30);
  assert.deepEqual(result.missingDobokuBookIds, []);
});
