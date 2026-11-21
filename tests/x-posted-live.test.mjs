import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  collectPostedTweets,
  hasSiteLink,
  classifyOembedResponse,
} from '../scripts/lib/x-posted-live.mjs';
import { writeXRegistry } from './helpers/x-registry-fixture.mjs';

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'x-posted-live-'));
  writeXRegistry(root, [
    { folder: '001-sample', key: 1, status: 'published', url: 'https://x.com/doboku373/status/1', text: 'サイトリンクあり https://doboku-note.com/exam/civil-construction-1' },
    { folder: '001-sample', key: 2, status: 'published', text: '本文だけ・URL無し' }, // platform.url が無い
    { folder: '001-sample', key: 3, status: 'approved', publishAt: '2026-10-01T00:00:00+09:00', text: '未投稿' },
    { folder: '002-sample', key: 1, base: 'published', status: 'published', url: 'https://x.com/doboku373/status/2', text: 'linkless 施策（意図的にサイトリンク無し）#土木' },
  ]);
  return root;
}

test('collectPostedTweets: published の行だけを draft・published 両方から集める', () => {
  const root = makeRepo();
  try {
    const tweets = collectPostedTweets(root);
    assert.equal(tweets.length, 3); // approved の1件は含まない
    assert.ok(tweets.some((t) => t.ref === 'content/sns/x/draft/001-sample/1'));
    assert.ok(tweets.some((t) => t.ref === 'content/sns/x/published/002-sample/1'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('collectPostedTweets: posted_url の有無をそのまま反映する', () => {
  const root = makeRepo();
  try {
    const tweets = collectPostedTweets(root);
    const withUrl = tweets.filter((t) => t.posted_url);
    const withoutUrl = tweets.filter((t) => !t.posted_url);
    assert.equal(withUrl.length, 2);
    assert.equal(withoutUrl.length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('collectPostedTweets: 台帳が無ければ空（落ちない）', () => {
  const root = mkdtempSync(join(tmpdir(), 'x-posted-live-empty-'));
  try {
    assert.deepEqual(collectPostedTweets(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('hasSiteLink: doboku-note.com へのリンクを検出する', () => {
  assert.equal(hasSiteLink('詳しくは https://doboku-note.com/exam/civil-construction-1 を見て'), true);
  assert.equal(hasSiteLink('リンクなしの投稿です #土木'), false);
  assert.equal(hasSiteLink(''), false);
  assert.equal(hasSiteLink(undefined), false);
});

test('classifyOembedResponse: 200+oEmbed JSON は live、404 は gone、それ以外は unknown', () => {
  const liveBody = JSON.stringify({ url: 'https://x.com/doboku373/status/1', html: '<blockquote>...</blockquote>' });
  assert.equal(classifyOembedResponse('200', liveBody), 'live');
  assert.equal(classifyOembedResponse('404', '<!DOCTYPE html>...'), 'gone');
  assert.equal(classifyOembedResponse('200', '<!DOCTYPE html>not json'), 'unknown'); // 200 だが JSON でない（プロキシ介入等）
  assert.equal(classifyOembedResponse('000', ''), 'unknown');
  assert.equal(classifyOembedResponse('429', ''), 'unknown');
  assert.equal(classifyOembedResponse('500', ''), 'unknown');
});
