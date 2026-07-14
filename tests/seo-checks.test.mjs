import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseHtmlFile,
  extractSeo,
  normalizeInternalHref,
  normalizeUrlForCompare,
  runIndexablePageChecks,
  checkSelfCanonical,
  checkOgUrl,
  checkJsonLd,
  checkSsr,
  checkSiteNameDup,
  isNoindex,
} from '../scripts/lib/seo-checks.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIX = join(__dirname, 'fixtures', 'seo');
const codesOf = (findings) => findings.map((f) => f.code);
const errorCodesOf = (findings) => findings.filter((f) => f.level === 'error').map((f) => f.code);

test('valid.html は indexable 検査で error を出さない', () => {
  const seo = parseHtmlFile(join(FIX, 'valid.html'));
  const findings = runIndexablePageChecks(seo, '/docs/test-article');
  assert.deepEqual(errorCodesOf(findings), [], `想定外 error: ${JSON.stringify(findings)}`);
});

test('valid.html は canonical/og:url/robots/main/H1 を正しく抽出する', () => {
  const seo = parseHtmlFile(join(FIX, 'valid.html'));
  assert.equal(seo.canonical, 'https://doboku-note.com/docs/test-article');
  assert.equal(seo.ogUrl, 'https://doboku-note.com/docs/test-article');
  assert.equal(seo.hasMain, true);
  assert.equal(seo.hasH1, true);
  assert.equal(isNoindex(seo), false);
  assert.equal(seo.jsonLd.length, 2);
});

test('canonical-mismatch.html は canonical_mismatch と og_url_mismatch を error で出す', () => {
  const seo = parseHtmlFile(join(FIX, 'canonical-mismatch.html'));
  assert.deepEqual(
    checkSelfCanonical(seo, '/docs/canonical-mismatch').map((f) => f.code),
    ['canonical_mismatch'],
  );
  assert.deepEqual(
    checkOgUrl(seo, '/docs/canonical-mismatch').map((f) => f.code),
    ['og_url_mismatch'],
  );
});

test('noindex.html は isNoindex=true・indexable 期待だと unexpected_noindex を出す', () => {
  const seo = parseHtmlFile(join(FIX, 'noindex.html'));
  assert.equal(isNoindex(seo), true);
  const findings = runIndexablePageChecks(seo, '/search', { expectIndexable: true });
  assert.ok(errorCodesOf(findings).includes('unexpected_noindex'));
});

test('noindex.html を expectIndexable=false で検査すると noindex を咎めない', () => {
  const seo = parseHtmlFile(join(FIX, 'noindex.html'));
  const findings = runIndexablePageChecks(seo, '/search', { expectIndexable: false });
  assert.ok(!errorCodesOf(findings).includes('unexpected_noindex'));
});

test('jsonld-broken.html は jsonld_parse_error を error で出す', () => {
  const seo = parseHtmlFile(join(FIX, 'jsonld-broken.html'));
  const findings = checkJsonLd(seo);
  assert.ok(findings.some((f) => f.code === 'jsonld_parse_error' && f.level === 'error'));
});

test('no-main-sitename-dup.html は ssr_no_main / description_missing / title_sitename_dup を error で出す', () => {
  const seo = parseHtmlFile(join(FIX, 'no-main-sitename-dup.html'));
  const ssr = checkSsr(seo);
  assert.ok(ssr.some((f) => f.code === 'ssr_no_main' && f.level === 'error'));
  // main が無いので thin_body は二重報告しない
  assert.ok(!ssr.some((f) => f.code === 'ssr_thin_body'));
  assert.ok(checkSiteNameDup(seo).some((f) => f.code === 'title_sitename_dup' && f.level === 'error'));
  const findings = runIndexablePageChecks(seo, '/docs/no-main');
  assert.ok(errorCodesOf(findings).includes('description_missing'));
});

test('thin body は main/H1 があれば warn（error にしない）', () => {
  const html =
    '<!doctype html><html><head><title>t</title>' +
    '<link rel="canonical" href="https://doboku-note.com/x"><meta property="og:url" content="https://doboku-note.com/x">' +
    '</head><body><main><h1>H</h1><p>短い</p></main></body></html>';
  const ssr = checkSsr(extractSeo(html));
  const thin = ssr.find((f) => f.code === 'ssr_thin_body');
  assert.ok(thin, 'ssr_thin_body が出るべき');
  assert.equal(thin.level, 'warn');
});

test('normalizeInternalHref は内部パスのみ抽出し外部/アンカーを除外する', () => {
  assert.equal(normalizeInternalHref('/docs/foo'), '/docs/foo');
  assert.equal(normalizeInternalHref('/docs/foo#bar?x=1'), '/docs/foo');
  assert.equal(normalizeInternalHref('https://doboku-note.com/about'), '/about');
  assert.equal(normalizeInternalHref('https://example.com/x'), null);
  assert.equal(normalizeInternalHref('#top'), null);
  assert.equal(normalizeInternalHref('mailto:a@b.com'), null);
});

test('normalizeUrlForCompare は www と末尾スラッシュを吸収する', () => {
  assert.equal(
    normalizeUrlForCompare('https://www.doboku-note.com/about/'),
    normalizeUrlForCompare('https://doboku-note.com/about'),
  );
});

test('checkJsonLd は WebSite/Organization の name を headline 乖離扱いしない', () => {
  const html =
    '<!doctype html><html><head><title>記事タイトル</title>' +
    '<script type="application/ld+json">{"@type":"WebSite","name":"doboku-note"}</script>' +
    '<script type="application/ld+json">{"@type":"Organization","name":"doboku-note"}</script>' +
    '</head><body><main><h1>記事タイトル</h1><p>x</p></main></body></html>';
  const findings = checkJsonLd(extractSeo(html));
  assert.ok(!findings.some((f) => f.code === 'jsonld_headline_mismatch'));
  void codesOf;
});
