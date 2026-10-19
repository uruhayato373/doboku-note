import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AMENDMENT_BLOCK_END,
  AMENDMENT_BLOCK_START,
  amendmentChapterOf,
  compareChars,
  normalizeArticle,
  normalizeSection,
  resolveAmendmentEntries,
  stripAmendmentBlocks,
  validatePageShape,
} from '../scripts/lib/standards-amendments.mjs';

test('文字の照合は空白を除いた多重集合で、並べ替えは許し追加・欠落は拾う', () => {
  assert.equal(compareChars('受注者は、\n  監督職員', ['監督職員', '受注者は、']).ok, true);
  const missing = compareChars('受注者は、', ['受注者は']);
  assert.equal(missing.ok, false);
  assert.equal(missing.missing, '、');
  const extra = compareChars('受注者', ['受注者：']);
  assert.equal(extra.extra, '：');
});

test('条番号・節番号の読み方（全角・範囲・追加・3 段）', () => {
  assert.equal(normalizeArticle('１－１－１－３'), '1-1-1-3');
  assert.equal(normalizeArticle('1-1-1-17～1-1-1-19'), '1-1-1-17');
  assert.equal(normalizeArticle('1-追加'), null);
  assert.equal(normalizeArticle('1-3-2'), null);
  assert.equal(normalizeSection('1-3-2 適用すべき諸基準'), '1-3-2');
  assert.equal(normalizeSection('6-8-3-追加'), '6-8-3');
  assert.equal(normalizeSection('1-1-1-3'), null);
  assert.equal(normalizeSection('3-追加'), null);
});

const page = (number, entries, status = 'approved') => ({
  data: { page: number, chapters: ['1-1'], entries, review: { status } },
});

test('ページをまたぐ行: continued は前の行へ足し、joinFirst は段落をつなぎ、続きの表は行を足す', () => {
  const { entries } = resolveAmendmentEntries([
    page(2, [
      { article: '1-1-1-3', articleTitle: '設計図書の照査等', clause: '追加', heading: '資料の', kind: '追加', body: ['受注者は、監督職員と協議し', { table: [['金額', '資格'], ['4500 万円以上', '一級']] }] },
    ]),
    page(3, [
      { continued: true, heading: '貸与', body: [{ table: [['1 億 6000 万円未満', '']] }] },
      { article: null, clause: '34', heading: '工事関係書類', kind: '追-1', body: ['受注者は'] },
    ]),
  ]);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].heading, '資料の貸与');
  assert.deepEqual(entries[0].body[1].table.at(-1), ['1 億 6000 万円未満', '']);
  assert.deepEqual(entries[0].pages, [2, 3]);
  // 空欄（null）の条番号は前の行を引き継ぐ
  assert.equal(entries[1].articleNumber, '1-1-1-3');
  assert.equal(amendmentChapterOf(entries[1]), '1-1');
});

test('joinFirst は文の途中の改ページをつなぐ。承認されていないページは使わない', () => {
  const { entries, pages } = resolveAmendmentEntries([
    page(2, [{ article: '3-追加', kind: '', body: ['受注者は、作成しなけ'] }]),
    page(3, [{ continued: true, joinFirst: true, body: ['ればならない。'] }]),
    page(4, [{ article: '1-1-1-5', kind: '訂正', body: ['x'] }], 'draft'),
  ]);
  assert.deepEqual(pages, [2, 3]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].body[0], '受注者は、作成しなければならない。');
  // 条番号でない編章節条（3-追加）は前の行を引き継がず、ページの章に置く
  assert.equal(entries[0].articleNumber, null);
  assert.equal(amendmentChapterOf(entries[0]), '1-1');
});

test('形の検査: kind は空欄なら空文字、article の空欄は null、body は文字列か表', () => {
  const ok = validatePageShape({ page: 5, chapters: ['1-1'], review: { status: 'draft' }, entries: [{ article: null, kind: '', body: ['a', { table: [['b']] }] }] }, { page: 5 });
  assert.deepEqual(ok, []);
  const bad = validatePageShape({ page: 5, chapters: ['1-1'], review: { status: 'draft' }, entries: [{ article: '', kind: null, body: [''] }] }, { page: 5 });
  assert.equal(bad.length, 3);
});

test('差し込んだ訂正・追加は目印ごと取り除ける（地域差分・表の検査のため）', () => {
  const markdown = ['## 第1節 総則', '', AMENDMENT_BLOCK_START, '', '> 追加の行', '', AMENDMENT_BLOCK_END, '', '### 1-1-1-2 用語の定義', ''].join('\n');
  assert.equal(stripAmendmentBlocks(markdown), ['## 第1節 総則', '', '### 1-1-1-2 用語の定義', ''].join('\n'));
});

test('改ページで割れた表の 1 行は joinFirst でセルごとにつなぐ（数字の境目は 1 空白）', () => {
  const { entries } = resolveAmendmentEntries([
    page(13, [{ article: '1-1-1-9', kind: '追加', body: [{ table: [['金額', '資格'], ['4500 万円以上', 'イ 建設業法による技術検定のうち検']] }] }]),
    page(14, [{ continued: true, joinFirst: true, body: [{ table: [['1 億 6000 万円未満', '定種目を…']] }] }]),
  ]);
  assert.deepEqual(entries[0].body[0].table.at(-1), ['4500 万円以上 1 億 6000 万円未満', 'イ 建設業法による技術検定のうち検定種目を…']);
});

test('画像から起こした要素（source: image）は文字の照合から外し、形は検査する', async () => {
  const { pageStrings } = await import('../scripts/lib/standards-amendments.mjs');
  const data = {
    page: 8, chapters: ['1-1'], review: { status: 'draft' }, group: '【関係】', columns: null, extras: [],
    entries: [{ article: '1-1-1-1', kind: '追加', body: [
      '版面の文',
      { source: 'image', table: [['資料名', '内訳']] },
      { source: 'image', list: ['①施工計画書'] },
      { source: 'image', text: '1m3当り' },
      { source: 'image', figure: { file: 'amendments-p0011-signboard.webp', alt: '標示板の例', width: 10, height: 10 } },
    ] }],
  };
  assert.deepEqual(validatePageShape(data, { page: 8 }), []);
  assert.equal(pageStrings(data).join(''), '【関係】1-1-1-1追加版面の文');
  const bad = { ...data, entries: [{ article: null, kind: '', body: [{ list: ['source の無い箇条'] }, { source: 'image', figure: { file: '../x.png', alt: 'a', width: 1, height: 1 } }] }] };
  assert.equal(validatePageShape(bad, { page: 8 }).length, 2);
});
