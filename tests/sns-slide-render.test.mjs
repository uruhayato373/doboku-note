// tests/sns-slide-render.test.mjs
//
// Satori + @resvg/resvg-js による PNG レンダリングが各 SNS サイズで動作することを確認する。
// 画像内容の pixel 比較はせず、PNG マジックバイトとサイズ可換性のみを検証する。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { renderSlide, TEXT_CONFIG_DEFAULTS } from '#lib/sns-common/slide-render.mjs';

test('renderSlide: cover 型で 1080×1920（YouTube Shorts）の PNG を生成', async () => {
  const png = await renderSlide({
    width: 1080,
    height: 1920,
    slide: {
      type: 'cover',
      data: { title: 'フォロワーシップ', subtitle: '技術士総合技術監理', label: '技術士総監' },
    },
  });
  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 1000);
  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  assert.equal(png[0], 0x89);
  assert.equal(png[1], 0x50);
  assert.equal(png[2], 0x4e);
  assert.equal(png[3], 0x47);
});

test('renderSlide: cover 型で 1080×1350（IG カルーセル）も動作', async () => {
  const png = await renderSlide({
    width: 1080,
    height: 1350,
    slide: { type: 'cover', data: { title: 'MBO（目標管理）' } },
  });
  assert.ok(Buffer.isBuffer(png));
  assert.equal(png[0], 0x89);
});

test('renderSlide: cover 型で 1920×1080（YouTube 標準動画）も動作', async () => {
  const png = await renderSlide({
    width: 1920,
    height: 1080,
    slide: { type: 'cover', data: { title: 'リスクマネジメント' } },
  });
  assert.ok(Buffer.isBuffer(png));
  assert.equal(png[0], 0x89);
});

test('renderSlide: 未知の type は throw する', async () => {
  await assert.rejects(
    () =>
      renderSlide({
        width: 1080,
        height: 1920,
        slide: { type: '__unknown__', data: {} },
      }),
    /Unknown slide type/
  );
});

test('renderSlide: width/height が整数でないと throw', async () => {
  await assert.rejects(
    () =>
      renderSlide({
        width: 1080.5,
        height: 1920,
        slide: { type: 'cover', data: { title: 'x' } },
      }),
    /must be integers/
  );
});

test('renderSlide: slide.type が無いと throw', async () => {
  await assert.rejects(
    () =>
      renderSlide({
        width: 1080,
        height: 1920,
        slide: { data: { title: 'x' } },
      }),
    /slide\.type is required/
  );
});

test('TEXT_CONFIG_DEFAULTS: 主要 3 サイズのプリセットを持つ', () => {
  assert.ok(TEXT_CONFIG_DEFAULTS.ytShorts);
  assert.ok(TEXT_CONFIG_DEFAULTS.igCarousel);
  assert.ok(TEXT_CONFIG_DEFAULTS.ytStandard);
  assert.ok(Array.isArray(TEXT_CONFIG_DEFAULTS.ytShorts.fontSizeTable));
});
