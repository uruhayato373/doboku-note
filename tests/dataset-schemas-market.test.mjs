import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as SCHEMAS from '../scripts/lib/dataset-schemas.mjs';
import { listAreaFiles, matchFiles } from '../scripts/lib/datasets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** 違反を「場所: 内容」の行にする（通れば空） */
const issues = (schema, value) => {
  const r = schema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.') || '(全体)'}: ${i.message}`);
};
const assertOk = (schema, value) => assert.deepEqual(issues(schema, value), []);
const assertFails = (schema, value, pattern) => {
  const found = issues(schema, value);
  assert.ok(found.some((l) => pattern.test(l)), `${pattern} が出ない: ${JSON.stringify(found.slice(0, 5))}`);
};

const files = ['data'].flatMap((area) => listAreaFiles(ROOT, area, { tracked: true }));
const { byId } = matchFiles(files);
/** データセットの最新ファイルの中身（実データ。無ければ落とす＝検査ゼロを緑にしない） */
const latest = (id) => {
  const file = (byId.get(id) ?? [])[0];
  assert.ok(file, `${id}: git 管理下のファイルが無い`);
  return clone(JSON.parse(readFileSync(join(ROOT, file), 'utf8')));
};
/** JSON の複製（実データは JSON だけなので十分） */
const clone = (v) => JSON.parse(JSON.stringify(v));
/** 変更を当てた複製（元は触らない） */
const mutated = (value, fn) => {
  const copy = clone(value);
  fn(copy);
  return copy;
};

// ---- 競合の時系列（共通の封筒）----------------------------------------------------------------

const COMPETITORS = [
  ['NoteCompetitors', 'note.competitors'],
  ['CoconalaCompetitors', 'coconala.competitors'],
  ['XCompetitors', 'x.competitors'],
  ['InstagramCompetitors', 'instagram.competitors'],
];

for (const [name, id] of COMPETITORS) {
  test(`${name}: 実データの最新が通り、封筒の壊れ（版・時刻・重複・基準なしの差分）が落ちる`, () => {
    const schema = SCHEMAS[name];
    const v = latest(id);
    assertOk(schema, v);
    assertFails(schema, mutated(v, (x) => delete x.schemaVersion), /schemaVersion/);
    assertFails(schema, mutated(v, (x) => (x.schemaVersion = 2)), /schemaVersion/);
    assertFails(schema, mutated(v, (x) => (x.fetchedAt = '2026-10-01T16:11:51+09:00')), /fetchedAt/);
    assertFails(schema, mutated(v, (x) => (x.fetchedAt = '2026-02-30T00:00:00.000Z')), /fetchedAt/);
    assertFails(schema, mutated(v, (x) => x.competitors.push(clone(x.competitors[0]))), /handle「.+」が重複/);
    assertFails(schema, mutated(v, (x) => (x.surprise = 1)), /surprise|Unrecognized/);
    assertFails(schema, mutated(v, (x) => (x.drift = [{ handle: 'h', type: 'moved', detail: 'd' }])), /drift\.0\.type/);
    assertFails(schema, mutated(v, (x) => {
      x.driftBasis = null;
      x.drift = [{ handle: x.competitors[0].handle, type: 'new-entrant', detail: 'd' }];
    }), /前回の基準（driftBasis）が無いのに差分がある/);
    assertFails(schema, mutated(v, (x) => delete x.competitors[0].handle), /competitors\.0\.handle/);
    if (name !== 'XCompetitors') assertFails(schema, mutated(v, (x) => delete x.competitors[0].exams), /competitors\.0\.exams/); // X は取得中に例外で落ちた行が exams を持たない
  });
}

test('NoteCompetitors: 件数・価格帯・価格の大小の不変条件と、スキ数・日時の形式が落ちる', () => {
  const v = latest('note.competitors');
  const first = (x) => x.competitors.find((c) => c.counts.magazinesPaid > 0 && c.counts.notesPaidInSample > 0);
  assertFails(SCHEMAS.NoteCompetitors, mutated(v, (x) => (first(x).price.bands.low += 1)), /価格帯の合計/);
  assertFails(SCHEMAS.NoteCompetitors, mutated(v, (x) => first(x).paidMagazines.pop()), /有料マガジンの行数/);
  assertFails(SCHEMAS.NoteCompetitors, mutated(v, (x) => first(x).paidNotesSample.pop()), /有料の単品記事の行数/);
  assertFails(SCHEMAS.NoteCompetitors, mutated(v, (x) => (first(x).counts.magazinesTotal = 0)), /有料マガジンが取得したマガジンより多い/);
  assertFails(SCHEMAS.NoteCompetitors, mutated(v, (x) => (first(x).price.min = first(x).price.max + 1)), /min ≤ median ≤ max/);
  assertFails(SCHEMAS.NoteCompetitors, mutated(v, (x) => (first(x).price.min = null)), /null が合わない/);
  assertFails(SCHEMAS.NoteCompetitors, mutated(v, (x) => (first(x).cadence.latestPublishAt = '2026-07-21 04:31')), /cadence\.latestPublishAt/);
  assertFails(SCHEMAS.NoteCompetitors, mutated(v, (x) => (first(x).topLiked[0].likeCount = -1)), /topLiked\.0\.likeCount/);
  assertFails(SCHEMAS.NoteCompetitors, mutated(v, (x) => (x.notePagesPerCreator = 0)), /notePagesPerCreator/);
});

test('NoteCompetitors: 取得に失敗した社（プロフィールなし・全部 0・価格なし）も通る', () => {
  const v = latest('note.competitors');
  const failed = mutated(v, (x) => {
    const c = x.competitors[0];
    c.profile = null;
    c.counts = { magazinesTotal: 0, magazinesPaid: 0, notesSampled: 0, notesComplete: false, notesPaidInSample: 0 };
    c.price = { min: null, median: null, max: null, bands: { low: 0, mid: 0, high: 0, premium: 0 } };
    c.cadence = { recent30: 0, recent90: 0, latestPublishAt: null, latestDaysAgo: null };
    c.topLiked = [];
    c.paidMagazines = [];
    c.paidNotesSample = [];
  });
  assertOk(SCHEMAS.NoteCompetitors, failed);
});

test('CoconalaCompetitors: 区分の語彙・評価の範囲・取りうる件数・platform が落ちる', () => {
  const v = latest('coconala.competitors');
  const S = SCHEMAS.CoconalaCompetitors;
  const row = (x) => x.competitors.find((c) => c.services.length > 0);
  assertFails(S, mutated(v, (x) => (row(x).services[0].segment = 'unknown')), /services\.0\.segment/);
  assertFails(S, mutated(v, (x) => (row(x).services[0].rating = 6)), /services\.0\.rating/);
  assertFails(S, mutated(v, (x) => (row(x).services[0].url = 'https://example.com/x')), /services\.0\.url/);
  assertFails(S, mutated(v, (x) => (row(x).cadence = { recent30: 0 })), /cadence/);
  assertFails(S, mutated(v, (x) => (x.platform = 'note')), /platform/);
  assertFails(S, mutated(v, (x) => (row(x).price.min = row(x).price.max + 1)), /min ≤ median ≤ max/);
  assertFails(S, mutated(v, (x) => (row(x).platformExtra.totalSales = -1)), /totalSales/);
});

test('XCompetitors: 取得失敗の行は通り、成功の行から欄が欠けると落ちる', () => {
  const v = latest('x.competitors');
  const S = SCHEMAS.XCompetitors;
  assert.ok(v.competitors.some((c) => c.error), '失敗の行が実データに無い（この検査の前提）');
  const ok = (x) => x.competitors.find((c) => !c.error);
  assertFails(S, mutated(v, (x) => delete ok(x).platformExtra), /platformExtra/);
  assertFails(S, mutated(v, (x) => delete ok(x).engagementLeaders), /engagementLeaders/);
  assertFails(S, mutated(v, (x) => (ok(x).profile = null)), /profile/);
  assertFails(S, mutated(v, (x) => (ok(x).engagementLeaders[0].vsAvg = -1)), /vsAvg/);
  assertFails(S, mutated(v, (x) => (ok(x).platformExtra.verified = 'yes')), /verified/);
  assertFails(S, mutated(v, (x) => {
    const bad = x.competitors.find((c) => c.error);
    bad.profile = { nickname: 'n', screenName: 's', followerCount: 1 };
  }), /error あり/);
  // 取得中に例外で落ちた行（exams・note を持たない）も通る
  assertOk(S, mutated(v, (x) => x.competitors.push({ handle: 'zzz', label: null, error: 'boom' })));
  assertFails(S, mutated(v, (x) => (x.drift = [{ handle: 'h', type: 'sales', detail: 'd' }])), /drift\.0\.type/);
});

test('InstagramCompetitors: 取得失敗の行は通り、成功の行から欄が欠けると落ちる', () => {
  const v = latest('instagram.competitors');
  const S = SCHEMAS.InstagramCompetitors;
  assertFails(S, mutated(v, (x) => delete x.competitors[0].counts), /counts/);
  assertFails(S, mutated(v, (x) => (x.competitors[0].platformExtra.followerPerPost = -1)), /followerPerPost/);
  assertFails(S, mutated(v, (x) => (x.competitors[0].cadence = { recent30: 1 })), /cadence/);
  assertOk(S, mutated(v, (x) => x.competitors.push({ handle: 'zzz', label: null, exams: [], note: null, profile: null, error: 'og:description 取得失敗' })));
  assertFails(S, mutated(v, (x) => x.competitors.push({ handle: 'zzz', label: null, exams: [], note: null, profile: null })), /profile/);
  assertFails(S, mutated(v, (x) => (x.drift = [{ handle: 'h', type: 'price', detail: 'd' }])), /drift\.0\.type/);
});

// ---- ココナラブログの競合 -------------------------------------------------------------------------

test('CoconalaBlogCompetitors: 件数の整合・検索語の一意・失敗した語・差分の形が落ちる', () => {
  const v = latest('coconala.blog-competitors');
  const S = SCHEMAS.CoconalaBlogCompetitors;
  assertOk(S, v);
  assertFails(S, mutated(v, (x) => delete x.scan), /scan/);
  assertFails(S, mutated(v, (x) => (x.scan.target += 1)), /target .+ が検索語＋ユーザーの数と合わない/);
  assertFails(S, mutated(v, (x) => { x.scan.ok += 1; x.scan.failed -= 1; }), /ok .+ が ok の行の数/);
  assertFails(S, mutated(v, (x) => (x.queries[0].collected += 1)), /collected/);
  assertFails(S, mutated(v, (x) => x.queries.push(clone(x.queries[0]))), /検索語「.+」が重複/);
  assertFails(S, mutated(v, (x) => (x.platform = 'coconala')), /platform/);
  assertFails(S, mutated(v, (x) => (x.queries[0].top[0].url = 'not a url')), /top\.0\.url/);
  assertFails(S, mutated(v, (x) => (x.drift = [{ type: 'hits', q: 'a', from: 1 }])), /drift\.0\.to/);
  assertFails(S, mutated(v, (x) => { x.driftBasis = null; x.drift = [{ type: 'hits', q: 'a', from: 1, to: 2 }]; }), /前回の基準/);
  assertFails(S, mutated(v, (x) => (x.users[0].postCount = -1)), /postCount/);
  // 例外で取れなかった語（note なし・error あり・ok=false）は通る
  assertOk(S, mutated(v, (x) => {
    x.queries.push({ q: '失敗する語', exam: null, ok: false, error: 'timeout', totalHits: null, collected: 0, top: [] });
    x.scan = { target: x.scan.target + 1, ok: x.scan.ok, failed: x.scan.failed + 1 };
  }));
  assertFails(S, mutated(v, (x) => {
    x.queries.push({ q: '失敗する語', exam: null, ok: true, error: 'timeout', totalHits: null, collected: 0, top: [] });
    x.scan = { target: x.scan.target + 1, ok: x.scan.ok + 1, failed: x.scan.failed };
  }), /error がある行が ok/);
});

// ---- 自分の X 投稿 ---------------------------------------------------------------------------------

test('XOwnPosts: 投稿の重複・日付と時のずれ・時刻の形式・0 件の取得が落ちる', () => {
  const v = latest('x.own-posts');
  const S = SCHEMAS.XOwnPosts;
  assertOk(S, v);
  assertFails(S, mutated(v, (x) => delete x.schemaVersion), /schemaVersion/);
  assertFails(S, mutated(v, (x) => x.posts.push(clone(x.posts[0]))), /投稿 id「.+」が重複/);
  assertFails(S, mutated(v, (x) => (x.posts[0].hour = (x.posts[0].hour + 1) % 24)), /posts\.0\.hour/);
  assertFails(S, mutated(v, (x) => (x.posts[0].date = '2020-01-01')), /posts\.0\.date/);
  assertFails(S, mutated(v, (x) => (x.posts[0].postedAtJst = '2026-09-07T20:15:00.000')), /posts\.0\.postedAtJst/);
  assertFails(S, mutated(v, (x) => (x.fetchedAt = '2026-09-14T09:04:58')), /fetchedAt/);
  assertFails(S, mutated(v, (x) => (x.posts = [])), /posts/);
  assertFails(S, mutated(v, (x) => (x.unavailableMetrics = ['clicks'])), /unavailableMetrics/);
  assertFails(S, mutated(v, (x) => (x.posts[0].likes = -1)), /posts\.0\.likes/);
  assertFails(S, mutated(v, (x) => (x.posts[0].postedAtJst = null)), /投稿日時が null/);
  // 投稿時刻を読めなかった投稿（3 欄とも null）は通る
  assertOk(S, mutated(v, (x) => Object.assign(x.posts[0], { postedAtJst: null, date: null, hour: null })));
});

// ---- note の公開状態 ---------------------------------------------------------------------------------

test('NoteStatusSnapshot: 件数の関係・失敗率・検査ゼロの緑・drift の語彙が落ちる', () => {
  const v = latest('note.status');
  const S = SCHEMAS.NoteStatusSnapshot;
  assertOk(S, v);
  assertFails(S, mutated(v, (x) => delete x.notConclusive), /notConclusive/);
  assertFails(S, mutated(v, (x) => (x.fetchTargets += 1)), /fetchTargets .+ が tracked − noId/);
  assertFails(S, mutated(v, (x) => (x.inspected -= 1)), /inspected/);
  assertFails(S, mutated(v, (x) => (x.fetchFail = 3)), /fetchFail/);
  assertFails(S, mutated(v, (x) => (x.fetchFailRate = 0.5)), /fetchFailRate/);
  assertFails(S, mutated(v, (x) => (x.fetchFailRate = 1.5)), /fetchFailRate/);
  assertFails(S, mutated(v, (x) => (x.drift[0].live = 'draft')), /drift\.0\.live/);
  assertFails(S, mutated(v, (x) => (x.fixed = 9)), /fixed が drift/);
  assertFails(S, mutated(v, (x) => (x.fetchedAt = '2026-09-30T16:39:46+09:00')), /fetchedAt/);
  assertFails(S, mutated(v, (x) => (x.warn = [{ rel: 'a.md', noteId: 'n1', status: 'publish' }])), /warn\.0\.live/);
  // 対象が 0 件なのに「検査成立」は止める（検査ゼロを緑にしない）
  assertFails(S, mutated(v, (x) => Object.assign(x, { tracked: 0, noId: 0, fetchTargets: 0, inspected: 0, fetchFail: 0, fetchFailRate: 1, notConclusive: false, drift: [], noLive: [] })), /検査ゼロを緑にしない/);
  assertOk(S, mutated(v, (x) => Object.assign(x, { tracked: 0, noId: 0, fetchTargets: 0, inspected: 0, fetchFail: 0, fetchFailRate: 1, notConclusive: true, drift: [], noLive: [], fixed: 0 })));
});

// ---- ココナラの市場調査 -----------------------------------------------------------------------------

test('CoconalaMarketResearch: 版・出品の一意・語の参照・途中経過・区分の語彙が落ちる', () => {
  const v = latest('coconala.market-research');
  const S = SCHEMAS.CoconalaMarketResearch;
  assertOk(S, v);
  assertFails(S, mutated(v, (x) => delete x.schemaVersion), /schemaVersion/);
  assertFails(S, mutated(v, (x) => { x.version = 2; }), /version|Unrecognized/);
  assertFails(S, mutated(v, (x) => (x.schemaVersion = 1)), /schemaVersion/);
  assertFails(S, mutated(v, (x) => x.services.push(clone(x.services[0]))), /出品の URL「.+」が重複/);
  assertFails(S, mutated(v, (x) => x.queries.push(clone(x.queries[0]))), /検索語「.+」が重複/);
  assertFails(S, mutated(v, (x) => x.services[0].queries.push('存在しない語')), /検索語「存在しない語」が queries に無い/);
  assertFails(S, mutated(v, (x) => (x.services[0].queries = [])), /services\.0\.queries/);
  assertFails(S, mutated(v, (x) => (x.services[0].segment = 'unknown')), /services\.0\.segment/);
  assertFails(S, mutated(v, (x) => (x.services[0].url = 'https://example.com/a')), /services\.0\.url/);
  assertFails(S, mutated(v, (x) => (x.services[0].priceYen = -1)), /services\.0\.priceYen/);
  assertFails(S, mutated(v, (x) => (x.services[0].rating = 9)), /services\.0\.rating/);
  assertFails(S, mutated(v, (x) => (x.queries[0].pageType = 'other')), /queries\.0\.pageType/);
  assertFails(S, mutated(v, (x) => (x.updatedAt = '2026-10-01T16:14:30+09:00')), /updatedAt/);
  assertFails(S, mutated(v, (x) => (x.queries[0].resolvedUrl = null)), /取得が終わった語なのに URL か pageType が無い/);
  // 取得の途中経過（1 ページ目を読む前の語）は通る
  assertOk(S, mutated(v, (x) => x.queries.push({ keyword: '途中の語', resolvedUrl: null, pageType: null, totalHits: null, pagesScanned: 0, complete: false })));
  // 詳細ページを取った出品・取れなかった出品も通る
  assertOk(S, mutated(v, (x) => {
    x.services[0].detail = { deliveryDays: '3日', totalSales: '12', description: '本文', hasOptions: true };
    x.services[1].detail = { error: 'fetch_failed' };
  }));
});

test('CoconalaMarketSummary: 区分の合計・価格の大小・語の一意・上位の件数が落ちる', () => {
  const v = latest('coconala.market-summary');
  const S = SCHEMAS.CoconalaMarketSummary;
  assertOk(S, v);
  assertFails(S, mutated(v, (x) => delete x.schemaVersion), /schemaVersion/);
  assertFails(S, mutated(v, (x) => (x.keywords[0].collected += 1)), /区分の合計/);
  assertFails(S, mutated(v, (x) => (x.keywords[0].priceYen.min = x.keywords[0].priceYen.max + 1)), /min ≤ median ≤ max/);
  assertFails(S, mutated(v, (x) => x.keywords.push(clone(x.keywords[0]))), /検索語「.+」が重複/);
  assertFails(S, mutated(v, (x) => (x.keywords[0].segments.unknown = 1)), /segments/);
  assertFails(S, mutated(v, (x) => x.keywords[0].topByReviews.push(...clone(x.keywords[0].topByReviews))), /topByReviews/);
  assertFails(S, mutated(v, (x) => (x.generatedAt = '2026-10-01T16:14:30+09:00')), /generatedAt/);
  // 価格のある出品が無い語（priceYen null・件数 0）は通る
  assertOk(S, mutated(v, (x) => Object.assign(x.keywords[0], { collected: 0, priceYen: null, segments: {}, topByReviews: [] })));
});

// ---- 資格ごとの市場スキャン ---------------------------------------------------------------------------

test('QualificationMarketScan: 版・時刻・失敗した語・取得物の欄が落ちる', () => {
  const v = latest('analysis.qualification-market');
  const S = SCHEMAS.QualificationMarketScan;
  assertOk(S, v);
  const yk = (x) => Object.keys(x.youtube)[0];
  const nk = (x) => Object.keys(x.note)[0];
  assertFails(S, mutated(v, (x) => delete x.schemaVersion), /schemaVersion/);
  assertFails(S, mutated(v, (x) => { x.version = 1; }), /version|Unrecognized/);
  assertFails(S, mutated(v, (x) => (x.updatedAt = '2026-09-26T15:14:46+09:00')), /updatedAt/);
  assertFails(S, mutated(v, (x) => (x.youtube[yk(x)].fetchedAt = '2026-09-26')), /fetchedAt/);
  assertFails(S, mutated(v, (x) => delete x.youtube[yk(x)].items[0].videoId), /items\.0\.videoId/);
  assertFails(S, mutated(v, (x) => (x.youtube[yk(x)].items[0].views = -1)), /items\.0\.views/);
  assertFails(S, mutated(v, (x) => delete x.note[nk(x)].items[0].creator), /items\.0\.creator/);
  assertFails(S, mutated(v, (x) => (x.note[nk(x)].items[0].price = -10)), /items\.0\.price/);
  assertFails(S, mutated(v, (x) => (x.note[nk(x)].items[0].publishAt = '2026-09-21')), /items\.0\.publishAt/);
  assertFails(S, mutated(v, (x) => (x.youtube[yk(x)].error = 'yt-dlp の検索に失敗')), /取得に失敗した語（error あり）が items/);
  assertFails(S, mutated(v, (x) => (x.youtubeChannels[Object.keys(x.youtubeChannels)[0]] = { fetchedAt: '2026-09-26T06:10:45.392Z' })), /name か followers が無い/);
  assertFails(S, mutated(v, (x) => (x.surprise = {})), /surprise|Unrecognized/);
  // 失敗した語（error あり・items 空）と、失敗したチャンネル行は通る
  assertOk(S, mutated(v, (x) => {
    x.youtube['失敗した語'] = { fetchedAt: '2026-09-26T06:10:45.392Z', error: 'yt-dlp の検索に失敗', items: [] };
    x.note['失敗した語'] = { fetchedAt: '2026-09-26T06:10:45.392Z', error: 'note 検索 API が JSON を返さなかった', items: [] };
    x.youtubeChannels.UCfailed = { fetchedAt: '2026-09-26T06:10:45.392Z', error: 'チャンネル情報の取得に失敗' };
  }));
});

// ---- A8 ---------------------------------------------------------------------------------------------

test('A8Catalog: 主キー・状態・履歴の整合・状態機械の外の行・時刻が落ちる', () => {
  const v = latest('a8.catalog');
  const S = SCHEMAS.A8Catalog;
  assertOk(S, v);
  const key = (x, status) => Object.keys(x.entries).find((k) => !k.startsWith('__') && x.entries[k].status === status);
  assertFails(S, mutated(v, (x) => delete x.schemaVersion), /schemaVersion/);
  assertFails(S, mutated(v, (x) => delete x.updatedAt), /updatedAt/);
  assertFails(S, mutated(v, (x) => (x.updatedAt = '2026-07-27T13:59:04+09:00')), /updatedAt/);
  assertFails(S, mutated(v, (x) => (x.entries[key(x, 'approved')].programId = 'other')), /programId .+ がキー/);
  assertFails(S, mutated(v, (x) => (x.entries[key(x, 'approved')].status = 'done')), /status/);
  assertFails(S, mutated(v, (x) => (x.entries[key(x, 'approved')].status = 'applied')), /履歴の最後の遷移先/);
  assertFails(S, mutated(v, (x) => (x.entries[key(x, 'approved')].history = [])), /履歴が無い/);
  assertFails(S, mutated(v, (x) => delete x.entries[key(x, 'approved')].history), /履歴が無い/);
  assertFails(S, mutated(v, (x) => (x.entries[key(x, 'approved')].status = 'snapshot')), /snapshot は __/);
  assertFails(S, mutated(v, (x) => (x.entries[key(x, 'approved')].history[0].to = 'done')), /history\.0\.to/);
  assertFails(S, mutated(v, (x) => (x.entries[key(x, 'approved')].history[0].at = '2026-07-20 02:32')), /history\.0\.at/);
  assertFails(S, mutated(v, (x) => (x.entries[key(x, 'approved')].vertical = 'hobby')), /vertical/);
  assertFails(S, mutated(v, (x) => (x.entries[key(x, 'approved')].confirmRatePct = 120)), /confirmRatePct/);
  assertFails(S, mutated(v, (x) => (x.entries[key(x, 'approved')].epcYen = -1)), /epcYen/);
  assertFails(S, mutated(v, (x) => (x.entries[key(x, 'approved')].rewardType = 'both')), /rewardType/);
  assertFails(S, mutated(v, (x) => (x.surprise = 1)), /surprise|Unrecognized/);
  // 状態機械の外の行（__session：履歴が空・lastError つき）は通る
  assertOk(S, mutated(v, (x) => {
    x.entries.__session = { programId: '__session', status: 'candidate', history: [], lastError: { step: 'list', error: 'session-expired', at: '2026-09-01T00:00:00.000Z' } };
  }));
});

test('A8UiLastRun: 実行 id の形・結果の語彙・件数の大小・時刻が落ちる', () => {
  const v = latest('a8.ui-last-run');
  const S = SCHEMAS.A8UiLastRun;
  assertOk(S, v);
  assertFails(S, mutated(v, (x) => delete x.schemaVersion), /schemaVersion/);
  assertFails(S, mutated(v, (x) => delete x.status), /status/);
  assertFails(S, mutated(v, (x) => (x.status = 'success')), /status/);
  assertFails(S, mutated(v, (x) => (x.lastRun = '2026-09-28T08:58:17.754Z')), /lastRun/);
  assertFails(S, mutated(v, (x) => (x.collectedAt = '2026-09-28T17:58:17+09:00')), /collectedAt/);
  assertFails(S, mutated(v, (x) => (x.downloadedUnits = x.totalUnits + 1)), /取れた数が取ろうとした数より多い/);
  assertFails(S, mutated(v, (x) => (x.mediaId = '')), /mediaId/);
  assertFails(S, mutated(v, (x) => (x.version = 1)), /version|Unrecognized/);
  for (const status of ['partial', 'not-signed-in', 'account-mismatch', 'error']) assertOk(S, mutated(v, (x) => (x.status = status)));
});
