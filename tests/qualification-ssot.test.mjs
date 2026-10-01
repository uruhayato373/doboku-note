// tests/qualification-ssot.test.mjs
//
// 資格の名前の写しを止める検査（check-qualification-ssot）の単体テスト。
// 2026-10-02 に実際に起きた写し（product-lineup.json の label・content-themes.json の shortLabels・
// 商品設計の Map 直書き）を全て検出できること、id だけの参照は検出しないことを確かめる。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, URL } from 'node:url';

import { auditQualificationSsot, countCodeCopies, findConfigCopies } from '../scripts/lib/qualification-ssot.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ids = new Set(['civil-construction-1', 'rccm', 'civil-construction']);

test('設定: 資格 id に付いた名前を拾い、id だけの参照は拾わない', () => {
  assert.deepEqual(findConfigCopies({ qualifications: [{ id: 'civil-construction-1', label: '1級土木施工管理技士' }] }, ids), ['$.qualifications[0].label']);
  assert.deepEqual(findConfigCopies({ shortLabels: { 'civil-construction-1': '1級土木', 'civil-construction': '1・2級土木 共通' } }, ids), ['$.shortLabels.civil-construction-1', '$.shortLabels.civil-construction']);
  assert.deepEqual(findConfigCopies({ exams: { rccm: { label: 'RCCM資格試験', stages: [] } } }, ids), ['$.exams.rccm.label']);
  assert.deepEqual(findConfigCopies({ splitByStage: ['civil-construction-1'], rules: [{ theme: 'rccm', pathPrefix: 'RCCM/' }], cells: { 'civil-construction-1': ['first'] } }, ids), []);
});

test('コード: id → 日本語の対応表（1 行・複数行・Map・switch）を数え、id だけの参照は数えない', () => {
  assert.equal(countCodeCopies(`const M = { 'civil-construction-1': '1級土木', rccm: 'RCCM試験' };`, ids), 1);
  assert.equal(countCodeCopies(`const SPLIT = new Map([\n  ['civil-construction-1', '1級土木'],\n]);`, ids), 1);
  assert.equal(countCodeCopies(`const HUB = {\n  'civil-construction-1': {\n    bg: '/x.webp',\n    qual: '1級土木',\n  },\n};`, ids), 1);
  assert.equal(countCodeCopies(`switch (c) {\n  case 'civil-construction-1':\n    return '1級土木施工管理技士';\n}`, ids), 1);
  assert.equal(countCodeCopies(`{ id: 'rccm', label: 'RCCM' }`, ids), 0);
  assert.equal(countCodeCopies(`const SPLIT = new Set(['civil-construction-1']);\nif (q === 'rccm') load('RCCM');`, ids), 0);
});

test('実リポジトリ: 設定に写しが無く、コードの対応表は基準以下（検査対象 0 件を合格にしない）', () => {
  const r = auditQualificationSsot(ROOT);
  assert.ok(r.config.files > 50, `設定の検査対象が少なすぎる（${r.config.files}）`);
  assert.ok(r.code.files > 500, `コードの検査対象が少なすぎる（${r.code.files}）`);
  assert.deepEqual(r.config.violations, []);
  assert.deepEqual(r.code.over, []);
});
