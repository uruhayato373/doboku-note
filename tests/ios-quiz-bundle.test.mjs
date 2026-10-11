import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkIds,
  collectImageSrcs,
  rewriteImageSrcs,
  unsupportedImageSrcs,
  toBundleQuestion,
} from '../scripts/build-ios-quiz-bundle.mjs';
import { SOURCES, buildDataset, optionsFromTable, toYearLabel } from '../scripts/build-quiz-data.mjs';
import { APPS } from '../scripts/build-ios-quiz-bundle.mjs';

const ds = (exam, ids) => ({ exam, questions: ids.map((id) => ({ id })) });

test('前回の manifest から消えた問題 ID を拾う（学習履歴は ID に紐づくので、消えたら書き出しを止める）', () => {
  const previous = { exams: [{ exam: 'cem', ids: ['h21-01', 'h21-02'] }] };
  assert.deepEqual(checkIds([ds('cem', ['h21-01'])], previous).removed, [{ exam: 'cem', id: 'h21-02' }]);
  assert.deepEqual(checkIds([ds('cem', ['h21-01', 'h21-02', 'h21-03'])], previous).removed, []);
});

test('意図して消す ID だけは --allow-removed で通す', () => {
  const previous = { exams: [{ exam: 'cem', ids: ['h21-01', 'h21-02'] }] };
  assert.deepEqual(checkIds([ds('cem', ['h21-01'])], previous, ['cem/h21-02']).removed, []);
});

test('アプリから試験ごと外したときも、その試験の ID を消えたものとして数える', () => {
  const previous = { exams: [{ exam: 'pe-first-stage', ids: ['a'] }, { exam: 'cem', ids: ['b'] }] };
  assert.deepEqual(checkIds([ds('pe-first-stage', ['a'])], previous).removed, [{ exam: 'cem', id: 'b' }]);
});

test('試験の中で ID が重複していれば拾う。初回（前回 manifest なし）は消えた ID を数えない', () => {
  const r = checkIds([ds('cem', ['x', 'y', 'x'])], null);
  assert.deepEqual(r.duplicates, [{ exam: 'cem', id: 'x' }]);
  assert.deepEqual(r.removed, []);
});

test('記事画像の参照を集め、アプリ内の images/ へ書き換える。外部 URL は同梱できないものとして返す', () => {
  const html = '<p>図</p><img src="/posts/pe-first-stage/r07-basic/img/q33-fig.webp" alt="図"><img alt="x" src="https://example.com/a.png">';
  assert.deepEqual(collectImageSrcs(html), ['/posts/pe-first-stage/r07-basic/img/q33-fig.webp']);
  assert.match(rewriteImageSrcs(html), /src="images\/pe-first-stage\/r07-basic\/img\/q33-fig\.webp"/);
  assert.deepEqual(unsupportedImageSrcs(html), ['https://example.com/a.png']);
});

test('HTML の無い選択肢・解説は Markdown から作り、画像の参照も書き換える', () => {
  const q = toBundleQuestion({
    id: 'x',
    body: '本文',
    bodyHtml: '<img src="/posts/a/b.webp">',
    options: [{ num: 1, text: '$x$ の値' }],
    explanations: [{ num: 1, text: '', correct: true }],
  });
  assert.equal(q.bodyHtml, '<img src="images/a/b.webp">');
  assert.match(q.options[0].html, /katex/);
  assert.equal(q.explanations[0].html, '');
});

test('本文の表から組合せ問題の選択肢を取り出す（行が番号・列の見出しが ①〜⑤ の両方）', () => {
  const rows = '式\n\n|  | ア | イ |\n|---|---|---|\n| 1. | 労働分配率 | 労務比率 |\n| 2. | 付加価値額 | 労務比率 |';
  assert.deepEqual(optionsFromTable(rows), [
    { num: 1, text: '労働分配率 ／ 労務比率' },
    { num: 2, text: '付加価値額 ／ 労務比率' },
  ]);
  const cols = '表\n\n|  | ① | ② | ③ |\n|:---:|:---:|:---:|:---:|\n| 固定電話 | 37.0 | 65.4 | 65.4 |';
  assert.deepEqual(optionsFromTable(cols).map((o) => o.text), ['表の①', '表の②', '表の③']);
  assert.deepEqual(optionsFromTable('表の無い本文'), []);
});

test('番号と 1 列目の語が同じセルにある表（2級土木）からも選択肢を取り出す', () => {
  const body = '組合せ\n\n| 土工作業の種類 | 使用機械 |\n|---|---|\n| (1) 掘削・積込み | バックホウ |\n| (2) 溝掘り | ランマ |';
  assert.deepEqual(optionsFromTable(body), [
    { num: 1, text: '掘削・積込み ／ バックホウ' },
    { num: 2, text: '溝掘り ／ ランマ' },
  ]);
});

test('2級土木の前期・後期を年度の表示名に出す', () => {
  assert.equal(toYearLabel('r03z'), '令和3年度（前期）');
  assert.equal(toYearLabel('r05k'), '令和5年度（後期）');
  assert.equal(toYearLabel('r01-retry'), '令和元年度（再試験）');
  assert.equal(toYearLabel('h26'), '平成26年度');
});

test('土木施工管理技士アプリは 1級・2級の全問を出題できる（選択肢が表にしか無い組合せ問題も落とさない）', () => {
  assert.deepEqual(APPS.doboku.exams, ['civil-1', 'civil-2']);
  for (const exam of APPS.doboku.exams) {
    const source = SOURCES.find((s) => s.exam === exam);
    assert.ok(source, exam);
    const ds = buildDataset(source);
    assert.ok(ds.questions.length > 500, `${exam}: ${ds.questions.length} 問`);
    assert.ok(ds.questions.every((q) => q.options.length >= 2), `${exam}: 選択肢の無い問題がある`);
  }
});
