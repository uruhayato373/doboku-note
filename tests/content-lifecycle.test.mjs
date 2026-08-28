// tests/content-lifecycle.test.mjs
//
// 共通ライフサイクル ステージ写像の単体テスト。
// 要点は「未知の値を published 側へ黙って寄せない」ことと、
// 実在するネイティブ語彙（各カタログ・state の実値）を全て写像できること。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  STAGES, STAGE_LABELS, emptyCounts, tally,
  videoStatusToStage, siteDocToStage, noteToStage, coconalaStatusToStage,
  brainStatusToStage, kindleStatusToStage, xTweetStatusToStage,
  youtubeScheduleStatusToStage, igPackToStage,
} from '../scripts/lib/content-lifecycle.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('STAGES は進行順の 6 値で、全てにラベルがある', () => {
  assert.deepEqual(STAGES, ['planned', 'draft', 'review', 'scheduled', 'published', 'retired']);
  for (const s of STAGES) assert.ok(STAGE_LABELS[s], `ラベル欠落: ${s}`);
});

test('emptyCounts/tally: 未知ステージは unknown へ落ちる（published へ寄せない）', () => {
  const c = emptyCounts();
  assert.equal(c.published, 0);
  assert.equal(c.unknown, 0);
  tally(c, 'published');
  tally(c, null);
  tally(c, 'nonexistent-stage');
  assert.equal(c.published, 1);
  assert.equal(c.unknown, 2);
});

test('video: config の statusEnum を全て写像できる（取りこぼしゼロ）', () => {
  const config = JSON.parse(readFileSync(join(ROOT, '.claude/config/video-content.json'), 'utf8'));
  for (const status of config.state.statusEnum) {
    const stage = videoStatusToStage(status);
    assert.ok(stage !== null, `未写像の video status: ${status}`);
    assert.ok(STAGES.includes(stage), `不正なステージ: ${status} → ${stage}`);
  }
  assert.equal(videoStatusToStage('no-such-status'), null);
});

test('video: draft は本文の有無で planned と draft に分かれる', () => {
  assert.equal(videoStatusToStage('draft', false), 'planned');
  assert.equal(videoStatusToStage('draft', true), 'draft');
  // 企画のみでも qa 以降なら planned にしない（状態が優先）
  assert.equal(videoStatusToStage('qa_passed', false), 'review');
});

test('coconala: paused は pauseReason で retired と scheduled に分かれる', () => {
  assert.equal(coconalaStatusToStage('listed'), 'published');
  assert.equal(coconalaStatusToStage('paused', 'absence'), 'scheduled');
  assert.equal(coconalaStatusToStage('paused', 'retired'), 'retired');
  assert.equal(coconalaStatusToStage('paused'), 'retired', '理由不明の休止は停止側（安全側）');
  assert.equal(coconalaStatusToStage('unknown-status'), null);
});

test('実カタログのネイティブ値を全て写像できる（coconala / brain / kindle）', () => {
  const coconala = readFileSync(join(ROOT, 'src/lib/coconala-services.ts'), 'utf8');
  for (const m of coconala.matchAll(/^\s*status: '([a-z_]+)'/gm)) {
    assert.ok(coconalaStatusToStage(m[1], 'retired') !== null, `未写像の coconala status: ${m[1]}`);
  }
  const brain = readFileSync(join(ROOT, 'src/lib/brain-products.ts'), 'utf8');
  for (const m of brain.matchAll(/^\s*status: '([a-z_]+)'/gm)) {
    assert.ok(brainStatusToStage(m[1]) !== null, `未写像の brain status: ${m[1]}`);
  }
  const catalog = JSON.parse(readFileSync(join(ROOT, 'scripts/kindle-published/catalog.json'), 'utf8'));
  for (const b of catalog.books) {
    assert.ok(kindleStatusToStage(b.status) !== null, `未写像の kindle status: ${b.status}`);
  }
});

test('実 state のネイティブ値を全て写像できる（youtube-schedule / x drafts）', () => {
  const yt = JSON.parse(readFileSync(join(ROOT, '.claude/state/youtube-schedule.json'), 'utf8'));
  for (const item of yt.items) {
    assert.ok(youtubeScheduleStatusToStage(item.status) !== null, `未写像の yt status: ${item.status}`);
  }
  assert.equal(youtubeScheduleStatusToStage('uploaded'), 'published');
  assert.equal(youtubeScheduleStatusToStage('what'), null);
  for (const s of ['queued', 'scheduled', 'posted', 'replaced']) {
    assert.ok(xTweetStatusToStage(s) !== null, `未写像の x status: ${s}`);
  }
  assert.equal(xTweetStatusToStage('draft-like'), null);
});

test('site / note / ig: 実体ベースの写像', () => {
  assert.equal(siteDocToStage({ published: true }), 'published');
  assert.equal(siteDocToStage({ published: false }), 'draft');
  assert.equal(siteDocToStage({ published: true, redirected: true }), 'retired');
  assert.equal(noteToStage({ published: true }), 'published');
  assert.equal(noteToStage({ published: false }), 'draft');
  assert.equal(noteToStage({ published: false, hasLiveUrl: true }), 'review');
  assert.equal(igPackToStage({ posted: { id: 'x' } }), 'published');
  assert.equal(igPackToStage({ posted: null, scheduled: true }), 'scheduled');
  assert.equal(igPackToStage({ posted: null }), 'draft');
});
