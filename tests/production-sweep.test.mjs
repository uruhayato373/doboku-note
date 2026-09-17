import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyPage, extractSeo, missingHeaders, parseSitemapLocs, splitCurlOutput, summarize } from '../scripts/lib/production-sweep.mjs';

const U = 'https://doboku-note.com/exam/a/b';
const okHtml = `<html><head><link rel="canonical" href="${U}"/><meta property="og:image" content="https://storage.doboku-note.com/x/ogp.png"/></head><body><main>本文</main></body></html>`;

test('curl のフッタから code / redirect_url / content_type を切り出す', () => {
  const r = splitCurlOutput('BODY\n__META__301\thttps://x/\ttext/html');
  assert.deepEqual(r, { code: '301', redirectUrl: 'https://x/', contentType: 'text/html', body: 'BODY' });
  assert.equal(splitCurlOutput('').code, '000');
});

test('sitemap の loc と HTML の canonical / og:image / main / noindex を読む', () => {
  assert.deepEqual(parseSitemapLocs('<url><loc>https://a/</loc></url><url><loc> https://b </loc></url>'), ['https://a/', 'https://b']);
  const seo = extractSeo(okHtml);
  assert.equal(seo.canonical, U);
  assert.equal(seo.ogImage, 'https://storage.doboku-note.com/x/ogp.png');
  assert.equal(seo.hasMain, true);
  assert.equal(seo.noindex, false);
});

test('200・自己 canonical・main あり は ok、それ以外は理由付きで fail、000 は unreachable', () => {
  assert.equal(classifyPage(U, { code: '200', redirectUrl: '', body: okHtml }).level, 'ok');
  const redirected = classifyPage(U, { code: '301', redirectUrl: 'https://doboku-note.com/new', body: '' });
  assert.equal(redirected.level, 'fail');
  assert.match(redirected.reasons[0], /301/);
  const wrongCanonical = classifyPage(U, { code: '200', redirectUrl: '', body: okHtml.replace(U, 'https://doboku-note.com/docs/old') });
  assert.match(wrongCanonical.reasons.join(' '), /canonical が自分自身でない/);
  const noMain = classifyPage(U, { code: '200', redirectUrl: '', body: okHtml.replace('<main>本文</main>', '') });
  assert.match(noMain.reasons.join(' '), /<main>/);
  assert.equal(classifyPage(U, { code: '000', redirectUrl: '', body: '' }).level, 'unreachable');
});

test('必須セキュリティヘッダの不足を列挙する（大文字小文字を無視）', () => {
  const h = 'HTTP/2 200\r\nStrict-Transport-Security: max-age=1\r\nx-content-type-options: nosniff\r\nReferrer-Policy: x\r\n';
  assert.deepEqual(missingHeaders(h), ['x-frame-options']);
});

test('全体判定: unreachable 5% 超は exit 2、fail/og/ヘッダ不足は exit 1、全部良ければ exit 0', () => {
  const ok = { url: 'u', level: 'ok', reasons: [] };
  const un = { url: 'u', level: 'unreachable', reasons: [] };
  const fail = { url: 'u', level: 'fail', reasons: ['x'] };
  assert.equal(summarize({ pages: [], ogImages: [], headersMissing: [] }).exitCode, 2);
  assert.equal(summarize({ pages: [ok, ok, un], ogImages: [], headersMissing: [] }).exitCode, 2);
  assert.equal(summarize({ pages: Array(100).fill(ok).concat([un]), ogImages: [], headersMissing: [] }).exitCode, 0);
  assert.equal(summarize({ pages: [ok, fail], ogImages: [], headersMissing: [] }).exitCode, 1);
  assert.equal(summarize({ pages: [ok], ogImages: [{ url: 'o', code: '404' }], headersMissing: [] }).exitCode, 1);
  assert.equal(summarize({ pages: [ok], ogImages: [], headersMissing: ['x-frame-options'] }).exitCode, 1);
});
