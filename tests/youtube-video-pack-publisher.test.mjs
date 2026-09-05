import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { videoSnippet, videoStatus } = require('../.claude/scripts/youtube/publish-video-pack.cjs');

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

test('videoStatus は公開状態と予約日時を保ち、強いAI生成ラベルを付けない', () => {
  const status = videoStatus({
    status: {
      privacyStatus: 'private',
      publishAt: '2026-10-23T11:00:00Z',
      embeddable: true,
      license: 'youtube',
      publicStatsViewable: true,
    },
  });
  assert.equal(status.privacyStatus, 'private');
  assert.equal(status.publishAt, '2026-10-23T11:00:00Z');
  assert.equal(status.containsSyntheticMedia, false);
});
