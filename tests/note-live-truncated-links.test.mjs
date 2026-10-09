// 公開直後の検査（assertLiveBody）に足した「途中で切れたリンク」（2026-10-07）。
// 経験記述の無料記事で、原稿の https://coconala.com/services/4418735 が公開本文では
// https://coconala.com/servi になっていたが、[5e] は自サイト宛てしか見ず通っていた。
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extractSourceUrls, findTruncatedLinks, formatLiveIssues } from '../scripts/lib/note-live-check.mjs';

const md = [
  '自分の答案を人の目で確かめたいときは、ココナラで個別に対応しています。',
  '',
  'https://coconala.com/services/4418735',
  '',
  'https://coconala.com/services/4350199',
  '',
  '詳しくは[もくじ](https://note.com/dobokunote/n/n7279ca0d926f)へ。',
  '運営者は https://note.com/dobokunote です。',
  'サイトは https://doboku-note.com/exam/pe-comprehensive-management/ にあります。',
].join('\n');

test('原稿の URL を拾う（カード行・本文リンク・末尾の句読点は落とす）', () => {
  assert.deepEqual(extractSourceUrls(md), [
    'https://coconala.com/services/4418735',
    'https://coconala.com/services/4350199',
    'https://note.com/dobokunote/n/n7279ca0d926f',
    'https://note.com/dobokunote',
    'https://doboku-note.com/exam/pe-comprehensive-management/',
  ]);
});

test('原稿の URL の途中で切れた href を拾う', () => {
  const live = '<p><a href="https://coconala.com/servi" target="_blank">https://coconala.com/servi</a></p>'
    + '<figure data-src="https://coconala.com/services/4350199"><a href="https://coconala.com/services/4350199">card</a></figure>';
  assert.deepEqual(findTruncatedLinks(live, extractSourceUrls(md)), ['https://coconala.com/servi']);
});

test('原稿どおりのリンク・区切り（/ ? #）で終わる別の正しい URL・原稿に無い URL は拾わない', () => {
  const live = '<a href="https://coconala.com/services/4418735">a</a>'
    + '<a href="https://note.com/dobokunote">b</a>'
    + '<a href="https://doboku-note.com/">top</a>'
    + '<a href="https://note.com/dobokunote/n/n7279ca0d926f?utm_source=x&amp;utm_medium=y">c</a>'
    + '<a href="https://example.com/other">d</a>';
  assert.deepEqual(findTruncatedLinks(live, extractSourceUrls(md)), []);
});

test('原稿の URL を渡さなければ検査しない（従来の呼び出しは挙動を変えない）', () => {
  assert.deepEqual(findTruncatedLinks('<a href="https://coconala.com/servi">x</a>'), []);
});

test('不整合の 1 行整形に出る', () => {
  const line = formatLiveIssues({ urlHeadings: [], emptyBq: 0, imgShort: false, imgExcess: false, literalStars: [], brokenLinks: [], truncatedLinks: ['https://coconala.com/servi'], freeShort: false });
  assert.match(line, /途中で切れたリンク\[https:\/\/coconala\.com\/servi\]/);
});
