import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findUnrenderedTables, stripFrontmatter } from '../scripts/lib/table-rendering-rules.mjs';

// 2026-08-28 の事故: 表が table にならず生のパイプ区切りテキストとして表示された。
// 原因は 2 つ（改行コードの \r\r\n 破損 / ヘッダとデリミタのセル数不一致）だったが、
// 症状は同じ＝デリミタ行が text ノードとして生き残る。原因ではなく症状を固定する。

test('正常な表は検出されない', () => {
  const body = [
    '本文',
    '',
    '| A | B |',
    '|---|---|',
    '| 1 | 2 |',
    '',
  ].join('\n');
  assert.deepEqual(findUnrenderedTables(body), []);
});

test('先頭セルが空の表も正常に table になる（誤検出しない）', () => {
  const body = ['', '|  | A | B |', '|---|---|---|', '| 1 | ア | イ |', ''].join('\n');
  assert.deepEqual(findUnrenderedTables(body), []);
});

test('ヘッダとデリミタのセル数不一致を検出する（r02-primary の実例）', () => {
  // ヘッダ5セルに対しデリミタ6セル。GFM はセル数一致を要求するため table にならない
  const body = [
    '',
    '|    | （ア） | （イ） | （ウ） | （エ） |',
    '|----|----|----|----|----|----|',
    '| ① | 調和平均 | 指数化 | 因子分析 | 主成分分析 |',
    '',
  ].join('\n');
  const hits = findUnrenderedTables(body);
  assert.equal(hits.length, 1, 'セル数不一致は検出されなければならない');
});

test('\\r\\r\\n による改行破損を検出する（過去問18本の実例）', () => {
  // micromark は \r\r\n を行末2つと解釈し、全行間に空行が挿入された扱いになる
  const body = '\r\r\n| A | B |\r\r\n|---|---|\r\r\n| 1 | 2 |\r\r\n';
  const hits = findUnrenderedTables(body);
  assert.ok(hits.length >= 1, '連続 CR による未レンダリングも同じ網で拾えなければならない');
});

test('コードブロック内のパイプ区切りは誤検出しない', () => {
  const body = [
    '説明文',
    '',
    '```',
    '| A | B |',
    '|---|---|',
    '| 1 | 2 |',
    '```',
    '',
  ].join('\n');
  assert.deepEqual(findUnrenderedTables(body), []);
});

test('インラインコード内のデリミタ行も誤検出しない', () => {
  const body = '区切り行は `|---|---|` と書く。\n';
  assert.deepEqual(findUnrenderedTables(body), []);
});

test('検出結果は行番号を持つ', () => {
  const body = ['行1', '', '| A | B |', '|---|---|---|', '| 1 | 2 |', ''].join('\n');
  const hits = findUnrenderedTables(body);
  assert.equal(hits.length, 1);
  assert.ok(typeof hits[0].line === 'number' && hits[0].line > 0, '行番号が付く');
});

test('stripFrontmatter は frontmatter を除き行番号 offset を返す', () => {
  const raw = ['---', 'title: t', 'published: true', '---', '', '本文'].join('\n');
  const { body, offset } = stripFrontmatter(raw);
  assert.ok(!body.includes('title:'), 'frontmatter は本文に含まれない');
  assert.equal(offset, 4, '閉じ --- の行番号が offset になる');
});

test('frontmatter を持たない本文はそのまま返る', () => {
  const raw = '# 見出し\n\n本文\n';
  const { body, offset } = stripFrontmatter(raw);
  assert.equal(body, raw);
  assert.equal(offset, 0);
});
