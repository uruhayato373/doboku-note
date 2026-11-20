/* global process, URL */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { classifyPath, buildReport, stats, censusExitCode, loadSitemap, readRows, BLOCK } from '../scripts/reports/site-layout-census.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const fixture = [100, 300, 500, 900].map((empty, i) => ({
  url: `https://example.test/exam/c/guide/${i}`, path: `/exam/c/guide/${i}`, width: 'pc', status: 200,
  pageKind: 'doc', category: 'c', group: 'guide', docH: 1000, mainH: 1000, hasRail: true,
  railContentEnd: 1000 - empty, railEmptyPx: empty, railEmptyRatio: empty / 1000,
  articleTop: 100 + i * 400, firstViewHasBody: i < 2, h2Count: 6,
  tocInBody: { visible: i === 0, count: i === 0 ? 6 : 0 }, tocInRail: { count: i === 1 ? 6 : 0, h: 200 },
  navigation: [{ label: 'related', links: 4, withThumb: i, inRail: false, top: 800 }],
  ads: i === 0 ? [] : [{ placement: 'footer', top: 800, inRail: false }], notes: [],
  overflowX: i === 2 ? 20 : 0, brokenImages: i === 3 ? 1 : 0,
}));

test('path classification follows the actual route hierarchy', () => {
  const cases = {
    '/': 'home', '/exam/c/': 'exam-category', '/exam/c/primary/test': 'doc', '/exam/c/past-exams/test': 'doc',
    '/practice/concrete': 'doc', '/laws/labor': 'doc', '/laws': 'laws-list', '/practice': 'other', '/exam': 'other',
    '/standards': 'standards-list', '/standards/a/d': 'standards-list',
    '/standards/a/d/chapters/1': 'standards-chapter', '/standards/a/d/chapters/1/sections/2': 'standards-section',
    '/topics': 'topic-list', '/topics/foo': 'topic', '/tools/foo': 'tool', '/about': 'other',
  };
  for (const [path, kind] of Object.entries(cases)) assert.equal(classifyPath(path).pageKind, kind, path);
  assert.deepEqual(classifyPath('/exam/c/keywords/foo'), { pageKind: 'doc', category: 'c', group: 'keywords' });
});

test('statistics, surfaces and representative selection exclude missing rails and failed measurements', () => {
  const report = buildReport([...fixture, { ...fixture[0], width: 'sp', hasRail: false, railEmptyPx: null, railEmptyRatio: null, navigation: [], ads: [] }, { ...fixture[0], url: 'https://example.test/fail', status: 500, error: 'HTTP 500' }]);
  assert.deepEqual(report.counts, { target: 6, measured: 5, failed: 1 });
  assert.deepEqual(report.groups[0].railEmptyPx, { median: 400, p90: 900, max: 900 });
  assert.equal(report.groups[0].railHalfEmpty, 2);
  assert.deepEqual(report.groups[1].railEmptyPx, { median: null, p90: null, max: null });
  assert.equal(report.navigation[0].links, 16);
  assert.equal(report.navigation[0].thumbRatio, 6 / 16);
  assert.equal(report.navigation[0].pages, 4);
  assert.ok(Math.abs(report.ads[0].meanPositionRatio - 0.8) < 1e-10);
  assert.equal(report.missingToc.length, 2);
  assert.equal(report.toc[0].none, 2);
  assert.equal(report.samples[0].path, fixture[1].path);
  assert.equal(report.samples[1].path, fixture[3].path);
  assert.equal(report.noFirstViewBody[0].count, 2);
  assert.equal(report.overflow.length, 1);
  assert.equal(report.brokenImages.length, 1);
  assert.deepEqual(stats([1, 2, 3]), { median: 2, p90: 3, max: 3 });
});

test('resume rows are deduplicated by URL and width, latest retry replaces failure', () => {
  const report = buildReport([{ ...fixture[0], error: 'timeout' }, fixture[0], { ...fixture[0], width: 'sp' }]);
  assert.deepEqual(report.counts, { target: 2, measured: 2, failed: 0 });
});

test('exit distinguishes zero targets, dominant failure and connection failure', () => {
  assert.equal(censusExitCode({ target: 0, measured: 0, failed: 0 }), 1);
  assert.equal(censusExitCode({ target: 10, measured: 8, failed: 2 }), 0);
  assert.equal(censusExitCode({ target: 10, measured: 7, failed: 3 }), 1);
  assert.equal(censusExitCode({ target: 1, measured: 0, failed: 1 }), 1);
  assert.equal(censusExitCode({ target: 0, measured: 0, failed: 0, connectionError: true }), 2);
});

test('sitemap index recursively loads children, decodes entities and preserves the base origin', () => {
  const xml = new Map([
    ['/sitemap.xml', '<sitemapindex><sitemap><loc>https://prod.test/child.xml</loc></sitemap><sitemap><loc>https://prod.test/sitemap.xml</loc></sitemap></sitemapindex>'],
    ['/child.xml', '<urlset><url><loc>https://prod.test/a?x=1&amp;y=2</loc></url><url><loc><![CDATA[https://prod.test/b]]></loc></url></urlset>'],
  ]);
  assert.deepEqual(loadSitemap('http://localhost:3025', url => xml.get(new URL(url).pathname)), ['http://localhost:3025/a?x=1&y=2', 'http://localhost:3025/b']);
  assert.throws(() => loadSitemap('https://example.test', () => '<html>oops</html>'), /XML/);
  // &amp;lt; は &lt; に戻すだけで、< まで二重に戻さない
  const once = loadSitemap('https://example.test', () => '<urlset><url><loc>https://example.test/q?a=&amp;lt;b</loc></url></urlset>');
  assert.deepEqual(once, ['https://example.test/q?a=&lt;b']);
});

test('partial final JSONL line can be repaired without losing completed rows', () => {
  const dir = mkdtempSync(join(tmpdir(), 'census-'));
  try {
    const file = join(dir, 'rows.jsonl');
    writeFileSync(file, `${JSON.stringify(fixture[0])}\n{"url":`);
    assert.equal(readRows(file, true).length, 1);
    assert.equal(readFileSync(file, 'utf8'), `${JSON.stringify(fixture[0])}\n`);
    writeFileSync(file, '{broken}\n{}\n');
    assert.throws(() => readRows(file, true));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('report CLI runs offline, writes all artifacts and returns inconclusive for dominant failures', () => {
  const dir = mkdtempSync(join(tmpdir(), 'census-report-'));
  try {
    const run = () => spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/reports/site-layout-census.mjs'), '--report', dir], { encoding: 'utf8', cwd: dir });
    writeFileSync(join(dir, 'rows.jsonl'), fixture.map(r => JSON.stringify(r)).join('\n'));
    const good = run();
    assert.equal(good.status, 0, good.stderr);
    assert.match(good.stdout, /対象 4・実測 4・失敗 0/);
    assert.match(readFileSync(join(dir, 'report.md'), 'utf8'), /回遊の面/);
    assert.equal(JSON.parse(readFileSync(join(dir, 'samples.json'), 'utf8')).length, 2);
    writeFileSync(join(dir, 'rows.jsonl'), fixture.map((r, i) => JSON.stringify(i ? { ...r, error: 'HTTP 500', status: 500 } : r)).join('\n'));
    const bad = run();
    assert.equal(bad.status, 1, bad.stderr);
    assert.match(bad.stdout, /対象 4・実測 1・失敗 3/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('tracking routes block analytics and ASP pixels but keep banner assets', () => {
  for (const url of ['https://www.googletagmanager.com/gtm.js', 'https://www.google-analytics.com/g/collect', 'https://www18.a8.net/0.gif?a8mat=abc', 'https://i.moshimo.com/af/i/impression?a_id=1', 'https://www.afi-b.com/lead/abc']) assert.ok(BLOCK.test(url), url);
  assert.equal(BLOCK.test('https://www.afi-b.com/upload/banner.jpg'), false);
});


test('resume restores original URL/width plan and skips completed rows without a browser or sitemap request', () => {
  const dir = mkdtempSync(join(tmpdir(), 'census-resume-'));
  try {
    writeFileSync(join(dir, 'rows.jsonl'), `${JSON.stringify(fixture[0])}\n`);
    writeFileSync(join(dir, 'plan.json'), JSON.stringify({ base: 'https://invalid.test', tasks: [fixture[0]] }));
    const result = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/reports/site-layout-census.mjs'), '--resume', dir], { encoding: 'utf8', cwd: dir });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /対象 1・実測 1・失敗 0/);
    const summary = JSON.parse(readFileSync(join(dir, 'summary.json'), 'utf8'));
    assert.equal(summary.target, 1);
    assert.equal(summary.notMeasured, 0);
    assert.equal(readRows(join(dir, 'rows.jsonl')).length, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
