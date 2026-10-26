// publish-x の予約・即時の判定（scripts/lib/x-post-mode.mjs）。日時なしで即時投稿に落ちて 22 本を連投した事故（10 月 27 日）の再発防止。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePostMode } from '../scripts/lib/x-post-mode.mjs';

test('日時が無く --immediate も無ければ止める（即時投稿に落とさない）', () => {
  assert.throws(() => resolvePostMode({ immediate: false, dates: [], count: 22 }), /予約の日時/);
  assert.throws(() => resolvePostMode({ immediate: false, dates: [], count: 1 }), /予約の日時/);
});

test('--immediate は 1 本だけ', () => {
  assert.deepEqual(resolvePostMode({ immediate: true, dates: [], count: 1 }), { mode: 'immediate', dates: [] });
  assert.throws(() => resolvePostMode({ immediate: true, dates: [], count: 2 }), /1 回 1 本/);
});

test('予約は本数ぶんの日時が要る', () => {
  const dates = ['2026-11-01T07:45', '2026-11-02T19:50'];
  assert.deepEqual(resolvePostMode({ immediate: false, dates, count: 2 }), { mode: 'schedule', dates });
  assert.throws(() => resolvePostMode({ immediate: false, dates: dates.slice(0, 1), count: 2 }), /一致しません/);
});
