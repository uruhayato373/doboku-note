// 公開直後の検査（assertLiveBody）に足した「存在しないサイトリンク」と、不整合の 1 行整形（2026-09-24）。
// 配合計算-実戦演習の打ち間違い 2 本が note 上で 404 のまま残り、1 本ごとの検査では素通りだった。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { findBrokenSiteLinks, formatLiveIssues } from '../scripts/lib/note-live-check.mjs';
import { loadSiteRoutes } from '../scripts/lib/site-links.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'note-live-links-'));
const redirects = join(tmp, '_redirects');
writeFileSync(redirects, [
  '/docs/concrete-chief-engineer-textbook-mix-design /exam/concrete-chief-engineer/textbook/mix-design 301',
  '/docs/concrete-chief-engineer-primary-mix-design /exam/concrete-chief-engineer/primary/mix-design 301',
].join('\n') + '\n');
const routes = loadSiteRoutes(redirects);
const a = (href) => `<p><a href="${href}?utm_source=note&amp;utm_medium=referral">リンク</a></p>`;

test('存在しない新 URL（資格以降をハイフンでつないだ打ち間違い）を拾う', () => {
  const html = a('https://doboku-note.com/exam/concrete-chief-engineer/textbook-mix-design')
    + a('https://doboku-note.com/exam/concrete-chief-engineer/primary-mix-design');
  assert.deepEqual(findBrokenSiteLinks(html, routes), [
    '/exam/concrete-chief-engineer/textbook-mix-design',
    '/exam/concrete-chief-engineer/primary-mix-design',
  ]);
});

test('実在する新 URL・資格ハブ・転送先のある旧 /docs は拾わない', () => {
  const html = a('https://doboku-note.com/exam/concrete-chief-engineer/textbook/mix-design')
    + a('https://doboku-note.com/exam/concrete-chief-engineer')
    + a('https://doboku-note.com/docs/concrete-chief-engineer-primary-mix-design');
  assert.deepEqual(findBrokenSiteLinks(html, routes), []);
});

test('転送先の無い旧 /docs は拾い、/standards・/topics はここでは判定しない', () => {
  const html = a('https://doboku-note.com/docs/no-such-slug')
    + a('https://doboku-note.com/standards/some/part-1')
    + a('https://doboku-note.com/topics/anything');
  assert.deepEqual(findBrokenSiteLinks(html, routes), ['/docs/no-such-slug']);
});

test('同じリンクが本文とカードに 2 回出ても 1 件にまとめる', () => {
  const bad = 'https://doboku-note.com/exam/concrete-chief-engineer/textbook-mix-design';
  assert.equal(findBrokenSiteLinks(`${a(bad)}<figure data-src="${bad}"></figure>`, routes).length, 1);
});

test('_redirects を読めないときは判定しない（転送先が空だと全リンクを 404 扱いにしてしまう）', () => {
  const html = a('https://doboku-note.com/exam/concrete-chief-engineer/textbook/mix-design');
  assert.deepEqual(findBrokenSiteLinks(html, loadSiteRoutes(join(tmp, 'missing'))), []);
});

test('formatLiveIssues: 画像過多・太字記号・リンク切れを 1 行に並べる', () => {
  const chk = {
    urlHeadings: [], emptyBq: 0, imgLive: 2, imgShort: false, imgExcess: true,
    literalStars: ['経験記述は**「自分の答案'], brokenLinks: ['/exam/x/typo'], freeChars: 900, freeShort: false,
  };
  const line = formatLiveIssues(chk, 1);
  assert.match(line, /画像過多\(live=2\/期待=1/);
  assert.match(line, /太字記号1件/);
  assert.match(line, /存在しないサイトリンク\[\/exam\/x\/typo\]/);
  assert.equal(formatLiveIssues({ ...chk, imgExcess: false, literalStars: [], brokenLinks: [] }), 'なし');
});

test.after(() => rmSync(tmp, { recursive: true, force: true }));
