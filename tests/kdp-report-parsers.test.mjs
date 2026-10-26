import test from 'node:test';
import assert from 'node:assert/strict';
import { parseKdpMarketplaces, parseKdpKenpTotal, kdpScope, mergeKdpBookRows } from '../scripts/lib/kdp-report-parsers.mjs';
import { assessKdpReport } from '../scripts/check-kdp-report-freshness.mjs';

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

test('同じ bookId の 2 行（片方は全項目 0）を 1 行に合算し、受取額は変えず、他サイトの本（bookId null）は合算しない', () => {
  const row = (bookId, title, ebook, kenp) => ({ bookId, title, ebook, print: 0, kenp, royalty: ebook + kenp });
  const raw = [row('e-01', 'E', 627, 426), row('a-01', 'A', 10, 0), row('e-01', 'E', 0, 0), row(null, 'X', 5, 0), row(null, 'Y', 0, 0)];
  const merged = mergeKdpBookRows(raw);
  assert.deepEqual(merged.map((b) => b.title), ['E', 'A', 'X', 'Y']);
  assert.deepEqual(merged[0], { bookId: 'e-01', title: 'E', ebook: 627, print: 0, kenp: 426, royalty: 1053 });
  assert.equal(merged.reduce((s, b) => s + b.royalty, 0), raw.reduce((s, b) => s + b.royalty, 0));
  assert.equal(raw[0].royalty, 1053, '入力の行は書き換えない');
  assert.equal(kdpScope(merged, 5, ['e-01', 'a-01']).dobokuRoyalty, 1063);
});

test('重複した bookId が台帳に入ると kdp-report-freshness は FAIL し、合算後は通る', () => {
  const book = (bookId, royalty) => ({ bookId, title: bookId, ebook: royalty, print: 0, kenp: 0, royalty });
  const month = (books) => ({ range: { start: '2026-09-01', end: '2026-09-30' }, estimated: false, total: { bookCount: 3, royalty: 100 }, books });
  const now = new Date('2026-10-26T00:00:00+09:00');
  const dup = assessKdpReport({ months: { '2026-09': month([book('e-01', 100), book('e-01', 0), book(null, 0)]) } }, now, ['e-01']);
  assert.equal(dup.status, 'FAIL');
  assert.match(dup.reason, /bookIdが重複（e-01）/);
  const ok = assessKdpReport({ months: { '2026-09': month(mergeKdpBookRows([book('e-01', 100), book('e-01', 0), book(null, 0)])) } }, now, ['e-01']);
  assert.equal(ok.status, 'OK');
});
