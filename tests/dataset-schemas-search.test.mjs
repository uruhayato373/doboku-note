import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as SCHEMAS from '../scripts/lib/dataset-schemas.mjs';
import { listAreaFiles, matchFiles } from '../scripts/lib/datasets.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const files = ['config', 'data'].flatMap((area) => listAreaFiles(ROOT, area, { tracked: true }));
const { byId: filesById } = matchFiles(files);
const all = (id) => {
  const fs = filesById.get(id) ?? [];
  assert.ok(fs.length > 0, `${id}: git 管理下のファイルが 0 件（未検査を通さない）`);
  return fs.map((f) => ({ file: f, value: JSON.parse(readFileSync(join(ROOT, f), 'utf8')) }));
};
const latest = (id) => all(id)[0].value;
const issues = (schema, value) => {
  const r = schema.safeParse(value);
  return r.success ? [] : r.error.issues.map((i) => `${i.path.join('.') || '(全体)'}: ${i.message}`);
};
const assertAllOk = (schema, id) => {
  for (const { file, value } of all(id)) assert.deepEqual(issues(schema, value), [], `${file} が型を通らない`);
};
const assertFails = (schema, value, pattern) => {
  const found = issues(schema, value);
  assert.ok(found.some((l) => pattern.test(l)), `${pattern} が出ない: ${JSON.stringify(found.slice(0, 5))}`);
};
const clone = (value) => globalThis.structuredClone(value);
/** 週次・日次の取得で配列が空になる週でも失敗例を作れるよう、最新データが使えないときだけ固定サンプルを元にする（DN-0536） */
const sample = (name) => JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/dataset-samples', name + '.json'), 'utf8'));
/** 深いコピーを作って fn で壊す */
const broken = (value, fn) => {
  const copy = clone(value);
  fn(copy);
  return copy;
};

// ---- GA4・GSC のレポート -------------------------------------------------------------------------

test('Ga4Reports: 実データの全日が通り、枠・日付・行・分け方の誤りが落ちる', () => {
  const S = SCHEMAS.Ga4Reports;
  assertAllOk(S, 'ga4.reports');
  const day = latest('ga4.reports');
  for (const section of ['page', 'cta-clicks-by-label:month', 'key-events-by-page', 'quiz-funnel', 'bot-audit']) assert.ok(day.reports[section], `最新の日に ${section} が無い（テストの前提）`);
  assertFails(S, broken(day, (d) => { delete d.reports.page.meta.startDate; }), /reports\.page\.meta\.startDate/);
  assertFails(S, broken(day, (d) => { d.source = 'gsc'; }), /source/);
  assertFails(S, broken(day, (d) => { d.schemaVersion = 2; }), /schemaVersion/);
  assertFails(S, broken(day, (d) => { d.reports.mystery = d.reports.page; }), /(mystery|Unrecognized)/);
  assertFails(S, broken(day, (d) => { d.reports = {}; }), /reports/);
  assertFails(S, broken(day, (d) => { d.reports.page.stamp = '2026-10-02T00:21:26Z'; }), /reports\.page\.stamp/);
  assertFails(S, broken(day, (d) => { d.reports.page.stamp = '2026-09-01T00-21-26'; }), /JST の日付/);
  assertFails(S, broken(day, (d) => { d.reports.page.meta.endDate = '2020-01-01'; }), /終了日/);
  assertFails(S, broken(day, (d) => { d.reports.page.meta.propertyId = '419382901'; }), /propertyId/);
  assertFails(S, broken(day, (d) => { d.reports.page.rows[0].engagementRate = 1.5; }), /engagementRate/);
  assertFails(S, broken(day, (d) => { d.reports.page.rows[0].sessions = '3'; }), /sessions/);
  assertFails(S, broken(day, (d) => { d.reports.page.rows.push(clone(d.reports.page.rows[0])); }), /重複/);
  assertFails(S, broken(day, (d) => { d.reports.date.rows[0].date = '2026-09-04'; }), /date/);
  assertFails(S, broken(day, (d) => { d.reports.channel.meta.dimension = 'page'; }), /dimension/);
  assertFails(S, broken(day, (d) => { d.reports['cta-clicks'].rows[0].eventCount = -1; }), /eventCount/);
  assertFails(S, broken(day, (d) => { d.reports['cta-clicks-by-label'].meta.byLabel = false; }), /byLabel/);
  assertFails(S, broken(day, (d) => { d.reports['cta-clicks-by-label:month'].meta.windowKind = 'days'; }), /windowKind/);
  assertFails(S, broken(day, (d) => { d.reports['cta-clicks-by-label'].meta.windowKind = 'month'; }), /windowKind/);
  assertFails(S, broken(day, (d) => { d.reports['key-events-by-page'].meta.mode = 'other'; }), /mode/);
  assertFails(S, broken(day, (d) => { d.reports['quiz-funnel'].meta.placementStatus = 'request_failed'; d.reports['quiz-funnel'].placementRows = [{ eventName: 'quiz_start', placement: 'x', eventCount: 1 }]; }), /placementStatus/);
  assertFails(S, broken(day, (d) => { d.reports['bot-audit'].rows[0].flagged = !d.reports['bot-audit'].rows[0].flagged; }), /flagged/);
  assertFails(S, broken(day, (d) => { delete d.reports['bot-audit'].totals; }), /totals/);
});

test('GscReports: 実データの全日が通り、keys・行数・クリックの誤りが落ちる', () => {
  const S = SCHEMAS.GscReports;
  assertAllOk(S, 'gsc.reports');
  const day = latest('gsc.reports');
  assertFails(S, broken(day, (d) => { delete d.reports.page.rows[0].keys; }), /keys/);
  assertFails(S, broken(day, (d) => { d.reports.page.rows[0].keys = []; }), /keys/);
  assertFails(S, broken(day, (d) => { d.reports['page-query'].rows[0].keys = ['https://doboku-note.com/']; }), /keys が 1 個/);
  assertFails(S, broken(day, (d) => { d.reports.page.meta.row_count += 1; }), /row_count/);
  assertFails(S, broken(day, (d) => { const r = d.reports.page.rows[0]; r.clicks = r.impressions + 1; }), /クリック/);
  assertFails(S, broken(day, (d) => { d.reports.page.rows[0].ctr = 4; }), /ctr/);
  assertFails(S, broken(day, (d) => { d.reports.date.rows[0].keys = ['9/22']; }), /日付/);
  assertFails(S, broken(day, (d) => { d.reports.page.meta.dimensions = ['query']; }), /dimensions/);
  assertFails(S, broken(day, (d) => { d.reports.page.rows.push(clone(d.reports.page.rows[0])); d.reports.page.meta.row_count += 1; }), /重複/);
  assertFails(S, broken(day, (d) => { d.reports.page.stamp = '2026-09-01T00-21-22'; }), /JST の日付/);
  assertFails(S, broken(day, (d) => { d.source = 'ga4'; }), /source/);
  assertFails(S, broken(day, (d) => { d.reports.mystery = d.reports.page; }), /(mystery|Unrecognized)/);
});

// ---- GA4 管理画面・画面取得のマーカー --------------------------------------------------------------

test('Ga4AdminInventory: 実データが通り、欠け・語彙・時刻・一覧なしの ok が落ちる', () => {
  const S = SCHEMAS.Ga4AdminInventory;
  assertAllOk(S, 'ga4.admin-inventory');
  const inv = latest('ga4.admin-inventory');
  assertFails(S, broken(inv, (i) => { delete i.propertyId; }), /propertyId/);
  assertFails(S, broken(inv, (i) => { i.mode = 'apply'; }), /mode/);
  assertFails(S, broken(inv, (i) => { i.collectedAt = '2026-10-02T09:22:07+09:00'; }), /collectedAt/);
  assertFails(S, broken(inv, (i) => { i.runId = '2026-10-02'; }), /runId/);
  assertFails(S, broken(inv, (i) => { i.missing = 'none'; }), /missing/);
  assertFails(S, broken(inv, (i) => { i.inventory = null; }), /観測した一覧/);
  assertFails(S, broken(inv, (i) => { i.schemaVersion = 2; }), /schemaVersion/);
  // 画面経由の失敗した run（一覧なし・status が ok でない）は通る
  assert.deepEqual(issues(S, broken(inv, (i) => { i.inventory = null; i.status = 'not-signed-in'; delete i.keyEvents; })), []);
});

test('GscUiLastRun・Ga4UiLastRun: 実データが通り、複製のずれ・件数・判定・版が落ちる', () => {
  for (const [name, id] of [['GscUiLastRun', 'gsc.ui-last-run'], ['Ga4UiLastRun', 'ga4.ui-last-run']]) {
    const S = SCHEMAS[name];
    assertAllOk(S, id);
    const m = latest(id);
    assertFails(S, broken(m, (x) => { delete x.lastAttempt; }), /lastAttempt/);
    assertFails(S, broken(m, (x) => { x.schemaVersion = 2; }), /schemaVersion/);
    assertFails(S, broken(m, (x) => { x.channel = 'other'; }), /channel/);
    assertFails(S, broken(m, (x) => { x.lastRun = '2020-01-01T00-00-00Z'; }), /lastRun/);
    assertFails(S, broken(m, (x) => { x.collectedAt = '2026-09-24T20:20:02.173+09:00'; }), /collectedAt/);
    assertFails(S, broken(m, (x) => { x.lastAttempt.complete = !x.lastAttempt.complete; }), /complete/);
    assertFails(S, broken(m, (x) => { x.lastAttempt.status = 'done'; }), /status/);
    assertFails(S, broken(m, (x) => { x.lastAttempt.totalUnits += 1; x.totalUnits += 1; }), /総数/);
    assertFails(S, broken(m, (x) => { x.lastAttempt.failedDetail.push({ unit: 'a:b', status: 'x', error: null }); }), /失敗の内訳/);
    assertFails(S, broken(m, (x) => { x.lastAttempt.byScope.x = { total: 1 }; }), /byScope/);
  }
  const g = latest('gsc.ui-last-run');
  assertFails(SCHEMAS.GscUiLastRun, broken(g, (x) => { x.lastComplete = null; }), /lastComplete/);
  assertFails(SCHEMAS.GscUiLastRun, broken(g, (x) => { delete x.property; }), /property/);
  const a = latest('ga4.ui-last-run');
  assertFails(SCHEMAS.Ga4UiLastRun, broken(a, (x) => { x.window.startDate = '7/2'; }), /window\.startDate/);
});

// ---- サイトマップ・URL 検査・登録申請 -----------------------------------------------------------------

test('GscSitemaps: 実データが通り、送信の語彙・重複・時刻・送信件数が落ちる', () => {
  const S = SCHEMAS.GscSitemaps;
  assertAllOk(S, 'gsc.sitemaps');
  const s = latest('gsc.sitemaps');
  assertFails(S, broken(s, (x) => { delete x.fetchedAt; }), /fetchedAt/);
  assertFails(S, broken(s, (x) => { x.submit[0].status = 'failed'; }), /submit\.0\.status/);
  assertFails(S, broken(s, (x) => { x.sitemaps.push(clone(x.sitemaps[0])); }), /重複/);
  assertFails(S, broken(s, (x) => { x.sitemaps[0].lastDownloaded = '2026-09-30T22:05:25+09:00'; }), /lastDownloaded/);
  assertFails(S, broken(s, (x) => { x.submit.pop(); }), /送信 1 件/);
  assertFails(S, broken(s, (x) => { x.robotsSitemaps = []; }), /robotsSitemaps/);
  assertFails(S, broken(s, (x) => { x.sitemaps[0].errors = -1; }), /errors/);
  assert.deepEqual(issues(S, broken(s, (x) => { x.submit = []; })), [], '送らない取得（submit が空）は通る');
});

test('GscUrlInspection: 実データが通り、旧名の version・件数・判定・行の形が落ちる', () => {
  const S = SCHEMAS.GscUrlInspection;
  assertAllOk(S, 'gsc.url-inspection');
  const b = latest('gsc.url-inspection');
  assertFails(S, broken(b, (x) => { delete x.schemaVersion; }), /schemaVersion/);
  assertFails(S, broken(b, (x) => { x.version = 1; delete x.schemaVersion; }), /schemaVersion/);
  assertFails(S, broken(b, (x) => { x.generated_at = '2026-09-30T17:16:07+09:00'; }), /generated_at/);
  assertFails(S, broken(b, (x) => { x.completed += 1; }), /completed/);
  assertFails(S, broken(b, (x) => { x.partial = true; }), /partial/);
  assertFails(S, broken(b, (x) => { x.total = x.completed - 1; }), /total/);
  assertFails(S, broken(b, (x) => { delete x.results[0].index; }), /index/);
  assertFails(S, broken(b, (x) => { x.results[0].index.verdict = 'OK'; }), /verdict/);
  assertFails(S, broken(b, (x) => { x.results[0].inspected_at = '2026-09-30'; }), /inspected_at/);
  assertFails(S, broken(b, (x) => { x.results[1].url = x.results[0].url; }), /重複/);
  assertFails(S, broken(b, (x) => { x.results[0].error = 'x'; }), /error/);
  // 失敗した URL は error だけの行
  assert.deepEqual(issues(S, broken(b, (x) => { x.results[0] = { url: x.results[0].url, error: 'timeout' }; })), []);
});

test('GscUrlInspectionSingle: 実データが通り、旧名の version・複数件・判定が落ちる', () => {
  const S = SCHEMAS.GscUrlInspectionSingle;
  assertAllOk(S, 'gsc.url-inspection-single');
  const b = latest('gsc.url-inspection-single');
  assertFails(S, broken(b, (x) => { delete x.schemaVersion; }), /schemaVersion/);
  assertFails(S, broken(b, (x) => { x.results.push({ ...x.results[0], url: 'https://doboku-note.com/other' }); }), /results/);
  assertFails(S, broken(b, (x) => { x.results[0].index.verdict = 'OK'; }), /verdict/);
  assertFails(S, broken(b, (x) => { x.results[0].index.last_crawl_time = '2026-04-14T19:55:16+09:00'; }), /last_crawl_time/);
  assertFails(S, broken(b, (x) => { x.generated_at = 'now'; }), /generated_at/);
});

test('GscIndexingPriority: 実データが通り、件数の不整合・分類・重複・切り詰めが落ちる', () => {
  const S = SCHEMAS.GscIndexingPriority;
  assertAllOk(S, 'gsc.indexing-priority');
  const p = latest('gsc.indexing-priority');
  assertFails(S, broken(p, (x) => { delete x.counts; }), /counts/);
  assertFails(S, broken(p, (x) => { x.counts.indexed += 1; }), /検査/);
  assertFails(S, broken(p, (x) => { x.counts.withDemand = x.counts.candidates + 1; }), /表示実績ありの候補/);
  assertFails(S, broken(p, (x) => { x.items[0].status = 'indexed'; }), /status/);
  assertFails(S, broken(p, (x) => { x.items[0].path = 'exam/x'; }), /path/);
  assertFails(S, broken(p, (x) => { x.items[1].path = x.items[0].path; }), /重複/);
  assertFails(S, broken(p, (x) => { x.items.pop(); }), /items 199 件/);
  assertFails(S, broken(p, (x) => { x.itemsTruncated = !x.itemsTruncated; }), /itemsTruncated/);
  assertFails(S, broken(p, (x) => { x.generatedAt = '2026-09-30'; }), /generatedAt/);
  assertFails(S, broken(p, (x) => { x.items[0].impressions = 1.5; }), /impressions/);
});

test('GscIndexingRequests: 実データが通り、語彙・集計の不整合・dry-run の申請・summary 欠けが落ちる', () => {
  const S = SCHEMAS.GscIndexingRequests;
  assertAllOk(S, 'gsc.indexing-requests');
  const latestRequests = latest('gsc.indexing-requests');
  assert.deepEqual(issues(S, sample('indexing-requests')), []);
  // ログインできず中断した run（items も summary も無い）が最新だと失敗例を作れないので、固定サンプルを元にする
  const r = latestRequests.items?.length > 0 && latestRequests.summary ? latestRequests : sample('indexing-requests');
  assertFails(S, broken(r, (x) => { delete x.mode; }), /mode/);
  assertFails(S, broken(r, (x) => { x.mode = 'live'; }), /mode/);
  assertFails(S, broken(r, (x) => { x.status = 'done'; }), /status/);
  assertFails(S, broken(r, (x) => { x.runId = '2026-10-03'; }), /runId/);
  assertFails(S, broken(r, (x) => { x.summary.accepted += 1; }), /accepted/);
  assertFails(S, broken(r, (x) => { x.summary.inspected += 1; }), /inspected/);
  assertFails(S, broken(r, (x) => { delete x.summary; }), /summary/);
  assertFails(S, broken(r, (x) => { x.targetCount = 1; }), /対象/);
  assertFails(S, broken(r, (x) => { delete x.items[0].reachedVerdict; }), /reachedVerdict/);
  assertFails(S, broken(r, (x) => { x.mode = 'dry-run'; }), /dry-run/);
  // ログインできず中断した run（items も summary も無い）は通る
  assert.deepEqual(issues(S, broken(r, (x) => { x.status = 'not-signed-in'; x.items = []; delete x.summary; })), []);
});

// ---- GSC の画面取得の結果 ---------------------------------------------------------------------------

test('GscUiDiff: 実データの全 run が通り、ユニット名・重複・増減・時刻が落ちる', () => {
  const S = SCHEMAS.GscUiDiff;
  assertAllOk(S, 'gsc.ui-diff');
  const d = latest('gsc.ui-diff');
  assertFails(S, broken(d, (x) => { delete x.runId; }), /runId/);
  assertFails(S, broken(d, (x) => { x.channel = 'ga4-ui'; }), /channel/);
  assertFails(S, broken(d, (x) => { x.collectedAt = '2026-09-24T20:20:02+09:00'; }), /collectedAt/);
  assertFails(S, broken(d, (x) => { x.units[0].unit = 'crawledNotIndexed'; }), /unit/);
  assertFails(S, broken(d, (x) => { x.units[1].unit = x.units[0].unit; }), /重複/);
  assertFails(S, broken(d, (x) => { x.units[0].added = Array(x.units[0].rows + 1).fill('https://doboku-note.com/'); }), /増えた/);
  assertFails(S, broken(d, (x) => { x.units[0].previousRows = null; x.units[0].removed = ['https://doboku-note.com/a']; }), /前回が無い/);
  assertFails(S, broken(d, (x) => { x.units[0].rows = -1; }), /rows/);
});

test('GscUiUrls: 実データが通り、キー・行数・範囲・前回の組・打ち切りの不整合が落ちる', () => {
  const S = SCHEMAS.GscUiUrls;
  assertAllOk(S, 'gsc.ui-urls');
  const u = latest('gsc.ui-urls');
  const key = Object.keys(u.units)[0];
  const truncatedKey = Object.keys(u.units).find((k) => u.units[k].truncated);
  assert.ok(truncatedKey, '打ち切りのユニットが無い（テストの前提）');
  assertFails(S, broken(u, (x) => { delete x.units; }), /units/);
  assertFails(S, broken(u, (x) => { x.units.renamed = x.units[key]; }), /キー renamed/);
  assertFails(S, broken(u, (x) => { x.units[key].exportedRows += 1; }), /exportedRows/);
  assertFails(S, broken(u, (x) => { x.units[key].rejectCount = 3; }), /rejectCount/);
  assertFails(S, broken(u, (x) => { x.units[key].scope = 'everything'; }), /scope/);
  assertFails(S, broken(u, (x) => { x.units[key].delta = null; }), /previous と delta/);
  assertFails(S, broken(u, (x) => { x.units[truncatedKey].uiTotal = x.units[truncatedKey].exportedRows; }), /truncated/);
  assertFails(S, broken(u, (x) => { x.units[key].rows[0].lastCrawled = '9/22'; }), /lastCrawled/);
  assertFails(S, broken(u, (x) => { x.units[key].collectedAt = '2026-09-24T20:20:02+09:00'; }), /collectedAt/);
  assertFails(S, broken(u, (x) => { x.units[key].runId = 'adhoc'; }), /runId/);
});

// ---- Bing・PSI・RUM ----------------------------------------------------------------------------------

test('BingSnapshots: 実データの全日が通り、区画・日付・並び・失敗の形が落ちる', () => {
  const S = SCHEMAS.BingSnapshots;
  assertAllOk(S, 'bing.snapshots');
  const b = latest('bing.snapshots');
  assertFails(S, broken(b, (x) => { delete x.sections.traffic; }), /sections\.traffic/);
  assertFails(S, broken(b, (x) => { x.schemaVersion = 2; }), /schemaVersion/);
  assertFails(S, broken(b, (x) => { x.fetchedAt = '2026-10-02T09:22:04+09:00'; }), /fetchedAt/);
  assertFails(S, broken(b, (x) => { delete x.sections.query.rows[0].query; }), /query/);
  assertFails(S, broken(b, (x) => { x.sections.page.rows[0].clicks = -1; }), /clicks/);
  assertFails(S, broken(b, (x) => { x.sections.query.rows[0].date = '2026-01-01'; }), /since/);
  assertFails(S, broken(b, (x) => { x.sections.traffic.rows.reverse(); }), /昇順/);
  assertFails(S, broken(b, (x) => { x.sections.query = { ok: false }; }), /error/);
  assertFails(S, broken(b, (x) => { for (const k of ['query', 'page', 'traffic']) x.sections[k] = { ok: false, error: 'HTTP 500' }; }), /全区画が失敗/);
  // 一部の区画だけ失敗した取得は書かれる
  assert.deepEqual(issues(S, broken(b, (x) => { x.sections.page = { ok: false, error: 'HTTP 500' }; })), []);
});

test('PsiBatch: 実データの全バッチが通り、旧名の version・語彙・範囲・重複・失敗行が落ちる', () => {
  const S = SCHEMAS.PsiBatch;
  assertAllOk(S, 'psi.batch');
  const b = latest('psi.batch');
  assertFails(S, broken(b, (x) => { delete x.schemaVersion; }), /schemaVersion/);
  assertFails(S, broken(b, (x) => { x.version = 1; delete x.schemaVersion; }), /schemaVersion/);
  assertFails(S, broken(b, (x) => { x.generated_at = '2026-10-02T21:10:36+09:00'; }), /generated_at/);
  assertFails(S, broken(b, (x) => { x.results = []; }), /results/);
  assertFails(S, broken(b, (x) => { x.results[0].strategy = 'tablet'; }), /results\.0/);
  assertFails(S, broken(b, (x) => { x.results[0].scores.performance = 101; }), /results\.0/);
  assertFails(S, broken(b, (x) => { x.results[0].lab_data.CLS = -1; }), /results\.0/);
  assertFails(S, broken(b, (x) => { delete x.results[0].field_availability; }), /results\.0/);
  assertFails(S, broken(b, (x) => { x.results[0].field_data.LCP = { percentile: 1000, distributions: [], category: 'GOOD' }; }), /results\.0/);
  assertFails(S, broken(b, (x) => { x.results[0].fetched_at = '2026-10-02T21:08:43+09:00'; }), /results\.0/);
  assertFails(S, broken(b, (x) => { x.results[1] = clone(x.results[0]); }), /重複/);
  // 計測に失敗した URL は error だけの行（欠測として残す）
  assert.deepEqual(issues(S, broken(b, (x) => { x.results[0] = { url: x.results[0].url, strategy: x.results[0].strategy, error: 'PSI API 500' }; })), []);
  assertFails(S, broken(b, (x) => { x.results[0] = { url: x.results[0].url, strategy: x.results[0].strategy }; }), /results\.0/);
});

test('RumWebVitals: 実データが通り、版・状態・件数の不整合・null の使い方が落ちる', () => {
  const S = SCHEMAS.RumWebVitals;
  assertAllOk(S, 'rum.web-vitals');
  const all2 = all('rum.web-vitals');
  const ok = all2.find((f) => f.value.status === 'ok')?.value;
  assert.ok(ok, 'status が ok の記録が無い（テストの前提）');
  assertFails(S, broken(ok, (x) => { delete x.schemaVersion; }), /schemaVersion/);
  assertFails(S, broken(ok, (x) => { x.generatedAt = '2026-10-02T09:21:35+09:00'; }), /generatedAt/);
  assertFails(S, broken(ok, (x) => { x.status = 'done'; }), /status/);
  assertFails(S, broken(ok, (x) => { x.window.days = 0; }), /window\.days/);
  assertFails(S, broken(ok, (x) => { x.summary.rows[0].metric = 'TTFB'; }), /metric/);
  assertFails(S, broken(ok, (x) => { x.summary.rows[0].n += 1; }), /評価別の合計/);
  assertFails(S, broken(ok, (x) => { x.summary.rows[0].goodShare = null; }), /goodShare/);
  assertFails(S, broken(ok, (x) => { x.summary.rows[0].counts.poor = -1; }), /poor/);
  assertFails(S, broken(ok, (x) => { x.summary.events = 0; }), /no-events/);
  assertFails(S, broken(ok, (x) => { x.error = 'x'; }), /error/);
  assertFails(S, broken(ok, (x) => { x.status = 'dimensions-missing'; }), /dimensions-missing/);
  assertFails(S, broken(ok, (x) => { delete x.summary.dropped; }), /dropped/);
  // 取得できなかった run（window が null・集計行なし・error つき）は通る
  assert.deepEqual(issues(S, broken(ok, (x) => { x.status = 'dimensions-missing'; x.window = null; x.error = 'Field customEvent:metric_name is not a valid dimension'; x.summary = { rows: [], events: 0, dropped: 0 }; })), []);
});
