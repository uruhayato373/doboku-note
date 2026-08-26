/**
 * noteSeries / noteMagazine の語彙境界（check-note-vocabulary-boundary）のテスト。
 *
 * 境界（DN-0125）: noteSeries = 編集上の系列マーカー、noteMagazine = 商品（マガジン）への
 * 所属ラベル。両者は語尾違い等で値が異なってよいが、次の3パターンは取り違え事故として検知する。
 *   R1: noteSeries に note-magazines.ts の id（内部slug）を書いている
 *   R2: noteSeries が他マガジンの商品ラベル（labels キー）と一致し、自分の noteMagazine と異なる
 *   R3: noteSeries: 総合案内（もくじ index）なのに noteMagazine も設定されている
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  evaluateBoundary, parseLabelKeys, parseMagazineIds, parseVocabFields,
} from '../scripts/check-note-vocabulary-boundary.mjs';

// ---- parseVocabFields ----

test('frontmatter から noteSeries/noteMagazine を読む（引用符・CRLF 両対応）', () => {
  const r = parseVocabFields('---\nnoteSeries: 施工経験記述\nnoteMagazine: "1級土木-施工経験記述-完成答案集"\n---\n');
  assert.equal(r.noteSeries, '施工経験記述');
  assert.equal(r.noteMagazine, '1級土木-施工経験記述-完成答案集');

  const crlf = parseVocabFields('---\r\nnoteSeries: 総合案内\r\n---\r\n');
  assert.equal(crlf.noteSeries, '総合案内');
  assert.equal(crlf.noteMagazine, null);
});

test('どちらも無ければ null（frontmatter 自体が無い場合も）', () => {
  assert.deepEqual(parseVocabFields('---\ntitle: x\n---\n'), { noteSeries: null, noteMagazine: null });
  assert.deepEqual(parseVocabFields('# 見出しだけ'), { noteSeries: null, noteMagazine: null });
});

// ---- parseMagazineIds / parseLabelKeys ----

test('note-magazines.ts の id 一覧を抽出する', () => {
  const src = "const X = {\n  'foo-magazine': {\n    id: 'foo-magazine',\n  },\n  'bar-magazine': {\n    id: 'bar-magazine',\n  },\n};";
  const ids = parseMagazineIds(src);
  assert.ok(ids.has('foo-magazine'));
  assert.ok(ids.has('bar-magazine'));
  assert.equal(ids.size, 2);
});

test('note-magazine-membership.json の labels キー一覧を抽出する', () => {
  const cfg = JSON.stringify({ labels: { 'ラベルA': 'id-a', 'ラベルB': 'id-b' } });
  const keys = parseLabelKeys(cfg);
  assert.ok(keys.has('ラベルA'));
  assert.equal(keys.size, 2);
});

// ---- evaluateBoundary（本体ロジック） ----

const IDS = new Set(['essay-river-consultant-magazine', 'cce-essay-persona-pack']);
const LABELS = new Set(['総監模範論文-河川コンサル', 'コンクリート主任技士-実務立場別小論文集']);

test('正常系: noteSeries と noteMagazine が語尾違いでも違反なし', () => {
  const vs = evaluateBoundary({
    noteSeries: 'コンクリート主任技士-実務立場別小論文',
    noteMagazine: 'コンクリート主任技士-実務立場別小論文集',
    magazineIds: IDS,
    labelKeys: LABELS,
  });
  assert.deepEqual(vs, []);
});

test('正常系: noteSeries のみの編集ラベル（学習戦略 等）は違反なし', () => {
  const vs = evaluateBoundary({
    noteSeries: '学習戦略', noteMagazine: null, magazineIds: IDS, labelKeys: LABELS,
  });
  assert.deepEqual(vs, []);
});

test('正常系: 総合案内かつ noteMagazine 無しは違反なし', () => {
  const vs = evaluateBoundary({
    noteSeries: '総合案内', noteMagazine: null, magazineIds: IDS, labelKeys: LABELS,
  });
  assert.deepEqual(vs, []);
});

test('R1（負のテスト）: noteSeries が内部 id（slug）と一致 → HIGH', () => {
  const vs = evaluateBoundary({
    noteSeries: 'essay-river-consultant-magazine',
    noteMagazine: '総監模範論文-河川コンサル',
    magazineIds: IDS,
    labelKeys: LABELS,
  });
  assert.equal(vs.length, 1);
  assert.equal(vs[0].rule, 'R1');
  assert.equal(vs[0].severity, 'HIGH');
});

test('R2（負のテスト）: noteSeries が他マガジンの商品ラベルと一致 → HIGH', () => {
  const vs = evaluateBoundary({
    noteSeries: '総監模範論文-河川コンサル', // 本来は自分の noteMagazine 側に書くべき値
    noteMagazine: 'コンクリート主任技士-実務立場別小論文集', // 別マガジンに収録されている記事
    magazineIds: IDS,
    labelKeys: LABELS,
  });
  assert.equal(vs.length, 1);
  assert.equal(vs[0].rule, 'R2');
  assert.equal(vs[0].severity, 'HIGH');
});

test('R2 は自分自身の noteMagazine と一致するなら違反にしない（同値は許容パターン）', () => {
  const vs = evaluateBoundary({
    noteSeries: '総監模範論文-河川コンサル',
    noteMagazine: '総監模範論文-河川コンサル',
    magazineIds: IDS,
    labelKeys: LABELS,
  });
  assert.deepEqual(vs, []);
});

test('R3（負のテスト）: 総合案内なのに noteMagazine が設定されている → MEDIUM', () => {
  const vs = evaluateBoundary({
    noteSeries: '総合案内',
    noteMagazine: 'コンクリート主任技士-実務立場別小論文集',
    magazineIds: IDS,
    labelKeys: LABELS,
  });
  assert.equal(vs.length, 1);
  assert.equal(vs[0].rule, 'R3');
  assert.equal(vs[0].severity, 'MEDIUM');
});

test('複数ルールに同時抵触する場合は全件返す', () => {
  const vs = evaluateBoundary({
    noteSeries: 'essay-river-consultant-magazine', // R1: idと一致
    noteMagazine: null,
    magazineIds: IDS,
    labelKeys: LABELS,
  });
  assert.equal(vs.length, 1); // R2/R3 は該当条件を満たさないため R1 のみ
  assert.equal(vs[0].rule, 'R1');
});
