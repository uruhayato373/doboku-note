import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  oppId, combineGscRows, detectSeo, detectRevenue, detectMeasurement, detectExperiments,
  isSuppressed, selectSurfaced, summarizeKpis, reconcileBing,
} from '../scripts/lib/growth-opportunities.mjs';
import { buildDigest, renderMarkdown } from '../scripts/build-growth-digest.mjs';

const cfg = JSON.parse(readFileSync('.claude/config/growth-cycle.json', 'utf8')).digest;
const gsc = (rows) => ({ ok: true, rows, truncated: false });
const pq = (page, query, clicks, impressions, position) => ({ page, query, clicks, impressions, position });
const pg = (page, clicks, impressions = clicks * 20, position = 5) => ({ page, clicks, impressions, position });
const ev = (page, event, week, base) => ({ page, event, week: { count: week, users: week }, base: { count: base, users: base } });
const basePack = (sections) => ({ week: '2026-W38', period: { startDate: '2026-09-14', endDate: '2026-09-20' }, baseline: { startDate: '2026-08-17', endDate: '2026-09-13' }, sections });
const ctx = (extra = {}) => ({ config: cfg, qualifications: ['civil-construction-1'], contentIndex: new Map([['/exam/civil-construction-1/textbook/a', 'content/site/civil-construction-1/textbook-a/article.mdx']]), legacy: new Map([['/docs/civil-construction-1-textbook-a', '/exam/civil-construction-1/textbook/a']]), watchwords: [], packFile: 'pack.json', history: [], inputs: [], ...extra });

test('opportunity ids are stable and type-scoped', () => {
  assert.equal(oppId('seo-x', '/a|q'), oppId('seo-x', '/a|q'));
  assert.notEqual(oppId('seo-x', '/a|q'), oppId('seo-y', '/a|q'));
  assert.match(oppId('seo-x', '/a|q'), /^OPP-[0-9a-f]{10}$/);
});

test('legacy /docs/ rows fold into the canonical page instead of being dropped', () => {
  const rows = combineGscRows([[pq('/docs/civil-construction-1-textbook-a', 'q', 1, 90, 8)], [pq('/exam/civil-construction-1/textbook/a', 'q', 1, 10, 6)]], ctx().legacy);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].page, '/exam/civil-construction-1/textbook/a');
  assert.equal(rows[0].impressions, 100);
  assert.equal(rows[0].position, 7.8);
  assert.equal(rows[0].legacy, true);
});

test('detectSeo flags high-impression low-CTR and striking-distance queries with a watchword draft when improvable', () => {
  const pack = basePack({
    gscPageQueryWeek: gsc([pq('/exam/civil-construction-1/textbook/a', '過去問 解答', 0, 30, 4)]),
    gscPageQueryBase: gsc([pq('/exam/civil-construction-1/textbook/a', '過去問 解答', 0, 90, 4), pq('/exam/civil-construction-1/textbook/b', 'キーワード 計算', 1, 200, 14)]),
  });
  const items = detectSeo(pack, ctx());
  const low = items.find((i) => i.type === 'seo-high-impr-low-ctr');
  assert.ok(low);
  assert.equal(low.watchwordDraft.contentPath, 'content/site/civil-construction-1/textbook-a/article.mdx');
  assert.equal(low.watchwordDraft.intent, 'exam-task');
  assert.deepEqual(low.suggest, ['watchword', 'backlog']);
  const strike = items.find((i) => i.type === 'seo-striking-distance');
  assert.ok(strike);
  assert.equal(strike.watchwordDraft, null, '原稿が見つからないページは watchword にしない');
  assert.ok(strike.expectedWeeklyGain.value > 0);
});

test('detectSeo skips already-watched queries and does not report migration as a traffic drop', () => {
  const pack = basePack({
    gscPageQueryWeek: gsc([pq('/exam/civil-construction-1/textbook/a', '過去問 解答', 0, 60, 4)]),
    gscPageQueryBase: gsc([]),
    // 旧 URL 40 クリック（基線）→ 正規 URL 10 クリック（週）: 寄せれば週平均 10 と同じで急落ではない
    gscPageWeek: gsc([pg('/exam/civil-construction-1/textbook/a', 10)]),
    gscPageBase: gsc([pg('/docs/civil-construction-1-textbook-a', 40)]),
  });
  const items = detectSeo(pack, ctx({ watchwords: [{ targetPath: '/exam/civil-construction-1/textbook/a', keyword: '過去問 解答' }] }));
  assert.deepEqual(items, []);
});

test('detectSeo reports a real traffic drop and multi-week decay', () => {
  const pack = basePack({ gscPageWeek: gsc([pg('/p', 2)]), gscPageBase: gsc([pg('/p', 40)]) });
  const drop = detectSeo(pack, ctx()).find((i) => i.type === 'seo-traffic-drop');
  assert.equal(drop.expectedWeeklyGain.value, 8);
  const hist = [20, 15, 10].map((c) => ({ sections: { gscPageWeek: gsc([pg('/q', c)]) } }));
  const decay = detectSeo(basePack({ gscPageWeek: gsc([pg('/q', 6)]) }), ctx({ history: hist })).find((i) => i.type === 'seo-decay');
  assert.equal(decay.expectedWeeklyGain.value, 14);
});

test('detectSeo flags cannibalization when one query spreads over several pages', () => {
  const pack = basePack({ gscPageQueryWeek: gsc([]), gscPageQueryBase: gsc([pq('/x', 'q', 0, 30, 9), pq('/y', 'q', 1, 25, 12)]) });
  const c = detectSeo(pack, ctx()).find((i) => i.type === 'seo-cannibalization');
  assert.equal(c.metrics.pages.length, 2);
});

test('detectRevenue finds low page CTA rates, weak placements, pages without CTA and quiz funnel drops', () => {
  const pack = basePack({ ga4Events: { ok: true, rows: [
    ev('/good', 'note_cta_impression', 100, 400), ev('/good', 'note_cta_click', 5, 20),
    ev('/weak', 'note_cta_impression', 100, 400), ev('/weak', 'note_cta_click', 0, 0),
    ev('/tools/kakomon-quiz', 'quiz_start', 50, 200), ev('/tools/kakomon-quiz', 'quiz_complete', 10, 120),
  ] } });
  const coverage = { rows: [{ page: '/nocta', users: 80, sessions: 100, gap: true, noteGap: false }], placementCtr: [
    { placement: 'sidebar', impressions: 10000, clicks: 0 }, { placement: 'article-mid', impressions: 5000, clicks: 30 }, { placement: 'article-top', impressions: 4000, clicks: 20 },
  ] };
  const items = detectRevenue(pack, ctx({ coverage }));
  const types = items.map((i) => `${i.type}:${i.key.page ?? i.key.placement}`).sort();
  assert.deepEqual(types, ['revenue-no-cta:/nocta', 'revenue-page-cta-rate:/weak', 'revenue-placement-ctr:sidebar', 'revenue-quiz-funnel-drop:/tools/kakomon-quiz']);
});

test('detectMeasurement surfaces failed/truncated sections, missing inputs, vanished events and bing mismatch', () => {
  const pack = basePack({
    ga4Landing: { ok: false, error: 'boom' },
    gscPageWeek: { ok: true, truncated: true, rows: [], rowCount: 10 },
    ga4Events: { ok: true, rows: [ev('/a', 'note_cta_click', 0, 80)] },
  });
  const items = detectMeasurement(pack, ctx({ inputs: [{ name: 'bing-webmaster', coverage: 'missing', note: '未取得' }], bingReconciliation: { ga4Sessions: 900, wmtClicks: 100, ratio: 9 } }));
  assert.deepEqual(items.map((i) => i.type).sort(), ['measurement-bing-mismatch', 'measurement-event-vanished', 'measurement-input-missing', 'measurement-section-failed', 'measurement-truncated']);
});

test('detectExperiments turns due experiments into triage items keyed by reason set', () => {
  const items = detectExperiments([{ id: 'EXP-1', title: 't', status: 'running', baseline: { x: 1 }, started_at: '2026-08-01', next_check_date: '2026-09-01' }], Date.parse('2026-09-20T00:00:00+09:00'));
  assert.equal(items.length, 1);
  assert.equal(items[0].key.reasons, 'MEASURE_DUE');
});

test('triage decisions suppress re-surfacing for a while (defer until date, reject longer than adopted)', () => {
  const log = { entries: [
    { id: 'A', action: 'backlog', weekStart: '2026-09-07' },
    { id: 'R', action: 'reject', weekStart: '2026-07-06' },
    { id: 'D', action: 'defer', until: '2026-10-01', weekStart: '2026-09-07' },
  ] };
  const opt = { weekStart: '2026-09-14', today: '2026-09-26', suppressWeeks: cfg.suppressWeeks };
  assert.equal(isSuppressed('A', log, opt), true);
  assert.equal(isSuppressed('A', log, { ...opt, weekStart: '2026-11-09' }), false);
  assert.equal(isSuppressed('R', log, opt), true);
  assert.equal(isSuppressed('D', log, opt), true);
  assert.equal(isSuppressed('D', log, { ...opt, today: '2026-10-01' }), false);
  assert.equal(isSuppressed('X', log, opt), false);
  // 同じ週の処分では抑止しない（トリアージ後の再実行で表示対象が入れ替わらない）
  const same = { entries: [{ id: 'S', action: 'backlog', week: '2026-W38', weekStart: '2026-09-14' }] };
  assert.equal(isSuppressed('S', same, { ...opt, week: '2026-W38' }), false);
  assert.equal(isSuppressed('S', same, { ...opt, weekStart: '2026-09-21', week: '2026-W39' }), true);
});

test('selectSurfaced caps SEO/revenue, keeps one SEO item per page and surfaces all measurement/experiment items', () => {
  const mk = (category, page, gain, n) => ({ id: `${category}-${n}`, category, key: { page }, expectedWeeklyGain: gain == null ? null : { value: gain } });
  const items = [
    ...Array.from({ length: 8 }, (_, n) => mk('seo', `/p${n % 6}`, 10 - n, n)),
    ...Array.from({ length: 5 }, (_, n) => mk('revenue', `/r${n}`, n, n)),
    mk('measurement', null, null, 1), mk('experiment', null, null, 1),
  ];
  const r = selectSurfaced(items, { log: { entries: [] }, weekStart: '2026-09-14', today: '2026-09-26', config: cfg });
  const seo = r.surfaced.filter((i) => i.category === 'seo');
  assert.equal(seo.length, cfg.surface.seo);
  assert.equal(new Set(seo.map((i) => i.key.page)).size, seo.length);
  assert.equal(r.surfaced.filter((i) => i.category === 'revenue').length, cfg.surface.revenue);
  assert.equal(r.surfaced.filter((i) => ['measurement', 'experiment'].includes(i.category)).length, 2);
  assert.equal(r.notSurfaced.revenue, 2);
});

test('KPIs and bing reconciliation treat missing data as missing, not zero', () => {
  const k = summarizeKpis(basePack({ ga4Landing: { ok: false } }), cfg.revenue);
  assert.deepEqual(k, { ga4: null, gsc: null, cta: null });
  const pack = basePack({ ga4Landing: { ok: true, rows: [{ page: '/a', group: 'bing', week: { sessions: 300 }, base: { sessions: 0 } }] } });
  assert.equal(reconcileBing(pack, null).wmtClicks, null);
  const bing = { sections: { traffic: { ok: true, rows: [{ date: '2026-09-14', clicks: 30 }, { date: '2026-09-20', clicks: 20 }, { date: '2026-09-21', clicks: 99 }] } } };
  assert.deepEqual([reconcileBing(pack, bing).wmtClicks, reconcileBing(pack, bing).ratio], [50, 6]);
});

test('buildDigest runs end-to-end on a fixture repository and renders the review marker', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'growth-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const d of ['.claude/config', '.claude/state/metrics/growth', 'public', 'content/site/civil-construction-1/textbook-a']) mkdirSync(join(root, d), { recursive: true });
  for (const f of ['.claude/config/growth-cycle.json', '.claude/config/business-direction.json', '.claude/config/seo-watchwords.json']) writeFileSync(join(root, f), readFileSync(f));
  writeFileSync(join(root, 'public/_redirects'), '/docs/civil-construction-1-textbook-a /exam/civil-construction-1/textbook/a 301\n');
  writeFileSync(join(root, 'content/site/civil-construction-1/textbook-a/article.mdx'), '---\ntitle: a\n---\n');
  writeFileSync(join(root, '.claude/state/experiments.json'), JSON.stringify({ experiments: [] }));
  writeFileSync(join(root, '.claude/state/metrics/growth/pack-2026-W38.json'), JSON.stringify(basePack({
    ga4Landing: { ok: true, rows: [{ page: '/exam/civil-construction-1/textbook/a', group: 'google', week: { sessions: 30, engagedSessions: 20, keyEvents: 0 }, base: { sessions: 100, engagedSessions: 60, keyEvents: 0 } }] },
    ga4Events: { ok: true, rows: [ev('/exam/civil-construction-1/textbook/a', 'note_cta_click', 3, 12)] },
    gscPageWeek: gsc([pg('/exam/civil-construction-1/textbook/a', 3)]),
    gscPageBase: gsc([pg('/docs/civil-construction-1-textbook-a', 12)]),
    gscPageQueryWeek: gsc([pq('/docs/civil-construction-1-textbook-a', '過去問 解答', 0, 40, 5)]),
    gscPageQueryBase: gsc([pq('/exam/civil-construction-1/textbook/a', '過去問 解答', 1, 120, 5)]),
  })));
  const d = buildDigest({ root, today: '2026-09-26' });
  assert.equal(d.week, '2026-W38');
  assert.equal(d.kpis.gsc.clicks, 3);
  const seo = d.surfaced.find((s) => s.type === 'seo-high-impr-low-ctr');
  assert.equal(seo.watchwordDraft.contentPath, 'content/site/civil-construction-1/textbook-a/article.mdx');
  assert.ok(d.surfaced.some((s) => s.type === 'measurement-input-missing'), 'monetization / bing が無いことを欠測として出す');
  const md = renderMarkdown(d);
  assert.match(md, /^<!-- growth-digest:2026-W38 -->/);
  assert.match(md, new RegExp(seo.id));
  assert.equal(buildDigest({ root, week: '2026-W30', today: '2026-09-26' }), null);
});
