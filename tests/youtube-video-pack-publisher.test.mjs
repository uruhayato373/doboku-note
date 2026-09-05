import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { videoSnippet } = require('../.claude/scripts/youtube/publish-video-pack.cjs');

test('videoSnippet は新規投稿と既存動画の再同期で同じメタデータを返す', () => {
  assert.deepEqual(videoSnippet({
    title: '題名',
    description: '概要',
    tags: ['土木'],
  }), {
    title: '題名',
    description: '概要',
    tags: ['土木'],
    categoryId: '27',
    defaultLanguage: 'ja',
    defaultAudioLanguage: 'ja',
  });
});

test('videoSnippet は明示したカテゴリを保持する', () => {
  assert.equal(videoSnippet({ title: '題名', description: '概要', tags: [], categoryId: '28' }).categoryId, '28');
});
