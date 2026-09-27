import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  collectPostedTweets,
  hasSiteLink,
  classifyOembedResponse,
} from '../scripts/lib/x-posted-live.mjs';

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), 'x-posted-live-'));
  mkdirSync(join(root, 'content/sns/x/draft/001-sample'), { recursive: true });
  mkdirSync(join(root, 'content/sns/x/published/002-sample'), { recursive: true });
  writeFileSync(
    join(root, 'content/sns/x/draft/001-sample/status.json'),
    JSON.stringify({
      updated_at: '2026-09-01T00:00:00Z',
      tweets: {
        1: { title: 'A', status: 'posted', posted_url: 'https://x.com/doboku373/status/1', text: 'サイトリンクあり https://doboku-note.com/exam/civil-construction-1' },
        2: { title: 'B', status: 'posted', text: '本文だけ・URL無し' }, // posted_url が無い
        3: { title: 'C', status: 'scheduled', scheduled_at: '2026-10-01T00:00:00+09:00', text: '未投稿' },
      },
    }),
  );
  writeFileSync(
    join(root, 'content/sns/x/published/002-sample/status.json'),
    JSON.stringify({
      updated_at: '2026-09-01T00:00:00Z',
      tweets: {
        1: { title: 'D', status: 'posted', posted_url: 'https://x.com/doboku373/status/2', text: 'linkless 施策（意図的にサイトリンク無し）#土木' },
      },
    }),
  );
  return root;
}

test('collectPostedTweets: status:posted だけを両ディレクトリから集める', () => {
  const root = makeRepo();
  try {
    const tweets = collectPostedTweets(root);
    assert.equal(tweets.length, 3); // scheduled の1件は含まない
    assert.ok(tweets.every((t) => t.status === 'posted'));
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

test('collectPostedTweets: status.json が無い/壊れているディレクトリは静かに無視する', () => {
  const root = mkdtempSync(join(tmpdir(), 'x-posted-live-empty-'));
  try {
    mkdirSync(join(root, 'content/sns/x/draft/no-status'), { recursive: true });
    writeFileSync(join(root, 'content/sns/x/draft/no-status/status.json'), '{not json');
    const tweets = collectPostedTweets(root);
    assert.deepEqual(tweets, []);
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
