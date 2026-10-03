import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { writeReport } from '../scripts/lib/metric-reports.mjs';
import { datasetPath } from '../scripts/lib/datasets.mjs';

const repo = resolve(import.meta.dirname, '..');
const slug = 'pe-first-stage-r07-basic';
const current = '/exam/pe-first-stage/primary/r07-basic';
const legacy = `/docs/${slug}`;
const guide = '/exam/civil-construction-1/guide/exam-overview';
const practice = '/practice/ai-document-verification';
const window = { startDate: '2026-09-04', endDate: '2026-10-01' };

function fixture(pageRows, fn) {
  mkdirSync(join(repo, '.tmp'), { recursive: true });
  const root = mkdtempSync(join(repo, '.tmp/monetization-test-'));
  try {
    mkdirSync(join(root, 'src/config'), { recursive: true });
    mkdirSync(join(root, '.claude/config'), { recursive: true });
    symlinkSync(join(repo, '.claude/config/magazine-cta-baseline.json'), join(root, '.claude/config/magazine-cta-baseline.json'));
    // Routes are resolved by the site's actual index; only traffic and body are fixtures.
    symlinkSync(join(repo, 'src/config/doc-meta-index.json'), join(root, 'src/config/doc-meta-index.json'));
    mkdirSync(join(root, 'content/site/pe-first-stage/r07-basic'), { recursive: true });
    writeFileSync(join(root, 'content/site/pe-first-stage/r07-basic/article.mdx'),
      '# 問題\n\n## 解説\n本文\n\n## 参考資料\n<MagazineCard id="civil-1-anki-note" />\n');
    writeReport(root, 'ga4.page', { meta: window, rows: pageRows }, { stamp: '2026-10-02T00-00-00' });
    writeReport(root, 'ga4.cta-clicks', { meta: window, rows: [
      { page: current, eventName: 'note_cta_click', eventCount: 4 },
      { page: legacy, eventName: 'note_cta_click', eventCount: 2 },
    ] }, { stamp: '2026-10-02T00-00-00' });
    writeReport(root, 'ga4.cta-clicks-by-label', { meta: window, rows: [
      { label: 'pe1-takuitsu-pdf:fixture', eventName: 'note_cta_click', eventCount: 4 },
    ] }, { stamp: '2026-10-02T00-00-00' });
    const salesPath = join(root, datasetPath('note.sales'));
    mkdirSync(resolve(salesPath, '..'), { recursive: true });
    writeFileSync(salesPath, JSON.stringify({ sales: [
      { date: '2026-09-03', productId: 'pe1-takuitsu-pdf', price: 100 },
      { date: '2026-09-04', productId: 'pe1-takuitsu-pdf', price: 200 },
      { date: '2026-10-01', productId: 'pe1-takuitsu-pdf', price: 300 },
      { date: '2026-10-02', productId: 'pe1-takuitsu-pdf', price: 400 },
    ] }));
    const result = spawnSync(process.execPath, [
      join(repo, 'node_modules/tsx/dist/cli.mjs'), '--tsconfig', join(repo, 'tsconfig.json'),
      join(repo, '.claude/scripts/report-monetization-coverage.mts'), '--check', '--json',
    ], { cwd: root, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    fn(result, root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const traffic = [current, legacy, guide, practice, '/exam/pe-first-stage', '/tools/fixture']
  .map((page, i) => ({ page, activeUsers: 50 + i, sessions: 80 + i }));

test('canonical exam, guide, practice and hub traffic joins; legacy users stay separate', () => {
  fixture(traffic, (result) => {
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    const row = (page) => report.rows.find((r) => r.page === page);
    for (const input of traffic.slice(0, 5)) assert.equal(row(input.page)?.users, input.activeUsers, input.page);
    assert.equal(row(current).noteClicks, 4);
    assert.equal(row(legacy).noteClicks, 2);
    assert.ok(row(current).noteCta.includes('pe1-takuitsu-pdf'));
    assert.ok(!row(current).noteCta.includes('civil-1-anki-note'), 'reference-only card is not rendered');
    assert.deepEqual(report.coverage, { trafficRows: 6, matchedTrafficRows: 5, unmatchedTrafficPages: ['/tools/fixture'] });
    assert.equal(report.noteLabelSales[0].salesCount, 2);
    assert.equal(report.noteLabelSales[0].revenue, 500, 'sales share the label click window, inclusive');
    assert.deepEqual(report.meta.labelSalesWindow, { start: window.startDate, end: window.endDate });
  });
});

for (const [name, rows] of [['empty', []], ['unmatched', [{ page: '/tools/fixture', activeUsers: 20, sessions: 30 }]]]) {
  test(`${name} input is inconclusive, never a successful coverage report`, () => {
    fixture(rows, (result) => {
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /集計不成立/);
      assert.equal(result.stdout, '');
    });
  });
}
