/**
 * 台帳 scripts/lib/datasets.mjs の freshness（最新の記録が何日古いと注意・失敗か）。
 * 閾値が 3 通りの流儀で散らばっていた（スクリプトの定数・関数の既定値・config の JSON）うち、台帳のデータセットに属するものを
 * 台帳の行に寄せた。検査と管理画面は freshnessOf・freshnessDays で読む。値そのものはここに写さない
 * （写すと台帳と二重になる）。形・読み出し・読み手が台帳から引いていることを固定する。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATASETS, freshnessDays, freshnessOf, freshnessProblems } from '../scripts/lib/datasets.mjs';
import { assessSnapshot } from '../scripts/lib/coconala-guards.mjs';
import { assessCloudflareMetrics } from '../scripts/lib/cloudflare-analytics.mjs';
import { evaluateSitemapsDue } from '../scripts/lib/gsc-sitemaps.mjs';
import { assessAfbOutcomesFreshness } from '../scripts/check-afb-outcomes-freshness.mjs';
import { assessIgInsights } from '../scripts/check-ig-insights-freshness.mjs';
import { assessSalesLog } from '../scripts/check-sales-freshness.mjs';
import { snapshotFreshness } from '../scripts/check-magazine-membership.mjs';
import { checkTriage } from '../scripts/check-growth-triage.mjs';
import { SCAN_STALE_DAYS } from '../scripts/lib/qualification-market.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 2, 12, 0, 0);
const ago = (days) => new Date(NOW - days * DAY).toISOString();

const declared = DATASETS.filter((x) => x.freshness);

test('台帳: freshness を宣言した行が実在し、全て正しい形（1 以上の整数・warnDays < failDays）', () => {
  assert.ok(declared.length >= 15, `宣言 ${declared.length} 件（検査ゼロを PASS にしない）`);
  for (const x of declared) assert.deepEqual(freshnessProblems(x.freshness), [], `${x.id}: ${JSON.stringify(x.freshness)}`);
});

test('freshnessProblems: 空・知らないキー・整数でない・0 以下・順序の逆を文にして返す', () => {
  assert.deepEqual(freshnessProblems({ warnDays: 10, failDays: 21 }), []);
  assert.deepEqual(freshnessProblems({ failDays: 9 }), []);
  assert.equal(freshnessProblems({}).length, 1);
  assert.match(freshnessProblems({ warnDays: 1, other: 2 }).join(), /知らないキー other/);
  assert.match(freshnessProblems({ failDays: 1.5 }).join(), /failDays は 1 以上の整数/);
  assert.match(freshnessProblems({ warnDays: 0 }).join(), /warnDays は 1 以上の整数/);
  assert.match(freshnessProblems({ warnDays: 21, failDays: 10 }).join(), /warnDays は failDays より小さく/);
});

test('freshnessOf・freshnessDays: 宣言が無ければ投げる（undefined との比較は常に偽で、古いまま緑になる）', () => {
  assert.throws(() => freshnessOf('config.exam-calendar'), /鮮度（freshness）が台帳に宣言されていない/);
  assert.throws(() => freshnessOf('no.such-dataset'), /台帳に無いデータセット/);
  assert.throws(() => freshnessDays('note.magazines', 'warnDays'), /freshness\.warnDays が台帳に宣言されていない/);
  const sales = freshnessOf('note.sales');
  assert.equal(freshnessDays('note.sales', 'warnDays'), sales.warnDays);
  assert.equal(freshnessDays('note.sales', 'failDays'), sales.failDays);
  assert.ok(sales.warnDays < sales.failDays);
});

test('freshnessOf: 廃止した id は後継の宣言へ読み替える', () => {
  assert.deepEqual(freshnessOf('note.competitors-latest'), freshnessOf('note.competitors'));
});

test('note.sales: 注意と失敗の境目（超えたら）は台帳の値どおり', () => {
  const { warnDays, failDays } = freshnessOf('note.sales');
  const dayStr = (daysAgo) => new Date(NOW - daysAgo * DAY).toISOString().slice(0, 10);
  const log = (daysAgo) => ({ updatedAt: dayStr(daysAgo), sales: [{ date: dayStr(daysAgo), price: 1 }] });
  const nowUtc = Date.parse(`${dayStr(0)}T00:00:00Z`);
  assert.equal(assessSalesLog(log(warnDays), nowUtc).status, 'OK');
  assert.equal(assessSalesLog(log(warnDays + 1), nowUtc).status, 'WARN');
  assert.equal(assessSalesLog(log(failDays), nowUtc).status, 'WARN');
  assert.equal(assessSalesLog(log(failDays + 1), nowUtc).status, 'FAIL');
});

test('ココナラの取引一覧: 既定の上限は台帳の failDays（上限ちょうどは古い扱い）', () => {
  const days = freshnessDays('coconala.orders-snapshot', 'failDays');
  const snap = (daysAgo) => ({ status: 'ok', fetchedAt: ago(daysAgo) });
  assert.equal(assessSnapshot(snap(days - 0.5), NOW).ok, true);
  assert.equal(assessSnapshot(snap(days), NOW).ok, false);
  assert.equal(assessSnapshot(snap(days), NOW, { staleDays: days + 1 }).ok, true, '上限は渡して変えられる');
});

test('Cloudflare・afb・Instagram・note マガジン・成長ダイジェスト: 既定の上限は台帳の failDays（超えたら失敗）', () => {
  const cfDays = freshnessDays('cloudflare.zone', 'failDays');
  const cf = (daysAgo) => ({ fetchedAt: ago(daysAgo), counts: { daysReturned: 7 } });
  assert.equal(assessCloudflareMetrics(cf(cfDays), NOW).status, 'OK');
  assert.equal(assessCloudflareMetrics(cf(cfDays + 0.5), NOW).status, 'FAIL');

  const afbDays = freshnessDays('afb.outcomes', 'failDays');
  const afb = (daysAgo) => ({ siteId: 's', observedAt: ago(daysAgo), basis: { occurrence: { rows: 1 }, recognition: { rows: 1 } } });
  assert.equal(assessAfbOutcomesFreshness({ latest: afb(afbDays) }, NOW).status, 'OK');
  assert.equal(assessAfbOutcomesFreshness({ latest: afb(afbDays + 1) }, NOW).status, 'FAIL');

  const igDays = freshnessDays('instagram.insights', 'failDays');
  const ig = (daysAgo) => ({ fetchedAt: ago(daysAgo), counts: { mediaListed: 3 }, token: { type: 'long', expiresAt: 0, dataAccessExpiresAt: 0 } });
  assert.equal(assessIgInsights(ig(igDays), NOW).status, 'OK');
  assert.equal(assessIgInsights(ig(igDays + 1), NOW).status, 'FAIL');

  const magDays = freshnessDays('note.magazines', 'failDays');
  assert.equal(snapshotFreshness(ago(magDays), NOW).ok, true);
  assert.equal(snapshotFreshness(ago(magDays + 1), NOW).ok, false);

  const digestDays = freshnessDays('analysis.growth-digest', 'failDays');
  const triage = (daysAgo) => checkTriage({ digest: { week: '2026-W40', generatedAt: ago(daysAgo), surfaced: [] }, log: {}, review: '<!-- growth-digest:2026-W40 -->', reviewName: 'r.md', now: NOW });
  assert.equal(triage(digestDays).invalid, undefined);
  assert.match(triage(digestDays + 1).invalid, /fetch-metrics の停止を疑う/);
});

test('gsc.sitemaps: 記録の古さの既定は台帳の warnDays（超えたら DUE）。Google の最終読み込みの許容日数は別', () => {
  const days = freshnessDays('gsc.sitemaps', 'warnDays');
  const healthy = (daysAgo) => ({ fetchedAt: ago(daysAgo), robotsSitemaps: [], sitemaps: [], submit: [] });
  assert.equal(evaluateSitemapsDue({ latest: healthy(days), now: new Date(NOW) }).due, false);
  assert.equal(evaluateSitemapsDue({ latest: healthy(days + 1), now: new Date(NOW) }).due, true);
});

test('市場スキャン: 古いとみなす日数は台帳 analysis.qualification-market の warnDays（競合の再取得の検査と同じ値を 1 か所から）', () => {
  assert.equal(SCAN_STALE_DAYS, freshnessDays('analysis.qualification-market', 'warnDays'));
});

test('読み手は閾値を台帳から読む（検査・管理画面に写しを置いていない）', () => {
  const readers = [
    ['scripts/check-sales-freshness.mjs', 'note.sales'],
    ['scripts/lib/coconala-guards.mjs', 'coconala.orders-snapshot'],
    ['scripts/check-coconala-analytics.mjs', 'coconala.analytics'],
    ['scripts/check-magazine-membership.mjs', 'note.magazines'],
    ['tools/admin-app/src/lib/note-status.ts', 'note.magazines'],
    ['tools/admin-app/src/lib/note-status.ts', 'note.status'],
    ['scripts/check-growth-triage.mjs', 'analysis.growth-digest'],
    ['scripts/report-web-vitals.mjs', 'rum.web-vitals'],
    ['scripts/check-ga4-custom-dimensions.mjs', 'ga4.admin-inventory'],
    ['scripts/lib/qualification-market.mjs', 'analysis.qualification-market'],
    ['scripts/check-afb-outcomes-freshness.mjs', 'afb.outcomes'],
    ['scripts/check-ig-insights-freshness.mjs', 'instagram.insights'],
    ['scripts/check-cloudflare-metrics-freshness.mjs', 'cloudflare.zone'],
    ['scripts/lib/cloudflare-analytics.mjs', 'cloudflare.zone'],
    ['scripts/lib/gsc-sitemaps.mjs', 'gsc.sitemaps'],
    ['scripts/check-a8-report-due.mjs', 'a8.ui-last-run'],
    ['scripts/check-gsc-ui-due.mjs', 'gsc.ui-last-run'],
    ['.claude/scripts/report-career-funnel.mjs', 'ga4.reports'],
  ];
  for (const [file, id] of readers) {
    const src = readFileSync(join(ROOT, file), 'utf8');
    assert.match(src, new RegExp(`freshnessDays\\(\\s*['"]${id.replace('.', '\\.')}['"]`), `${file} は ${id} の閾値を台帳（freshnessDays）から読む`);
  }
  // 競合の再取得は、チャネルごとのデータセットの宣言を引く（id は PLATFORMS の dataset から）
  const competitor = readFileSync(join(ROOT, 'scripts/check-competitor-scan-due.mjs'), 'utf8');
  assert.match(competitor, /freshnessDays\(dataset, 'warnDays'\)/);
  for (const id of ['note.competitors', 'coconala.competitors', 'x.competitors', 'instagram.competitors', 'analysis.qualification-market']) {
    assert.ok(freshnessDays(id, 'warnDays') > 0, `${id} の warnDays が台帳に無い`);
  }
});
