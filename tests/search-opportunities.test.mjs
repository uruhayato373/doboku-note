/**
 * search-opportunities.test.mjs — 検索キーワード戦略の改善候補（11〜30 位をページ単位に束ねる）の境界を固定する
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCluster, cardedPathsFrom } from '../scripts/lib/search-opportunities.mjs';

const S = 'https://doboku-note.com';
const row = (page, query, position, impressions, clicks = 0) => ({ keys: [`${S}${page}`, query], position, impressions, clicks });
const cluster = { id: 'standards', label: '技術図書', queryPattern: '共通仕様書', pagePrefixes: ['/standards/'] };
const striking = { minPosition: 10.5, maxPosition: 30, minImpressions: 3, maxCandidatesPerCluster: 5 };

test('11〜30 位の検索語をページ単位に束ね、表示の少ないページと 1 桁・圏外は候補にしない', () => {
  const rows = [
    row('/standards/okinawa', '沖縄県 共通仕様書', 10.7, 9),
    row('/standards/okinawa', '沖縄県土木工事共通仕様書', 11, 6),
    row('/standards/kinki', '近畿 共通仕様書', 8, 20),      // 1 桁
    row('/standards/tohoku', '東北 共通仕様書', 45, 30),    // 圏外
    row('/standards/hokuriku', '北陸 共通仕様書', 12, 2),   // 表示不足
    row('/docs/old-standards', '九州 共通仕様書', 15, 4),   // 旧 URL
    row('/standards/okinawa', '沖縄 歩掛', 12, 50),         // クラスター外の語
  ];
  const c = summarizeCluster(cluster, rows, striking, { cardedPaths: new Map([['/standards/okinawa', 'DN-9999']]) });
  assert.equal(c.queries, 6);
  assert.equal(c.top10, 1);
  assert.deepEqual(c.candidates.map((p) => p.page), ['/standards/okinawa', '/docs/old-standards']);
  assert.equal(c.candidates[0].impressions, 15);
  assert.equal(c.candidates[0].card, 'DN-9999');
  assert.equal(c.candidates[1].legacyUrl, true);
  assert.equal(c.candidates[1].inTarget, false);
});

test('バックログのカード本文に出るページのパスを、そのカードの ID に対応づける', () => {
  const text = '## 🟡\n### [DN-0001] 沖縄の改善\n対象 `/standards/okinawa/` を直す\n### [DN-0002] 別件\n/exam/rccm/guide/x の件';
  const m = cardedPathsFrom(text);
  assert.equal(m.get('/standards/okinawa'), 'DN-0001');
  assert.equal(m.get('/exam/rccm/guide/x'), 'DN-0002');
});
