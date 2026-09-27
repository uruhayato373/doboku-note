// tests/qualification-market.test.mjs
//
// 展開の判断材料（scripts/lib/qualification-market.mjs）: 混み具合の数え方・売上の資格への写し・
// 設定と追跡リストの整合検査・1 行への組み立て。実データが整合していることも固定する。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildMarketView,
  coconalaMetrics,
  densityOf,
  noteMetrics,
  salesByQualification,
  validateMarketInputs,
  youtubeMetrics,
} from '../scripts/lib/qualification-market.mjs';
import { loadMarketInputs } from '../scripts/lib/market-inputs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const bands = { low: 1, mid: 3, high: 6 };

test('実データ: 検索語・追跡リスト・売上の分類が正本と整合している', () => {
  assert.deepEqual(validateMarketInputs(loadMarketInputs(ROOT)), []);
});

test('実データ: 全資格を 1 行ずつ組み立てられる', () => {
  const input = loadMarketInputs(ROOT);
  const view = buildMarketView({ ...input, today: '2026-09-26' });
  assert.equal(view.rows.length, input.registry.qualifications.length);
});

test('densityOf: 強い売り手の数を 無/少/中/多 に分け、数が無ければ未測定', () => {
  assert.equal(densityOf(0, bands), 'none');
  assert.equal(densityOf(1, bands), 'low');
  assert.equal(densityOf(3, bands), 'mid');
  assert.equal(densityOf(6, bands), 'high');
  assert.equal(densityOf(undefined, bands), null);
});

test('youtubeMetrics: 動画の重複を除き、再生数が閾値以上のチャンネルを数える', () => {
  const m = youtubeMetrics(
    [
      { videoId: 'v1', channel: 'A', channelId: 'a', views: 50000 },
      { videoId: 'v1', channel: 'A', channelId: 'a', views: 50000 },
      { videoId: 'v2', channel: 'A', channelId: 'a', views: 100 },
      { videoId: 'v3', channel: 'B', channelId: 'b', views: 9999 },
      { videoId: 'v4', channel: 'C', channelId: 'c', views: 10000 },
    ],
    10000,
  );
  assert.equal(m.results, 4);
  assert.equal(m.channels, 3);
  assert.equal(m.strong, 2);
  assert.equal(m.top[0].name, 'A');
});

test('noteMetrics: 有料記事を出している作者の数と価格の中央値', () => {
  const m = noteMetrics(
    [
      { key: 'n1', creator: 'x', price: 500, likes: 3 },
      { key: 'n2', creator: 'x', price: 1500, likes: 1 },
      { key: 'n3', creator: 'y', price: 0, likes: 9 },
      { key: 'n3', creator: 'y', price: 0, likes: 9 },
      { key: 'n4', creator: 'z', price: 980, likes: 0 },
    ],
    [120, 80],
  );
  assert.equal(m.results, 4);
  assert.equal(m.strong, 2);
  assert.equal(m.medianPrice, 980);
  assert.equal(m.total, 120);
});

test('coconalaMetrics: 評価件数が閾値以上のサービスを数える', () => {
  const m = coconalaMetrics(
    [
      { url: 'u1', seller: 's1', reviews: 800, priceYen: 12000 },
      { url: 'u1', seller: 's1', reviews: 800, priceYen: 12000 },
      { url: 'u2', seller: 's2', reviews: 9, priceYen: 3000 },
      { url: 'u3', seller: 's3', reviews: 10, priceYen: 5000 },
    ],
    10,
    [42],
  );
  assert.equal(m.results, 3);
  assert.equal(m.strong, 2);
  assert.equal(m.top[0].name, 's1');
  assert.equal(m.medianPrice, 5000);
});

const lineupConfig = {
  rules: { note: [{ match: '^civil-1-', cells: ['q1:second'] }], coconala: [{ match: '^coconala-', cells: ['q1:second'] }] },
  salesRules: [{ match: '^bk-', cells: ['q2:written'] }, { match: '^both-', cells: ['q1:second', 'q2:written'] }],
};

test('salesByQualification: 接頭辞を外して写し、複数マスは等分・ココナラ受注も足す', () => {
  const s = salesByQualification({
    lineupConfig,
    sales: [
      { date: '2026-07-01', productId: 'article:civil-1-x', price: 1000 },
      { date: '2026-07-02', productId: 'bk-road', price: 3000 },
      { date: '2026-08-01', productId: 'both-pack', price: 2000 },
    ],
    orders: [{ date: '2026-09-01', serviceId: 'coconala-tensaku', priceYen: 5000 }],
  });
  assert.equal(s.q1.total, 7000);
  assert.equal(s.q2.total, 4000);
  assert.deepEqual(s.q1.byMonth, { '2026-07': 1000, '2026-08': 1000, '2026-09': 5000 });
  assert.equal(s.q2.byStage.written, 4000);
});

const registry = {
  qualifications: [
    { id: 'q1', label: 'Q1', family: 'f', portfolio: 'active' },
    { id: 'q2', label: 'Q2', family: 'f', portfolio: 'candidate' },
    { id: 'q3', label: 'Q3', family: 'f', portfolio: 'declined' },
  ],
};
const scanConfig = {
  results: { youtube: 20, note: 20 },
  density: { bands, youtube: { strongViews: 10000 }, coconala: { strongReviews: 10 } },
  queries: {
    q1: { keywords: ['q1 経験記述'], titleMatch: 'Q1|q1', coconala: ['q1'] },
    q2: { keywords: ['q2 論文'], titleMatch: 'Q2', coconala: ['q2'] },
  },
};

test('validateMarketInputs: 未登録の資格・検索語の欠け・未知の exams・分類できない売上を検出する', () => {
  const errors = validateMarketInputs({
    registry,
    scanConfig: { ...scanConfig, queries: { q1: { ...scanConfig.queries.q1, titleMatch: '(' }, zz: { keywords: [], titleMatch: 'x', coconala: ['x'] } } },
    competitors: { note: [{ handle: 'h', exams: ['q1', 'nope'] }, { handle: 'h', exams: [] }] },
    lineupConfig,
    sales: [{ productId: 'unknown-1' }],
    orders: [{ serviceId: 'svc-x' }],
  });
  for (const needle of [
    'zz は qualification-registry に無い',
    'zz.keywords は空でない文字列の配列',
    'q1.titleMatch は正規表現の文字列',
    'q2 の検索語が無い',
    'exams の nope は qualification-registry に無い',
    'handle が重複',
    'exams（資格 id の配列）が必要',
    '売上 unknown-1 が資格へ分類できない',
    'ココナラ受注 svc-x が資格へ分類できない',
  ]) {
    assert.ok(errors.some((e) => e.includes(needle)), `${needle}\n${errors.join('\n')}`);
  }
  // 見送り（q3）には検索語が要らない
  assert.ok(!errors.some((e) => e.includes('q3')));
});

test('buildMarketView: 自分で書く区分の受験者数・買われる時期・混み具合・未取得の要対応', () => {
  const view = buildMarketView({
    registry,
    formats: {
      formatTypes: {},
      exams: {
        q1: { stages: [{ key: 'first', label: '一次', types: ['mcq'] }, { key: 'second', label: '二次', types: ['experience', 'written'] }] },
        q2: { stages: [{ key: 'written', label: '筆記', types: ['essay'] }] },
      },
    },
    examStats: { exams: { q1: { latest: { stages: { first: { examinees: 40000 }, second: { examinees: 20000 } } } }, q2: { latest: { examinees: 3000 } } } },
    calendar: {
      exams: {
        q1: { events: { first: { kind: 'exam', date: '2026-07-05' }, second: { kind: 'exam', date: '2026-10-04' } } },
        q2: { events: { exam: { kind: 'exam', date: '2026-11-29' } } },
      },
    },
    lineupConfig,
    sales: [{ date: '2026-08-01', productId: 'civil-1-pack', price: 9800 }],
    orders: [],
    competitors: { youtube: [{ handle: 'c1', label: 'Ch1', exams: ['q1'] }], x: [], ig: [], note: [], coconala: [] },
    scanConfig,
    snapshot: {
      youtube: {
        'q1 経験記述': {
          fetchedAt: '2026-09-26T00:00:00Z',
          items: [
            { videoId: 'v', title: '１級Ｑ１ 経験記述', channel: 'A', channelId: 'a', views: 20000 },
            { videoId: 'w', title: '無関係の討論番組', channel: 'Big', channelId: 'big', views: 1000000 },
          ],
        },
      },
      note: { 'q1 経験記述': { fetchedAt: '2026-09-26T00:00:00Z', total: 5, items: [] } },
    },
    coconalaResearch: {
      queries: [
        { keyword: 'q1', complete: true, totalHits: 3, services: [] },
        // 汎用の語で取れたサービスもタイトル条件で資格へ振り分ける
        { keyword: '経験記述 添削', complete: true, totalHits: 9, services: [{ url: 'u9', seller: 's', title: 'Ｑ２ 論文添削', reviews: 50, priceYen: 3000 }] },
      ],
    },
    buyWindowWeeks: 8,
    today: '2026-09-26',
  });
  const [q1, q2, q3] = view.rows;
  assert.equal(q1.composeExaminees, 20000);
  assert.deepEqual(q1.stages[1].buy, { from: '2026-08-09', to: '2026-10-04' });
  assert.equal(q1.salesYen, 9800);
  // 全角のタイトルも NFKC で照合し、タイトルが当たらない大型チャンネルは数えない
  assert.equal(q1.channels.youtube.density, 'low');
  assert.equal(q1.channels.youtube.results, 1);
  assert.deepEqual(q1.channels.youtube.tracked, ['Ch1']);
  assert.equal(q1.channels.note.density, 'none');
  assert.equal(q1.channels.coconala.density, 'none');
  assert.equal(q1.channels.coconala.partial, false);
  assert.equal(q1.actions.length, 0);
  assert.equal(q2.composeExaminees, 3000);
  assert.ok(q2.actions.some((a) => a.includes('市場スキャン未取得')));
  assert.equal(q2.channels.youtube.density, null);
  // q2 専用の語は未取得だが、汎用の検索結果から下限を数える
  assert.equal(q2.channels.coconala.density, 'low');
  assert.equal(q2.channels.coconala.partial, true);
  // 出題形式が無い資格は要対応に出す。見送りは市場スキャンを求めない
  assert.ok(q3.actions.includes('出題形式が exam-formats.json に無い'));
  assert.ok(!q3.actions.some((a) => a.includes('市場スキャン')));
});
