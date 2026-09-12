import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { calendarDate, addDays, getDateRange, validateRange } from '../scripts/lib/gsc-date-range.mjs';
import { fetchSearchAnalytics } from '../.claude/skills/analytics/fetch-gsc-data/scripts/fetch-gsc-data.mjs';
import { CONFIG, LEDGER, KIND, hash, scopeKey, validateConfig, report, aggregate, evaluate, reviewWindows, nextReviewDate, writeSnapshot, updateLedger, recordAction, markDeployed, applyReview, statusOf } from '../scripts/lib/seo-rank-watch.mjs';
import { observationViolations } from '../scripts/check-seo-rank-watch.mjs';

const now = new Date('2026-09-13T02:00:00Z');
const watch = { id: 'test', keyword: '採算速度とは', targetPath: '/exam/civil-construction-1/textbook/schedule-overview', contentPath: 'content/site/test/article.mdx', country: 'jpn', device: null, priority: 1 };
const config = { version: 1, siteUrl: 'sc-domain:doboku-note.com', policy: { minImpressions: 20, minActiveDays: 3, maxConcurrent: 2, maxIneffectiveCycles: 3, maxSnapshotAgeDays: 9 }, watchwords: [watch] };
const metric = (rank = 5, impressions = 40) => ({ rank, impressions, activeDays: 5, clicks: 2, ctr: 2 / impressions });
const action = { method: 'faq', needs: '採算速度の定義と計算方法を知りたい受験者。', gap: '対象ページには用語の区別が説明されていない。', done: '定義を並べて説明するFAQを追加した。', serp: [{ url: 'https://example.com/one', gap: '上位は計算例があるが対象記事にない。' }], contentHash: hash('changed') };
const measurement = { file: 'fixture.json', after: { metrics: metric() } };
function recorded() {
  const store = { experiments: [] };
  return recordAction(store, config, watch, action, measurement, new Date('2026-08-01T00:00:00Z'));
}
const proof = { conclusion: 'success', status: 'completed', head_branch: 'main', path: '.github/workflows/cloudflare-deploy.yml', head_sha: 'a'.repeat(40), updated_at: '2026-08-01T10:00:00Z', html_url: 'https://github.com/owner/repo/actions/runs/1' };
function observing() { const exp = recorded(); markDeployed(exp, proof, now); return exp; }
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'seo-watch-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const path of [CONFIG, LEDGER]) mkdirSync(join(root, path, '..'), { recursive: true });
  writeFileSync(join(root, CONFIG), JSON.stringify(config));
  writeFileSync(join(root, LEDGER), JSON.stringify({ experiments: [] }));
  return root;
}
test('GSC dates include exactly 7/28 days, using PT across DST and JST midnight', () => {
  assert.equal(calendarDate(new Date('2026-09-13T01:00:00Z')), '2026-09-12');
  const range = getDateRange(7, new Date('2026-03-10T07:00:00Z'));
  assert.deepEqual(range, { startDate: '2026-03-01', endDate: '2026-03-07' });
  assert.equal((Date.parse(getDateRange(28, now).endDate) - Date.parse(getDateRange(28, now).startDate)) / 86400000 + 1, 28);
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.throws(() => getDateRange(0)); assert.throws(() => validateRange('2026-09-13', '2026-09-12')); assert.throws(() => addDays('2026-02-30', 1));
});
test('shared GSC client sends final data and exact query/page/country/device filters', async () => {
  let sent;
  const client = { searchanalytics: { query: async (args) => { sent = args; return { data: { rows: [] } }; } } };
  const result = await fetchSearchAnalytics(null, { days: 7, effectiveDimensions: ['date'], all: true, exact: true, query: 'test', page: 'https://doboku-note.com/exam/test', country: 'jpn', device: 'MOBILE' }, client);
  assert.equal(sent.siteUrl, config.siteUrl); assert.equal(sent.requestBody.dataState, 'final'); assert.equal(sent.requestBody.type, 'web');
  assert.deepEqual(sent.requestBody.dimensionFilterGroups[0].filters.map((f) => f.operator), ['equals', 'equals', 'equals', 'equals']);
  assert.equal(result.meta.truncated, false);
});
test('rank is impression-weighted; empty rows remain missing and invalid rows fail closed', () => {
  const snap = { meta: { startDate: '2026-09-01', endDate: '2026-09-07', dataState: 'final', truncated: false }, rows: [
    { keys: ['2026-09-01'], clicks: 1, impressions: 10, position: 2 }, { keys: ['2026-09-02'], clicks: 0, impressions: 30, position: 6 } ] };
  assert.equal(aggregate(snap).rank, 5);
  assert.equal(aggregate({ ...snap, rows: [{ keys: ['2026-09-01'], clicks: 0, impressions: 0, position: 0 }] }).activeDays, 0); assert.equal(aggregate({ ...snap, rows: [] }).rank, null);
  assert.throws(() => aggregate({ ...snap, rows: [...snap.rows, snap.rows[0]] }));
  assert.throws(() => aggregate({ ...snap, meta: { ...snap.meta, truncated: true } }));
  assert.equal(evaluate(metric(), metric(null, 0), config.policy), 'insufficient');
  assert.equal(evaluate(metric(), metric(1, 1), config.policy), 'insufficient');
});
test('config rejects duplicate scopes, invalid geography and traversal paths', () => {
  assert.equal(validateConfig(config), config);
  assert.throws(() => validateConfig({ ...config, watchwords: [watch, { ...watch, id: 'duplicate' }] }));
  assert.throws(() => validateConfig({ ...config, watchwords: [{ ...watch, country: 'Japan' }] }));
  assert.throws(() => validateConfig({ ...config, watchwords: [{ ...watch, contentPath: 'content/site/../../private.mdx' }] }));
});
test('record requires intent comparison; pending deployment and same-page keywords are locked', () => {
  assert.throws(() => recordAction({ experiments: [] }, config, watch, { ...action, serp: [] }, measurement, now));
  const exp = recorded(); assert.equal(statusOf(exp), 'pending-deploy'); assert.equal(exp.next_check_date, null);
  assert.throws(() => recordAction({ experiments: [exp] }, config, { ...watch, id: 'other', keyword: '別クエリ' }, action, measurement, now), /locked/);
});
test('other NSM experiments count toward the existing concurrency limit', () => {
  const experiments = [{ status: 'running' }, { status: 'measuring' }];
  assert.throws(() => recordAction({ experiments }, config, watch, action, measurement, now), /limit/);
});
test('observation starts after verified production, excludes deployment day, and cannot review early', () => {
  const exp = recorded();
  assert.throws(() => markDeployed(exp, { ...proof, conclusion: 'failure' }, now));
  assert.throws(() => markDeployed(exp, { ...proof, head_branch: 'develop' }, now));
  markDeployed(exp, proof, now);
  assert.deepEqual(reviewWindows(proof.updated_at), { before: { startDate: '2026-07-25', endDate: '2026-07-31' }, after: { startDate: '2026-08-02', endDate: '2026-08-08' } });
  assert.equal(nextReviewDate(proof.updated_at, 7), '2026-08-12');
  assert.throws(() => applyReview(exp, metric(), metric(4), config.policy, 's', new Date('2026-08-09T12:00:00Z')), /not available/);
});
test('insufficient data extends 7→14→28 and then pauses without claiming no effect', () => {
  const exp = observing();
  for (const days of [14, 28]) { applyReview(exp, metric(), metric(null, 0), config.policy, 's', now); assert.equal(exp.reviewDays, days); assert.equal(statusOf(exp), 'observing'); }
  applyReview(exp, metric(), metric(null, 0), config.policy, 's', now);
  assert.equal(statusOf(exp), 'paused'); assert.equal(exp.history.at(-1).outcome, 'insufficient');
});
test('first place requires two sufficient disjoint weeks, not an overlapping average', () => {
  const exp = observing();
  applyReview(exp, metric(5), metric(1), config.policy, 's7', now);
  assert.equal(statusOf(exp), 'observing');
  applyReview(exp, metric(5), metric(1), config.policy, 's14', now, [metric(1), metric(1)]);
  assert.equal(statusOf(exp), 'achieved'); assert.ok(exp.next_check_date);
  const other = observing();
  applyReview(other, metric(5), metric(1), config.policy, 's7', now);
  applyReview(other, metric(5), metric(1), config.policy, 's14', now, [metric(1), metric(1, 2)]);
  assert.equal(statusOf(other), 'observing');
});
test('no effect reactivates the watch but requires a different method', () => {
  const exp = observing(); applyReview(exp, metric(5), metric(5), config.policy, 's', now);
  assert.equal(statusOf(exp), 'active');
  assert.throws(() => recordAction({ experiments: [exp] }, config, watch, action, measurement, now), /different method/);
  recordAction({ experiments: [exp] }, config, watch, { ...action, method: 'intro' }, measurement, now);
  assert.equal(exp.actions.length, 2);
});
test('review improvement and concurrent edits cannot bypass a commit-time page lock', () => {
  const exp = observing(), before = { experiments: [exp] }, after = structuredClone(before);
  applyReview(after.experiments[0], metric(5), metric(3), config.policy, 's', now);
  assert.equal(statusOf(after.experiments[0]), 'active');
  assert.equal(observationViolations(before, after, [], () => 'changed').length, 0);
  assert.ok(observationViolations(before, after, [watch.contentPath], () => 'new change').some((s) => s.includes('observing')));
});
test('past improvement events and snapshots are immutable; snapshot names never overwrite', (t) => {
  const root = fixture(t), exp = observing(), changed = structuredClone(exp); changed.actions[0].done = 'rewritten';
  assert.ok(observationViolations({ experiments: [exp] }, { experiments: [changed] }, [], () => 'changed').some((s) => s.includes('append-only')));
  const one = writeSnapshot(root, { value: 1 }, now), two = writeSnapshot(root, { value: 2 }, now);
  assert.notEqual(one, two); assert.equal(JSON.parse(readFileSync(join(root, one))).value, 1);
});
test('ledger writes preserve unrelated fields and reject a concurrent writer', async (t) => {
  const root = fixture(t);
  await updateLedger(root, (s) => { s.experiments.push({ id: 'OTHER', custom: 'keep' }); });
  assert.equal(JSON.parse(readFileSync(join(root, LEDGER))).experiments[0].custom, 'keep');
  await assert.rejects(updateLedger(root, async () => { await updateLedger(root, () => {}); }), /EEXIST/);
});
test('selection uses fresh fixed-scope data, prioritizes near-first ranks and respects capacity', (t) => {
  const root = fixture(t);
  const before = { window: { startDate: '2026-08-27', endDate: '2026-09-02' }, metrics: metric(8) }, after = { window: { startDate: '2026-09-03', endDate: '2026-09-09' }, metrics: metric(4) };
  writeSnapshot(root, { type: 'measurement', scopeKey: scopeKey(watch), fetchedAt: now.toISOString(), before, after }, now);
  assert.equal(report(root, now).selected.id, watch.id); assert.equal(report(root, now).rows[0].delta, 4);
  assert.equal(report(root, new Date('2026-10-01T00:00:00Z')).selected, null);
  writeFileSync(join(root, LEDGER), JSON.stringify({ experiments: [{ status: 'running' }, { status: 'running' }] }));
  assert.equal(report(root, now).selected, null); assert.equal(report(root, now).candidate.id, watch.id);
});

test('snapshot provenance rejects changed ranks, mixed scopes and overlapping periods', async () => {
  const { validateSnapshot } = await import('../scripts/lib/seo-rank-watch.mjs');
  const part = (startDate, endDate) => {
    const raw = { meta: { siteUrl: config.siteUrl, type: 'web', dataState: 'final', truncated: false, dimensions: ['date'], startDate, endDate,
      filters: [{ dimension: 'query', operator: 'equals', expression: watch.keyword }, { dimension: 'page', operator: 'equals', expression: `https://doboku-note.com${watch.targetPath}` }, { dimension: 'country', operator: 'equals', expression: 'jpn' }] },
      rows: [{ keys: [startDate], clicks: 1, impressions: 10, position: 4 }] };
    return { window: { startDate, endDate }, raw, metrics: aggregate(raw) };
  };
  const s = { version: 1, type: 'measurement', scope: watch, scopeKey: scopeKey(watch), fetchedAt: now.toISOString(), before: part('2026-08-27', '2026-09-02'), after: part('2026-09-03', '2026-09-09') };
  assert.equal(validateSnapshot(s), s);
  const rankChanged = structuredClone(s); rankChanged.after.metrics.rank = 1;
  assert.throws(() => validateSnapshot(rankChanged), /aggregate/);
  const scopeChanged = structuredClone(s); scopeChanged.after.raw.meta.filters[0].operator = 'contains';
  assert.throws(() => validateSnapshot(scopeChanged), /scope/);
  assert.throws(() => validateSnapshot({ ...s, after: s.before }), /overlap/);
});

test('an already first-place keyword is not forcibly selected for improvement', (t) => {
  const root = fixture(t);
  writeSnapshot(root, { type: 'measurement', scopeKey: scopeKey(watch), fetchedAt: now.toISOString(), before: { metrics: metric(1) }, after: { metrics: metric(1), window: {} } }, now);
  assert.equal(report(root, now).selected, null);
});
