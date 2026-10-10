/**
 * 書籍の網羅の判定を記事ごとの brief に束ねる処理（DN-0621）のテスト。書籍の中身は使わず、作った判定で確かめる。
 *
 * 守りたい事故:
 *   A. 同じ記事に効く複数の本の追記が、別々の brief に割れて 2 回書かれる。
 *   B. 新しい記事の案が、別の slug で重複して起こされる（2026-10-09 の経営事項審査の 3 案）・既存記事と二重になる。
 *   C. 追記の無い計画の行（ほかの記事へ振り分けた残り）が展開の対象に入る。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { buildBriefs, titleSimilarity } from '../scripts/lib/book-coverage-briefs.mjs';

const add = (heading, extra = {}) => ({ priority: 'B', heading, level: 2, after: '概要', points: ['論点1', '論点2'], unitIds: ['u1'], ...extra });
const book = (id, shelf, plan) => ({
  id, shelf, directory: `${id}__書名`,
  verdict: { plan },
  candidates: { units: [{ id: 'u1', file: 'part-01.md', page: 'p.10', heading: '節の見出し' }] },
});

test('buildBriefs: 同じ記事への複数の本の追記を 1 本の brief に束ね、書籍 id を全部挙げる（A）', () => {
  const { briefs, items } = buildBriefs({
    books: [
      book('book-a', '1級・2級土木', [{ article: 'civil-construction-1/guide-x', additions: [add('見出しA', { priority: 'C' })] }]),
      book('book-b', '土木実務', [{ article: 'civil-construction-1/guide-x', additions: [add('見出しB', { priority: 'A', photo: '現場の写真' })] }]),
    ],
    existing: new Map([['civil-construction-1/guide-x', '既存の記事']]),
  });
  assert.equal(items.length, 1);
  assert.deepEqual(items[0], { article: 'civil-construction-1/guide-x', file: 'civil-construction-1__guide-x', new: false, adds: 2, sources: ['book-a', 'book-b'], photos: 1 });
  const brief = briefs[0].brief;
  assert.match(brief, /書籍 id（frontmatter の sources に足す）: book-a, book-b/);
  assert.ok(brief.indexOf('[A] 見出しB') < brief.indexOf('[C] 見出しA'), '優先度の順に並べる');
  assert.match(brief, /写真の案: 現場の写真/);
  assert.match(briefs[0].qa, /content\/sources\/books\/book-a__書名\/ocr\/part-01\.md（p\.10・「節の見出し」）/);
});

test('buildBriefs: 追記の無い計画の行は展開の対象に入れない（C）', () => {
  const { items } = buildBriefs({
    books: [book('book-a', 's', [{ article: 'x/moved-away', additions: [] }, { article: 'x/target', additions: [add('h')] }])],
    existing: new Map([['x/target', 't']]),
  });
  assert.deepEqual(items.map((i) => i.article), ['x/target']);
});

test('buildBriefs: 新規案が既にある記事なら追記として束ね、alias で寄せた案も追記にする（B）', () => {
  const { items, warnings } = buildBriefs({
    books: [book('book-a', 's', [
      { article: 'civil-practice/existing-one', new: true, title: '既存と同じ', additions: [add('h1')] },
      { article: 'civil-practice/keishin-variant', new: true, title: '経審の別案', additions: [add('h2')] },
    ])],
    alias: { 'civil-practice/keishin-variant': 'civil-practice/keishin-main' },
    existing: new Map([['civil-practice/existing-one', '既存と同じ']]),
  });
  assert.equal(items.find((i) => i.article === 'civil-practice/existing-one').new, false);
  assert.ok(warnings.some((w) => w.includes('civil-practice/existing-one') && w.includes('既にある記事')));
  const merged = items.find((i) => i.article === 'civil-practice/keishin-main');
  assert.ok(merged, 'alias の先へ寄せる');
  assert.equal(merged.new, false, 'alias で寄せた案は新規として起こさない');
});

test('buildBriefs: 同じ資格で題名の近い新規案どうし・既存の記事を要確認として挙げる（B）', () => {
  const { warnings, items } = buildBriefs({
    books: [
      book('book-a', 's', [{ article: 'civil-practice/keishin-a', new: true, title: '経営事項審査と入札参加資格の仕組み', additions: [add('h')] }]),
      book('book-b', 's', [{ article: 'civil-practice/keishin-b', new: true, title: '経営事項審査と入札参加資格の基本', additions: [add('h')] }]),
      book('book-c', 's', [{ article: 'pe-construction/keishin-c', new: true, title: '経営事項審査と入札参加資格の仕組み', additions: [add('h')] }]),
    ],
    existing: new Map([['civil-practice/bidding', '公共工事の入札参加資格の仕組み']]),
  });
  assert.equal(items.filter((i) => i.new).length, 3, '寄せるかは親が決める（自動では寄せない）');
  assert.ok(warnings.some((w) => w.includes('keishin-a') && w.includes('keishin-b') && w.startsWith('新規案どうし')));
  assert.ok(!warnings.some((w) => w.includes('keishin-c') && w.startsWith('新規案どうし')), '別の資格の案は比べない');
  assert.ok(titleSimilarity('経営事項審査と入札参加資格の仕組み', '経営事項審査と入札参加資格の基本') >= 0.5);
  assert.ok(titleSimilarity('コンクリートの養生', '盛土の締固め') < 0.2);
});

test('buildBriefs: 記事は棚の順（書籍を渡した順）、同じ棚では追記の多い順に並べる', () => {
  const { items } = buildBriefs({
    books: [
      book('first', '1級・2級土木', [{ article: 'a/one', additions: [add('h')] }]),
      book('second', '技術士', [{ article: 'b/many', additions: [add('h'), add('i'), add('j')] }, { article: 'b/few', additions: [add('h')] }]),
    ],
    existing: new Map([['a/one', ''], ['b/many', ''], ['b/few', '']]),
  });
  assert.deepEqual(items.map((i) => i.article), ['a/one', 'b/many', 'b/few']);
});
