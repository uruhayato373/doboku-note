import { test } from 'node:test';
import assert from 'node:assert/strict';
import { articleKey, buildBookBasis, isNotContentReason } from '../scripts/lib/series-basis-build.mjs';

const resolve = (key) => (['civil-practice/a', 'civil-practice/b', 'civil-practice/c'].includes(key) ? `content/site/${key}/article.mdx` : null);

test('記事にしない理由と、当時のサイトの範囲の外を分ける', () => {
  for (const r of ['前付け・目次', '索引', '本の中で重複', '過去問の設問', '答案例']) assert.equal(isNotContentReason(r), true, r);
  for (const r of ['画像処理の基礎理論', 'CG描画理論', '経営論', '都市緑化']) assert.equal(isNotContentReason(r), false, r);
});

test('where の記事名は節（#）や余計な階層を落として取り出す', () => {
  assert.equal(articleKey('civil-practice/gis-layer-validation#図形・属性'), 'civil-practice/gis-layer-validation');
  assert.equal(articleKey(null), null);
});

test('判定ごとに行き先を決め、範囲外の一部だけを判定し直す候補にする', () => {
  const candidates = { units: [
    { id: 'u0001', page: 'p0001' },
    { id: 'u0002', page: 'p0002' },
    { id: 'u0003', page: 'p0003', bestArticles: [{ article: 'civil-practice/c' }] },
    { id: 'u0004', page: 'p0004' },
    { id: 'u0005', page: 'p0005' },
  ] };
  const verdict = {
    units: [
      { id: 'u0001', verdict: 'out-of-scope', reason: '目次' },
      { id: 'u0002', verdict: 'out-of-scope', reason: '画像処理の基礎理論' },
      { id: 'u0004', verdict: 'gap' },
      { id: 'u0005', verdict: 'covered', where: 'civil-practice/a#節' },
    ],
    plan: [{ article: 'civil-practice/b', additions: [{ unitIds: ['u0004'] }] }],
  };
  const r = buildBookBasis(candidates, verdict, resolve);
  assert.deepEqual(r.units, {
    u0001: { excluded: '目次' },
    u0002: { excluded: '画像処理の基礎理論', revisit: true },
    u0003: { article: 'content/site/civil-practice/c/article.mdx' },
    u0004: { article: 'content/site/civil-practice/b/article.mdx' },
    u0005: { article: 'content/site/civil-practice/a/article.mdx' },
  });
  assert.deepEqual(r.pages.u0004, ['p0004']);
  assert.deepEqual(r.counts, { article: 3, excluded: 2, revisit: 1 });
  assert.deepEqual(r.unresolved, []);
});

test('穴なのに展開計画に無い項目は割り当てられないとして返す（近い記事で埋めない）', () => {
  const r = buildBookBasis({ units: [{ id: 'u0001', bestArticles: [{ article: 'civil-practice/a' }] }] }, { units: [{ id: 'u0001', verdict: 'gap' }], plan: [] }, resolve);
  assert.deepEqual(r.unresolved, ['u0001']);
});
