// tests/qualification-ssot.test.mjs
//
// 資格の名前の写しを止める検査（check-qualification-ssot）の単体テスト。
// 2026-10-02 に実際に起きた写し（product-lineup.json の label・content-themes.json の shortLabels・
// 商品設計の Map 直書き・カバーのトークンや note 導線の別名キーの名前）を全て検出できること、
// id だけの参照・qualification: での参照は検出しないこと、書き込み先が registry と揃うことを確かめる。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, URL } from 'node:url';

import { auditQualificationSsot, countCodeCopies, findCodeCopies, findConfigCopies, syncDerivedNames } from '../scripts/lib/qualification-ssot.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const ids = new Set(['civil-construction-1', 'rccm', 'civil-construction']);

test('設定: 資格 id に付いた名前を拾い、id だけの参照は拾わない', () => {
  assert.deepEqual(findConfigCopies({ qualifications: [{ id: 'civil-construction-1', label: '1級土木施工管理技士' }] }, ids), ['$.qualifications[0].label']);
  assert.deepEqual(findConfigCopies({ shortLabels: { 'civil-construction-1': '1級土木', 'civil-construction': '1・2級土木 共通' } }, ids), ['$.shortLabels.civil-construction-1', '$.shortLabels.civil-construction']);
  assert.deepEqual(findConfigCopies({ exams: { rccm: { label: 'RCCM資格試験', stages: [] } } }, ids), ['$.exams.rccm.label']);
  assert.deepEqual(findConfigCopies({ splitByStage: ['civil-construction-1'], rules: [{ theme: 'rccm', pathPrefix: 'RCCM/' }], cells: { 'civil-construction-1': ['first'] } }, ids), []);
});

test('設定: 名前を書かず qualification: で指す項目は拾わず、slug で資格を指す項目の名前は拾う', () => {
  assert.deepEqual(findConfigCopies({ exams: { 'civil-1': { dir: '1級土木', qualification: 'civil-construction-1' } } }, ids), []);
  assert.deepEqual(findConfigCopies([{ slug: 'civil-construction-1', label: '1級土木施工管理技士' }], ids), ['$[0].label']);
});

test('コード: id → 日本語の対応表（1 行・複数行・Map・switch）を数え、id だけの参照は数えない', () => {
  assert.equal(countCodeCopies(`const M = { 'civil-construction-1': '1級土木', rccm: 'RCCM試験' };`, ids), 1);
  assert.equal(countCodeCopies(`const SPLIT = new Map([\n  ['civil-construction-1', '1級土木'],\n]);`, ids), 1);
  assert.equal(countCodeCopies(`const HUB = {\n  'civil-construction-1': {\n    bg: '/x.webp',\n    qual: '1級土木',\n  },\n};`, ids), 1);
  assert.equal(countCodeCopies(`switch (c) {\n  case 'civil-construction-1':\n    return '1級土木施工管理技士';\n}`, ids), 1);
  assert.equal(countCodeCopies(`if (exam === 'civil-construction-1') {\n  return { label: '1級土木', tags: [] };\n}`, ids), 1);
  assert.equal(countCodeCopies(`{ id: 'rccm', label: 'RCCM' }`, ids), 0);
  assert.equal(countCodeCopies(`const SPLIT = new Set(['civil-construction-1']);\nif (q === 'rccm') load('RCCM');`, ids), 0);
});

test('コード: 資格名でない日本語は qualification-ssot: allow の行（同じ行か直前の行）だけ除外する', () => {
  assert.equal(countCodeCopies(`const T = { rccm: 'RCCMの手順' }; // qualification-ssot: allow 手順の説明`, ids), 0);
  assert.equal(countCodeCopies(`// qualification-ssot: allow 手順の説明\nconst T = { rccm: 'RCCMの手順' };`, ids), 0);
  assert.deepEqual(findCodeCopies(`const a = 1;\nconst T = { rccm: 'RCCM資格' };`, ids).map((h) => h.line), [2]);
});

test('書き込み先: registry と違う名前を検出し、書き換えると一致する（書式は保つ）', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'qssot-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'src/config'), { recursive: true });
  const cat = '[\n  {\n    "slug": "civil-construction-1",\n    "label": "古い名前",\n    "order": 1\n  },\n  {\n    "slug": "surveyor",\n    "qualification": "surveying",\n    "label": "測量士"\n  }\n]\n';
  writeFileSync(join(root, 'src/config/categories.json'), cat);
  writeFileSync(join(root, 'src/config/home-exam-cards.json'), '[]\n');
  writeFileSync(join(root, 'src/config/tags.json'), '[\n  {\n    "name": "1級",\n    "slug": "civil-construction-1",\n    "class": "qualification"\n  }\n]\n');
  const registry = {
    qualifications: [{ id: 'civil-construction-1', label: '1級土木施工管理技士' }, { id: 'surveyor', label: '測量士' }, { id: 'assistant-surveyor', label: '測量士補' }],
    groups: { surveying: { label: '測量士・測量士補', members: ['surveyor', 'assistant-surveyor'] } },
  };
  assert.deepEqual(syncDerivedNames(root, registry).map((d) => `${d.slug}:${d.want}`), ['civil-construction-1:1級土木施工管理技士', 'surveyor:測量士・測量士補', 'civil-construction-1:1級土木施工管理技士']);
  syncDerivedNames(root, registry, { write: true });
  assert.deepEqual(syncDerivedNames(root, registry), []);
  assert.equal(readFileSync(join(root, 'src/config/categories.json'), 'utf8'), cat.replace('古い名前', '1級土木施工管理技士').replace('"label": "測量士"', '"label": "測量士・測量士補"'));
});

test('実リポジトリ: 設定の写し・書き込み先の食い違い・コードの直書きが 0 件（検査対象 0 件を合格にしない）', () => {
  const r = auditQualificationSsot(ROOT);
  assert.ok(r.config.files > 50, `設定の検査対象が少なすぎる（${r.config.files}）`);
  assert.ok(r.code.files > 500, `コードの検査対象が少なすぎる（${r.code.files}）`);
  assert.ok(r.aliases.includes('civil-1') && r.aliases.includes('tankan'), `別名を拾えていない: ${r.aliases.join(',')}`);
  assert.deepEqual(r.config.violations, []);
  assert.deepEqual(r.derived.diffs, []);
  assert.deepEqual(r.code.hits, []);
});
