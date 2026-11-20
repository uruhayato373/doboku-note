import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTechnicalSeoReport } from '../scripts/reports/report-technical-seo.mjs';
import { exitCodeOf } from '../scripts/lib/run-audit.mjs';

const NOW = Date.parse('2026-11-18T00:00:00Z');
const day = (date, over = {}) => ({ date, generatedAt: `${date}T00:00:00Z`, sitemapUrls: 100, checked: 100, errors: 0, warnings: 3, errorsByCode: {}, ...over });
const base = () => ({
  build: { history: [day('2026-11-16'), day('2026-11-17')] },
  meta: { generated_at: '2026-11-15T00:00:00Z', summary: { by_severity: { HIGH: 0 } }, violations_by_type: {} },
  coverage: { entries: [{ date: '2026-11-01', indexed_ratio: 0.9, sitemap_urls: 100 }, { date: '2026-11-10', indexed_ratio: 0.9, sitemap_urls: 100 }] },
  sitemaps: { sitemaps: [{ path: 'https://x/sitemap.xml', errors: 0, warnings: 0, lastDownloaded: '2026-11-16T00:00:00Z' }] },
  now: NOW,
});

test('正常: FAIL 0・4 記録を読んだ・exit 0', () => {
  const r = buildTechnicalSeoReport(base());
  assert.equal(r.checked, 4);
  assert.deepEqual(r.fail, []);
  assert.equal(exitCodeOf(r), 0);
});

test('error 増加・coverage 低下・sitemap エラーは悪化として拾い FAIL は exit 1', () => {
  const b = base();
  b.build.history.push(day('2026-11-18', { errors: 2, errorsByCode: { canonical_mismatch: 2 }, warnings: 9 }));
  b.coverage.entries.push({ date: '2026-11-17', indexed_ratio: 0.8, sitemap_urls: 100 });
  b.sitemaps.sitemaps[0].errors = 1;
  const r = buildTechnicalSeoReport(b);
  assert.ok(r.flags.some((f) => f.code === 'build-worse' && f.message.includes('canonical_mismatch')));
  assert.ok(r.flags.some((f) => f.code === 'build-warn-up'));
  assert.ok(r.flags.some((f) => f.code === 'coverage-drop'));
  assert.ok(r.fail.some((m) => m.includes('build 検査に error 2')));
  assert.ok(r.fail.some((m) => m.includes('Google 側のエラー')));
  assert.equal(exitCodeOf(r), 1);
});

test('古い記録は欠測 WARN になる', () => {
  const b = base();
  b.meta.generated_at = '2026-09-01T00:00:00Z';
  const r = buildTechnicalSeoReport({ ...b, now: Date.parse('2026-11-30T00:00:00Z') });
  assert.ok(r.flags.some((f) => f.code === 'build-stale'));
  assert.ok(r.flags.some((f) => f.code === 'meta-stale'));
});

test('記録が 1 つも読めない（対象 0 件）は検査不成立 exit 2', () => {
  const r = buildTechnicalSeoReport({ build: null, meta: null, coverage: null, sitemaps: null, now: NOW });
  assert.equal(r.checked, 0);
  assert.equal(exitCodeOf(r), 2);
});
