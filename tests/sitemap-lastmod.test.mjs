import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSitemapEntry, resolveStaticLastmod } from '../scripts/lib/sitemap-lastmod.mjs';

test('基準書の生成ページは catalog.asOf を lastmod に使う', () => {
  const expected = '2026-08-29T00:00:00.000Z';
  assert.equal(resolveStaticLastmod('/standards', '2026-08-29'), expected);
  assert.equal(resolveStaticLastmod('/standards/kinki/common/chapters/1-1', '2026-08-29'), expected);
});

test('MDXガイドと根拠日のない静的ページは lastmod を出さない', () => {
  assert.equal(resolveStaticLastmod('/standards/guides/example', '2026-08-29'), undefined);
  assert.equal(resolveStaticLastmod('/exam', '2026-08-29'), undefined);
  assert.equal(resolveStaticLastmod('/about', '2026-08-29'), undefined);
});

test('sitemapエントリは lastmod が未定義なら要素を省略する', () => {
  const entry = renderSitemapEntry({
    loc: 'https://doboku-note.com/about',
    changefreq: 'yearly',
    priority: '0.3',
  });
  assert.equal(entry.includes('<lastmod>'), false);
  assert.match(entry, /<loc>https:\/\/doboku-note\.com\/about<\/loc>/);
});
