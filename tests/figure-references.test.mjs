import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  checkAgainstOcr, checkArticleFigures, figureNamesMatch, parseArticleFigures, parseOcrFigureNames,
} from '../scripts/lib/figure-references.mjs';

const img = (src, caption, alt = 'a') => `<ArticleImage src="/p/img/${src}" alt="${alt}" caption="${caption}" width={400} height={500} />`;
const doc = (...lines) => ['---', 'title: t', '---', '', ...lines].join('\n');
const kinds = (text) => checkArticleFigures(text).problems.map((p) => p.kind);

test('図番号が重複すると dup-number', () => {
  const t = doc('## A', img('a.svg', '図2.1 素掘り排水溝'), img('b.svg', '図2.1 素掘り排水溝'));
  assert.deepEqual(kinds(t), ['dup-number']);
});

test('図名に分割の印があると split-mark', () => {
  const t = doc('## A', img('a.svg', '図2.2 置換工法（上部）'), img('b.svg', '図2.3 置換工法（詳細）'));
  assert.deepEqual(kinds(t), ['split-mark', 'split-mark']);
});

test('alt が別の図番号で始まると alt-number', () => {
  const t = doc('## A', img('a.svg', '図2.1 素掘り排水溝', '図2.4 別の図'));
  assert.deepEqual(kinds(t), ['alt-number']);
});

test('本文の図参照は同じ節の図を指す（別の節・無い図は ref-section）', () => {
  const ok = doc('## A', '### B', '段切りを行う（図2.1）。', img('a.svg', '図2.1 段切り'));
  assert.deepEqual(kinds(ok), []);
  const other = doc('## A', '### B', img('a.svg', '図2.1 段切り'), '### C', '前掲の図2.1 のとおり。');
  assert.deepEqual(kinds(other), ['ref-section']);
  const none = doc('## A', '### B', '図2.9 を見る。', img('a.svg', '図2.1 段切り'));
  assert.deepEqual(kinds(none), ['ref-section']);
});

test('caption が無い図は src の figure-X-Y.svg を参照先の番号にする', () => {
  const t = doc('## A', 'ヒストグラム（図4.7）は分布を表す。', img('figure-4-7.svg', '').replace(' caption=""', ''));
  assert.deepEqual(kinds(t), []);
});

test('コードフェンスの中と frontmatter は見ない', () => {
  const t = doc('## A', '```', '図9.9', '```', img('a.svg', '図2.1 x'));
  assert.equal(parseArticleFigures(t).refs.length, 0);
});

test('OCR の図名を抜き出す（先頭の図名だけ・説明は落とす）', () => {
  const m = parseOcrFigureNames('（図: 図2.41　押え盛土工法。縦軸は…）\n（図: 図2.14 張芝工＝切芝（べた張り）\n');
  assert.deepEqual(m.get('2.41'), ['押え盛土工法']);
  assert.deepEqual(m.get('2.14'), ['張芝工']);
});

test('図名の一致: 包含・連続 4 字以上の共通を許し、別の図は弾く', () => {
  assert.ok(figureNamesMatch('素掘り排水溝', '素掘り排水溝'));
  assert.ok(figureNamesMatch('補強土工法の概念図（補強材を置く3つの場所）', '補強土工法の概念図'));
  assert.ok(figureNamesMatch('スランプ試験', 'フレッシュコンクリートの性質（スランプ試験）'));
  assert.ok(!figureNamesMatch('サーチャージ工法の原理', '押え盛土工法'));
  assert.ok(!figureNamesMatch('', '押え盛土工法'));
});

test('OCR 突合: 番号が無い・図名が違うを区別し、検査した図の数を返す', () => {
  const idx = new Map([['wb', parseOcrFigureNames('（図: 図2.41 押え盛土工法。x）\n（図: 図2.42 置換工法。y）')]]);
  const t = doc('## A', img('a.svg', '図2.41 サーチャージ工法の原理'), img('b.svg', '図2.42 置換工法（上部）'), img('c.svg', '図9.9 無い図'), img('d.svg', '名前だけ'));
  const r = checkAgainstOcr(parseArticleFigures(t).figures, idx);
  assert.equal(r.checked, 3);
  assert.deepEqual(r.problems.map((p) => p.kind), ['ocr-name', 'ocr-number']);
});

test('記事の現物: 図番号・参照・分割の印の不一致が 0 件で、1 本以上を検査する', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const r = spawnSync(process.execPath, ['scripts/check-figure-references.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /対象記事 [1-9]\d* 本/);
  assert.match(r.stdout, /不一致 0 件/);
});
