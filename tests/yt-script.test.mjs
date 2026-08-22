// tests/yt-script.test.mjs
//
// YouTube Shorts の各スライド台本（TTS 入力テキスト）生成ロジック。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildScript,
  buildScriptForSlide,
} from '../.claude/skills/social/yt-shorts-create/scripts/lib/build-script.mjs';

test('buildScript: storyboard から各スライドの台本配列を生成', () => {
  const sb = {
    slides: [
      { type: 'cover', data: { title: 'テスト' } },
      { type: 'definition', data: { title: 'テスト', body: 'テストの定義' } },
      { type: 'examPoint', data: { index: 1, body: 'ポイント1' } },
      { type: 'cta', data: {} },
    ],
  };
  const scripts = buildScript(sb);
  assert.equal(scripts.length, 4);
  assert.ok(scripts.every(s => typeof s === 'string' && s.length > 0));
});

test('buildScript: storyboard.slides が無いと throw', () => {
  assert.throws(() => buildScript({}), /slides is required/);
  assert.throws(() => buildScript(null), /slides is required/);
});

test('buildScriptForSlide: cover はタイトルと「技術士総合技術監理」を含む', () => {
  const s = buildScriptForSlide({ type: 'cover', data: { title: 'フォロワーシップ' } });
  assert.match(s, /フォロワーシップ/);
  assert.match(s, /技術士総合技術監理/);
});

test('buildScriptForSlide: definition は「〜とは、〜」形式', () => {
  const s = buildScriptForSlide({
    type: 'definition',
    data: { title: 'X', body: 'Yの説明' },
  });
  assert.equal(s, 'Xとは、Yの説明');
});

test('buildScriptForSlide: definition で body 空なら「〜について解説します」', () => {
  const s = buildScriptForSlide({
    type: 'definition',
    data: { title: 'X', body: '' },
  });
  assert.match(s, /Xについて解説します/);
});

test('buildScriptForSlide: definition で body が title で始まるなら body のみ（重複回避）', () => {
  const s = buildScriptForSlide({
    type: 'definition',
    data: { title: 'X', body: 'Xは...という意味' },
  });
  assert.equal(s, 'Xは...という意味');
});

test('buildScriptForSlide: examPoint は「試験ポイントN。本文」形式', () => {
  const s = buildScriptForSlide({
    type: 'examPoint',
    data: { index: 2, body: 'ポイント本文' },
  });
  assert.equal(s, '試験ポイント2。ポイント本文');
});

test('buildScriptForSlide: examPoint で index 省略時は 1', () => {
  const s = buildScriptForSlide({
    type: 'examPoint',
    data: { body: 'X' },
  });
  assert.match(s, /試験ポイント1/);
});

test('buildScriptForSlide: cta は概要欄誘導文', () => {
  const s = buildScriptForSlide({ type: 'cta', data: {} });
  assert.match(s, /概要欄/);
  assert.match(s, /doboku-note/);
});

test('buildScriptForSlide: 未知の type は throw', () => {
  assert.throws(
    () => buildScriptForSlide({ type: '__unknown__', data: {} }),
    /Unknown slide type/
  );
});

test('buildScriptForSlide: slide が null なら throw', () => {
  assert.throws(() => buildScriptForSlide(null), /slide\.type is required/);
});
