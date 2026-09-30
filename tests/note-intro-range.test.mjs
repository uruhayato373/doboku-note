import { test } from 'node:test';
import assert from 'node:assert/strict';
import { introRangeEndpoints, headingsDiff } from '../scripts/lib/note-intro-range.mjs';

// note エディタ直下の並びを模す。先頭段落 k[0] は残し、k[1..b] を消す
test('冒頭段落群の直後に H2 が来る: 端点は H2 の中へ出さず末尾段落の内側に置く', () => {
  const tags = ['P', 'FIGURE', 'P', 'P', 'H2', 'P'];
  assert.deepEqual(introRangeEndpoints(tags, 1, 3), { start: 'before', end: 'inside-end' });
});

test('冒頭の最後が段落で先頭段落の直後も段落: 両端とも内側（先頭段落・H2 と結合しない）', () => {
  const tags = ['P', 'P', 'P', 'H2'];
  assert.deepEqual(introRangeEndpoints(tags, 1, 2), { start: 'inside-start', end: 'inside-end' });
});

test('目次カードが境界なら従来どおりブロック境界で選ぶ', () => {
  const tags = ['P', 'P', 'FIGURE', 'TABLE-OF-CONTENTS', 'H2'];
  assert.deepEqual(introRangeEndpoints(tags, 1, 2), { start: 'inside-start', end: 'after' });
});

test('冒頭の最後が画像で直後が H2: 画像は内側に端点を置けないので after のまま', () => {
  const tags = ['FIGURE', 'P', 'FIGURE', 'H2'];
  assert.deepEqual(introRangeEndpoints(tags, 0, 2), { start: 'before', end: 'after' });
});

test('headingsDiff: 最初の H2 が空になった壊れ方を検出する', () => {
  const before = [{ tag: 'H2', text: 'AIで勉強する前に' }, { tag: 'H2', text: '使い方' }];
  const after = [{ tag: 'H2', text: '' }, { tag: 'H2', text: '使い方' }];
  assert.match(headingsDiff(before, after), /見出し1番目/);
});

test('headingsDiff: 冒頭の一文が H2 になり見出しが消えた壊れ方を検出する', () => {
  const before = [{ tag: 'H2', text: '工事概要とは' }, { tag: 'H2', text: '書き方' }, { tag: 'H2', text: '例' }];
  const after = [{ tag: 'H2', text: 'ココナラで個別に見てもらう' }, { tag: 'H2', text: '例' }];
  assert.ok(headingsDiff(before, after));
});

test('headingsDiff: 同じなら null', () => {
  const h = [{ tag: 'H2', text: 'a' }, { tag: 'H3', text: 'b' }];
  assert.equal(headingsDiff(h, h.map((x) => ({ ...x }))), null);
});
