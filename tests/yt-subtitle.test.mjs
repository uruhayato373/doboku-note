// tests/yt-subtitle.test.mjs
//
// .ass 字幕生成ロジックの単体テスト。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSubtitle,
  formatTime,
} from '../.claude/skills/social/yt-shorts-create/scripts/lib/build-subtitle.mjs';

test('buildSubtitle: scripts と durations の長さ不一致で throw', () => {
  assert.throws(
    () => buildSubtitle({ scripts: ['a'], durations: [1, 2] }),
    /length mismatch/
  );
});

test('buildSubtitle: scripts が array でないと throw', () => {
  assert.throws(
    () => buildSubtitle({ scripts: 'foo', durations: [1] }),
    /scripts must be an array/
  );
});

test('buildSubtitle: duration が 0 や負数で throw', () => {
  assert.throws(
    () => buildSubtitle({ scripts: ['a'], durations: [0] }),
    /positive finite/
  );
  assert.throws(
    () => buildSubtitle({ scripts: ['a'], durations: [-1] }),
    /positive finite/
  );
});

test('buildSubtitle: 基本 2 スライド構造（Script Info / Styles / Events 含む）', () => {
  const ass = buildSubtitle({
    scripts: ['ハロー', 'ワールド'],
    durations: [3.5, 4.5],
  });
  assert.match(ass, /\[Script Info\]/);
  assert.match(ass, /PlayResX: 1080/);
  assert.match(ass, /PlayResY: 1920/);
  assert.match(ass, /\[V4\+ Styles\]/);
  assert.match(ass, /\[Events\]/);
  assert.match(ass, /Style: Default,Noto Sans JP,48/);
  assert.match(ass, /Dialogue: 0,0:00:00\.00,0:00:03\.50,.*ハロー/);
  assert.match(ass, /Dialogue: 0,0:00:03\.50,0:00:08\.00,.*ワールド/);
});

test('buildSubtitle: width/height/fontSize/marginV の上書き', () => {
  const ass = buildSubtitle({
    scripts: ['x'],
    durations: [1],
    options: { width: 720, height: 1280, fontSize: 36, marginV: 150 },
  });
  assert.match(ass, /PlayResX: 720/);
  assert.match(ass, /PlayResY: 1280/);
  assert.match(ass, /Style: Default,Noto Sans JP,36/);
  // MarginV は 22 番目のフィールド（Style 行）— 行末に ,150,1 が来る
  assert.match(ass, /,150,1/);
});

test('buildSubtitle: 改行 \\n は \\N にエスケープ', () => {
  const ass = buildSubtitle({
    scripts: ['上の行\n下の行'],
    durations: [2],
  });
  assert.match(ass, /上の行\\N下の行/);
});

test('buildSubtitle: 中括弧はバックスラッシュでエスケープ', () => {
  const ass = buildSubtitle({
    scripts: ['{タグ}風テキスト'],
    durations: [1],
  });
  assert.match(ass, /\\\{タグ\\\}風テキスト/);
});

test('formatTime: 秒 → h:mm:ss.cs', () => {
  assert.equal(formatTime(0), '0:00:00.00');
  assert.equal(formatTime(1.5), '0:00:01.50');
  assert.equal(formatTime(60), '0:01:00.00');
  assert.equal(formatTime(3661.25), '1:01:01.25');
});

test('formatTime: 負数は 0 にクランプ', () => {
  assert.equal(formatTime(-5), '0:00:00.00');
});

test('buildSubtitle: 5 スライド分の duration が累積される', () => {
  const ass = buildSubtitle({
    scripts: ['s1', 's2', 's3', 's4', 's5'],
    durations: [3, 8, 10, 10, 5],
  });
  // 累積: 0, 3, 11, 21, 31, 36
  assert.match(ass, /Dialogue: 0,0:00:00\.00,0:00:03\.00,.*s1/);
  assert.match(ass, /Dialogue: 0,0:00:03\.00,0:00:11\.00,.*s2/);
  assert.match(ass, /Dialogue: 0,0:00:11\.00,0:00:21\.00,.*s3/);
  assert.match(ass, /Dialogue: 0,0:00:21\.00,0:00:31\.00,.*s4/);
  assert.match(ass, /Dialogue: 0,0:00:31\.00,0:00:36\.00,.*s5/);
});
