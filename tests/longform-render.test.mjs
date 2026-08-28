// tests/longform-render.test.mjs
//
// 16:9 通常動画レンダラー（DN-0110 Phase 1）の純粋ロジックの単体テスト。
// satori/ffmpeg には依存しない（ASS 生成・折返し・scene ノード・palette 解決）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LONGFORM_W, LONGFORM_H, EXAM_TO_PALETTE,
  wrapJp, buildLongformAss, buildSceneNode, planLongformRender,
} from '../scripts/lib/longform-render.mjs';
import { resolveExam } from '../.claude/scripts/sns/lib/exam-palette.mjs';

const SCENES = [
  { sceneId: 'hook', start: 0, end: 20, narration: 'あ'.repeat(30), caption: '導入' },
  { sceneId: 'body', start: 20, end: 80, narration: 'い'.repeat(10), caption: '本論' },
];

test('wrapJp: 和文を maxChars で折り返す', () => {
  assert.deepEqual(wrapJp('あいうえおかき', 3), ['あいう', 'えおか', 'き']);
  assert.deepEqual(wrapJp('', 3), []);
});

test('buildLongformAss: PlayRes 1920×1080・設計尺で連続タイミング', () => {
  const ass = buildLongformAss(SCENES);
  assert.ok(ass.includes(`PlayResX: ${LONGFORM_W}`));
  assert.ok(ass.includes(`PlayResY: ${LONGFORM_H}`));
  assert.ok(ass.includes('Dialogue: 0,0:00:00.00,0:00:20.00'));
  assert.ok(ass.includes('Dialogue: 0,0:00:20.00,0:01:20.00'));
  // 28字折返し（30字ナレーション → \N が入る）
  assert.ok(ass.includes('\\N'));
});

test('buildLongformAss: wav 実測 durations が設計尺を上書きする', () => {
  const ass = buildLongformAss(SCENES, [12.5, 33.0]);
  assert.ok(ass.includes('Dialogue: 0,0:00:00.00,0:00:12.50'));
  assert.ok(ass.includes('Dialogue: 0,0:00:12.50,0:00:45.50'));
});

test('buildSceneNode: points 既定で見出しと箇条書きを含む', () => {
  const theme = { base: '#1E73C8', deep: '#155293', accent: '#16365C', label: '1級土木施工管理技士' };
  const node = buildSceneNode(
    { sceneId: 's', start: 0, end: 10, narration: 'n', visual: { heading: '見出しテスト', items: ['項目A', '項目B'] } },
    { theme, packTitle: 'タイトル' },
  );
  const flat = JSON.stringify(node);
  assert.ok(flat.includes('見出しテスト'));
  assert.ok(flat.includes('項目A') && flat.includes('項目B'));
  assert.ok(flat.includes('1級土木施工管理技士'));
  assert.ok(flat.includes(`${LONGFORM_W}px`));
});

test('buildSceneNode: cover は deep 背景の中央レイアウト', () => {
  const theme = { base: '#16365C', deep: '#0E2645', accent: '#1E73C8', label: '技術士（総合技術監理部門）' };
  const node = buildSceneNode(
    { sceneId: 'cover', start: 0, end: 10, narration: 'n', visual: { kind: 'cover', heading: 'カバー見出し' } },
    { theme, packTitle: 'タイトル' },
  );
  const flat = JSON.stringify(node);
  assert.ok(flat.includes('カバー見出し'));
  assert.ok(flat.includes('#0E2645'));
});

test('planLongformRender: exam→palette 解決と format ガード', () => {
  const manifest = { exam: 'civil-construction-1', title: 't', packId: 'p' };
  const plan = planLongformRender(manifest, { format: 'longform-16x9', scenes: SCENES }, resolveExam);
  assert.equal(plan.theme.base, '#1E73C8');
  assert.equal(plan.theme.label, '1級土木施工管理技士');
  assert.throws(
    () => planLongformRender(manifest, { format: 'vertical-9x16', scenes: SCENES }, resolveExam),
    /longform-16x9 専用/,
  );
});

test('EXAM_TO_PALETTE: config の examEnum を全てカバーする', () => {
  const config = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../.claude/config/video-content.json'), 'utf8'),
  );
  for (const exam of config.manifest.examEnum) {
    assert.ok(EXAM_TO_PALETTE[exam], `palette 未定義の exam: ${exam}`);
    assert.ok(resolveExam(EXAM_TO_PALETTE[exam]).base, `palette 解決不能: ${exam}`);
  }
});
