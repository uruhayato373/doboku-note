// 資格 id の変換を、registry の全資格について「変換できる」か「未対応と明示」のどちらかに固定する（DN-1012）。
// 画像・動画の色（パレット）は note-cover-tokens.json の qualification から qualification-palette.mjs が導く唯一の実装で、
// サイトのブランド（exam-brand.ts）とずれないことも見る。新しい資格を registry に足したら、ここで対応か未対応かを決める。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { paletteKeyOf, requirePaletteKey, examToPalette, paletteQualification } from '../scripts/lib/qualification-palette.mjs';
import { examPalette } from '../scripts/lib/image-rules.mjs';
import { EXAM_ALIAS } from '../scripts/lib/registry-x-state.mjs';

const registry = JSON.parse(readFileSync(join(REPO_ROOT, 'config/qualification-registry.json'), 'utf8'));
const IDS = [...registry.qualifications.map((q) => q.id), ...Object.keys(registry.groups)];
const tokens = JSON.parse(readFileSync(join(REPO_ROOT, '.claude/knowledge/design-system/note-cover-tokens.json'), 'utf8')).exams;

/** 画像・動画の色を持たない資格（教材を作っていない）。色を足すときは note-cover-tokens.json に qualification つきで足し、ここから外す */
const NO_PALETTE = [
  'pe-information', 'pe-agriculture', 'pe-forestry', 'pe-environment', 'pe-applied-science', 'pe-sanitary',
  'construction-machinery-1', 'construction-machinery-2', 'landscape-1', 'landscape-2', 'building-construction-1', 'building-construction-2',
  'electrical-work-1', 'electrical-work-2', 'civil-service-national-general-civil', 'civil-service-tokyo-1b-civil', 'civil-service-tokubetsuku-1-civil',
  'geological-survey-engineer', 'road-bridge-inspector', 'steel-structure-diagnostician',
];

test('トークンの qualification は registry の資格かまとまり', () => {
  for (const [slug, v] of Object.entries(tokens)) {
    if (!v || typeof v !== 'object' || !v.qualification) continue;
    assert.ok(IDS.includes(v.qualification), `${slug} の qualification「${v.qualification}」が registry に無い`);
  }
});

test('registry の全資格とまとまりが、パレットに変換できるか NO_PALETTE に明示されている', () => {
  for (const id of IDS) {
    const key = paletteKeyOf(id);
    if (NO_PALETTE.includes(id)) assert.equal(key, null, `${id} は NO_PALETTE にあるが変換できる（NO_PALETTE から外す）`);
    else assert.ok(key && tokens[key], `${id} がパレットに変換できない（トークンに足すか NO_PALETTE に足す）`);
  }
});

test('呼び出し元で結果が変わらない: 色の文・requirePaletteKey・互換の表が同じ答えを返す', () => {
  const table = examToPalette();
  for (const id of IDS) {
    const key = paletteKeyOf(id);
    assert.equal(table[id] ?? null, key, `${id}: 互換の表と paletteKeyOf が違う`);
    if (key) {
      assert.equal(requirePaletteKey(id), key);
      assert.match(examPalette(id), new RegExp(tokens[key].base));
    } else {
      assert.throws(() => requirePaletteKey(id));
      assert.throws(() => examPalette(id));
    }
  }
});

test('X の別名は全部 registry の資格かまとまりへ行き、パレットのキーはそのトークンの資格へ行く', () => {
  for (const [alias, id] of Object.entries(EXAM_ALIAS)) assert.ok(IDS.includes(id), `別名 ${alias} の行き先「${id}」が registry に無い`);
  // パレットのキーは、資格 id と同じ綴り（surveyor）でもトークンの資格を指す（data-wiring.test と同じ約束）
  for (const key of new Set(Object.values(examToPalette()))) assert.equal(EXAM_ALIAS[key], paletteQualification(key), `パレット ${key} の別名`);
});

test('サイトのブランド（exam-brand.ts）は、パレットを持つ資格をすべて持つ', () => {
  const ts = readFileSync(join(REPO_ROOT, 'src/lib/exam-brand.ts'), 'utf8');
  const start = ts.indexOf('QUALIFICATION_TO_EXAM_KEY');
  const block = ts.slice(start, ts.indexOf('};', start));
  const keys = [...block.matchAll(/^\s*'?([a-z0-9-]+)'?\s*:/gm)].map((m) => m[1]);
  for (const k of keys) assert.ok(IDS.includes(k), `exam-brand.ts の ${k} が registry に無い`);
  for (const id of IDS) if (paletteKeyOf(id)) assert.ok(keys.includes(id), `${id} は画像の色があるのにサイトのブランドが無い（exam-brand.ts に足す）`);
});
