import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPayload, classifyResponse, parseSitemap, selectRecentlyModified } from '../scripts/lib/indexnow.mjs';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://doboku-note.com/</loc><changefreq>weekly</changefreq></url>
<url><loc>https://doboku-note.com/exam/a</loc><lastmod>2026-09-16T00:00:00.000Z</lastmod></url>
<url><loc>https://doboku-note.com/exam/b</loc><lastmod>2026-09-01T00:00:00.000Z</lastmod></url>
<url><loc>https://doboku-note.com/standards</loc><lastmod>2026-08-29T00:00:00.000Z</lastmod></url>
</urlset>`;

test('sitemap から loc と lastmod（無ければ null）を取り出す', () => {
  const e = parseSitemap(xml);
  assert.equal(e.length, 4);
  assert.deepEqual(e[0], { loc: 'https://doboku-note.com/', lastmod: null });
  assert.equal(e[1].lastmod, '2026-09-16T00:00:00.000Z');
});

test('lastmod が since 以降の URL だけを選び、lastmod 無しは送らない', () => {
  const e = parseSitemap(xml);
  assert.deepEqual(selectRecentlyModified(e, '2026-09-10T00:00:00Z'), ['https://doboku-note.com/exam/a']);
  assert.deepEqual(selectRecentlyModified(e, new Date('2026-08-01T00:00:00Z')), [
    'https://doboku-note.com/exam/a',
    'https://doboku-note.com/exam/b',
    'https://doboku-note.com/standards',
  ]);
  assert.deepEqual(selectRecentlyModified(e, '2026-12-01T00:00:00Z'), []);
});

test('payload は host/key/keyLocation/urlList を持ち、10,000 件超は拒否する', () => {
  const p = buildPayload({ host: 'doboku-note.com', key: 'k', keyLocation: 'https://doboku-note.com/k.txt', urlList: ['https://doboku-note.com/x'] });
  assert.deepEqual(Object.keys(p), ['host', 'key', 'keyLocation', 'urlList']);
  assert.throws(() => buildPayload({ host: 'h', key: 'k', keyLocation: 'l', urlList: new Array(10001).fill('u') }), /10,000/);
});

test('200/202 だけを受理、403/422/429 は理由付きで失敗', () => {
  assert.equal(classifyResponse(200).ok, true);
  assert.equal(classifyResponse(202).ok, true);
  assert.equal(classifyResponse(403).ok, false);
  assert.match(classifyResponse(403).label, /key/);
  assert.match(classifyResponse(429).label, /spam/);
  assert.equal(classifyResponse(500).label, 'http-500');
});
