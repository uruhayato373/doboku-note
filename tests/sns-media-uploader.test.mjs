// tests/sns-media-uploader.test.mjs
//
// Meta Graph + YouTube Data API のラッパーが「環境変数欠如」「不正引数」で fail-fast することを確認。
// 実 API 投稿は Issue #163 SNS-prereq でトークンが揃った後に手動で動作確認する（CI ではテストしない）。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  getYouTubeClient,
  uploadYouTubeVideo,
  postInstagramCarousel,
  postInstagramReel,
} from '#lib/sns-common/media-uploader.mjs';

const YT_KEYS = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'];
const META_KEYS = ['META_INSTAGRAM_BUSINESS_ACCOUNT_ID', 'META_LONG_LIVED_TOKEN'];

function withEnvCleared(keys, fn) {
  const saved = {};
  for (const k of keys) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  return Promise.resolve(fn()).finally(() => {
    for (const k of keys) {
      if (saved[k] !== undefined) process.env[k] = saved[k];
    }
  });
}

test('getYouTubeClient: YOUTUBE_CLIENT_ID 欠如で throw', async () => {
  await withEnvCleared(YT_KEYS, async () => {
    assert.throws(() => getYouTubeClient(), /YOUTUBE_CLIENT_ID/);
  });
});

test('uploadYouTubeVideo: videoPath 欠如で throw', async () => {
  await assert.rejects(
    () => uploadYouTubeVideo({ title: 't', description: 'd' }),
    /videoPath is required/
  );
});

test('uploadYouTubeVideo: title 欠如で throw', async () => {
  await assert.rejects(
    () => uploadYouTubeVideo({ videoPath: '/dev/null', description: 'd' }),
    /title is required/
  );
});

test('uploadYouTubeVideo: 環境変数欠如で throw（Issue #163 案内付き）', async () => {
  await withEnvCleared(YT_KEYS, async () => {
    await assert.rejects(
      () => uploadYouTubeVideo({ videoPath: '/dev/null', title: 't', description: 'd' }),
      /YOUTUBE_CLIENT_ID.*Issue #163/s
    );
  });
});

test('postInstagramCarousel: imageUrls が 1 枚なら throw（2-10 枚必須）', async () => {
  await assert.rejects(
    () => postInstagramCarousel({ imageUrls: ['https://a.com/1.png'], caption: 'c' }),
    /2-10 image URLs/
  );
});

test('postInstagramCarousel: imageUrls が 11 枚なら throw', async () => {
  const urls = Array.from({ length: 11 }, (_, i) => `https://a.com/${i}.png`);
  await assert.rejects(
    () => postInstagramCarousel({ imageUrls: urls, caption: 'c' }),
    /2-10 image URLs/
  );
});

test('postInstagramCarousel: imageUrls 適正でも env 欠如で throw', async () => {
  await withEnvCleared(META_KEYS, async () => {
    await assert.rejects(
      () =>
        postInstagramCarousel({
          imageUrls: ['https://a.com/1.png', 'https://a.com/2.png'],
          caption: 'c',
        }),
      /META_INSTAGRAM_BUSINESS_ACCOUNT_ID.*Issue #163/s
    );
  });
});

test('postInstagramReel: videoUrl 欠如で throw', async () => {
  await assert.rejects(() => postInstagramReel({ caption: 'c' }), /videoUrl is required/);
});

test('postInstagramReel: env 欠如で throw', async () => {
  await withEnvCleared(META_KEYS, async () => {
    await assert.rejects(
      () => postInstagramReel({ videoUrl: 'https://a.com/v.mp4', caption: 'c' }),
      /META_INSTAGRAM_BUSINESS_ACCOUNT_ID.*Issue #163/s
    );
  });
});
