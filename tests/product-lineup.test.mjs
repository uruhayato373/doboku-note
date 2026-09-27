// tests/product-lineup.test.mjs
//
// 商品ラインナップ（資格 × 試験区分 × チャネル）の分類ロジックの単体テスト。
// 要点は「ルールに当たらない商品を黙って落とさず unclassified に残す」ことと、
// 実 config が自己整合している（未定義マス・不正な正規表現が無い）こと。

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  loadLineupConfig,
  validateLineupConfig,
  classifyProduct,
  buildLineup,
  cellKeys,
} from '../scripts/lib/product-lineup.mjs';

const CONFIG = {
  qualifications: [
    { id: 'civil-1', label: '1級', stages: [{ id: 'first', label: '一次' }, { id: 'second', label: '二次' }] },
    { id: 'pe', label: '技術士', stages: [{ id: 'written', label: '筆記' }] },
  ],
  channels: [{ id: 'note', label: 'note' }, { id: 'app', label: 'アプリ' }],
  rules: {
    note: [
      { match: '^civil-1-takuitsu', cells: ['civil-1:first'] },
      { match: '^civil-1-', cells: ['civil-1:second'] },
      { match: '^both-', cells: ['civil-1:second', 'pe:written'] },
    ],
  },
  apps: [{ id: 'ios-x', cells: ['pe:written'] }],
};

test('実 config は自己整合している', () => {
  const config = loadLineupConfig();
  assert.deepEqual(validateLineupConfig(config), []);
  assert.ok(cellKeys(config).length > 0);
});

test('最初に一致したルールを採る', () => {
  assert.deepEqual(classifyProduct(CONFIG.rules.note, 'civil-1-takuitsu-pdf'), ['civil-1:first']);
  assert.deepEqual(classifyProduct(CONFIG.rules.note, 'civil-1-anki'), ['civil-1:second']);
  assert.equal(classifyProduct(CONFIG.rules.note, 'unknown-x'), null);
  assert.equal(classifyProduct(undefined, 'civil-1-anki'), null);
});

test('buildLineup: 複数マス・明示 cells・未分類', () => {
  const { rows, unclassified } = buildLineup(CONFIG, [
    { channel: 'note', id: 'civil-1-takuitsu-pdf' },
    { channel: 'note', id: 'both-pack' },
    { channel: 'note', id: 'mystery' },
    { channel: 'app', id: 'ios-x', cells: ['pe:written'] },
    { channel: 'app', id: 'no-rule-app' },
  ]);
  const row = (k) => rows.find((r) => r.key === k);
  assert.deepEqual(row('civil-1:first').byChannel.note.map((i) => i.id), ['civil-1-takuitsu-pdf']);
  assert.deepEqual(row('civil-1:second').byChannel.note.map((i) => i.id), ['both-pack']);
  assert.deepEqual(row('pe:written').byChannel.note.map((i) => i.id), ['both-pack']);
  assert.deepEqual(row('pe:written').byChannel.app.map((i) => i.id), ['ios-x']);
  assert.deepEqual(unclassified.map((i) => i.id), ['mystery', 'no-rule-app']);
  assert.equal(row('civil-1:first').isFirstStage, true);
  assert.equal(row('civil-1:second').stageCount, 2);
});

test('validateLineupConfig: 未定義マス・不正な正規表現・未知チャネルを検出する', () => {
  const bad = {
    ...CONFIG,
    rules: { note: [{ match: '(', cells: ['civil-1:third'] }], x: [] },
    apps: [{ id: 'a', cells: [] }],
  };
  const errors = validateLineupConfig(bad);
  assert.ok(errors.some((e) => e.includes('正規表現が不正')));
  assert.ok(errors.some((e) => e.includes('未定義のマス civil-1:third')));
  assert.ok(errors.some((e) => e.includes('rules.x')));
  assert.ok(errors.some((e) => e.includes('apps.a: cells が空')));
});

test('classifySale: 売上の接頭辞を外し、salesRules → rules.note の順で写す', async () => {
  const { classifySale } = await import('../scripts/lib/product-lineup.mjs');
  const config = { salesRules: [{ match: '^bk-', cells: ['b:written'] }], rules: { note: [{ match: '^civil-1-', cells: ['c:second'] }] } };
  assert.deepEqual(classifySale(config, 'article:bk-road-r8'), ['b:written']);
  assert.deepEqual(classifySale(config, 'membership:civil-1-lab'), ['c:second']);
  assert.equal(classifySale(config, 'article:unknown'), null);
});
