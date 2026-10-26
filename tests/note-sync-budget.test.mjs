// note-sync-routine の時間と Drive の扱い（2026-10-24 の週次で 180 分の打ち切り・取り寄せ 33 件の失敗）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ARTICLE_MS, DRIVE_FAIL_LIMIT, driveState, fitCount, isTransientFailure, perArticleMs } from '../scripts/lib/note-sync-budget.mjs';

const MIN = 60_000;

test('1 記事の見込み: 実測が 3 記事に満たないうちは既定値（3.6 分）と実測の大きい方、以後は実測', () => {
  assert.equal(perArticleMs({ articles: 0, elapsedMs: 0 }), DEFAULT_ARTICLE_MS);
  assert.equal(perArticleMs({ articles: 1, elapsedMs: 1 * MIN }), DEFAULT_ARTICLE_MS);
  assert.equal(perArticleMs({ articles: 2, elapsedMs: 10 * MIN }), 5 * MIN);
  assert.equal(perArticleMs({ articles: 17, elapsedMs: 61 * MIN }), (61 / 17) * MIN);
});

test('締め切りまでに終わる記事数: 締め切りが無ければ上限まで、残り時間が 1 記事分を切れば 0', () => {
  assert.equal(fitCount({ now: 0, deadline: null, perMs: 4 * MIN, max: 10 }), 10);
  assert.equal(fitCount({ now: 0, deadline: 100 * MIN, perMs: 4 * MIN, max: 10 }), 10);
  assert.equal(fitCount({ now: 90 * MIN, deadline: 100 * MIN, perMs: 4 * MIN, max: 10 }), 2);
  assert.equal(fitCount({ now: 97 * MIN, deadline: 100 * MIN, perMs: 4 * MIN, max: 10 }), 0);
  assert.equal(fitCount({ now: 110 * MIN, deadline: 100 * MIN, perMs: 4 * MIN, max: 10 }), 0);
});

test('一時的な失敗: 10/24 の画像の挿入・エディタの読み込みの失敗はやり直し、公開本文の未確定などはやり直さない', () => {
  assert.equal(isTransientFailure('[4.4] ABORT: 挿入した画像がエディタに無い（1 枚消失・保存すると live で欠落）'), true);
  assert.equal(isTransientFailure('[4.4] ABORT: 画像挿入に失敗（1件）→ 保存しない'), true);
  assert.equal(isTransientFailure('[FAIL] editor not loaded for nd4320a66d09f'), true);
  assert.equal(isTransientFailure('[4.4] 失敗: ＋メニュークリック失敗'), true);
  assert.equal(isTransientFailure('[5g] FAIL: 公開本文が新しくなっていない'), false);
  assert.equal(isTransientFailure(undefined), false);
});

test('Drive: 3 件続けて失敗したら 1 回だけ再起動を求め、再起動のあとも続けば読めないとみなす。成功で数え直す', () => {
  let s = { consecutive: 0, restarted: false, down: false };
  for (let k = 1; k < DRIVE_FAIL_LIMIT; k++) s = driveState(s, false);
  assert.equal(s.restart, undefined);
  s = driveState(s, false);
  assert.equal(s.restart, true);
  s = { ...s, restart: false, restarted: true, consecutive: 0 };
  assert.equal(driveState(s, true).consecutive, 0);
  for (let k = 0; k < DRIVE_FAIL_LIMIT; k++) s = driveState(s, false);
  assert.equal(s.down, true);
  assert.equal(driveState({ consecutive: 2, restarted: false, down: false }, true).consecutive, 0);
});
