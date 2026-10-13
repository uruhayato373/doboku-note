import { strict as assert } from 'node:assert';
import test from 'node:test';
import { itemState, seriesContext, loadSeriesConfig, validateSeries, seriesView } from '../scripts/lib/content-series.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const A = 'content/site/civil-practice/a/article.mdx';
const B = 'content/site/civil-practice/b/article.mdx';
const files = { [A]: { exists: true, published: true }, [B]: { exists: true, published: false } };
const stateOf = (p) => files[p] ?? { exists: false, published: false };

test('itemState: 状態は計画と記事の実体から出す（台帳に手で書かない）', () => {
  assert.equal(itemState({ plan: 'new' }, stateOf), 'planned');
  assert.equal(itemState({ plan: 'new', paths: ['content/site/civil-practice/x/article.mdx'] }, stateOf), 'planned');
  assert.equal(itemState({ plan: 'new', paths: [B] }, stateOf), 'draft');
  assert.equal(itemState({ plan: 'new', paths: [A] }, stateOf), 'published');
  assert.equal(itemState({ plan: 'new', paths: [A, B] }, stateOf), 'draft');
  assert.equal(itemState({ plan: 'strengthen', paths: [A] }, stateOf), 'strengthen');
  assert.equal(itemState({ plan: 'existing', paths: [A] }, stateOf), 'existing');
  assert.equal(itemState({ plan: 'existing', paths: ['content/site/civil-practice/gone/article.mdx'] }, stateOf), 'missing');
  assert.equal(itemState({ plan: 'excluded', reason: 'x' }, stateOf), 'excluded');
});

test('validateSeries: 根拠の id・既存記事・関連記事・対象外の理由・入口を検査する', () => {
  const ctx = { sourceIds: new Set(['road-act', 'jis']), curriculumCategories: new Set(['civil-practice']), stateOf };
  const ok = { series: [{ id: 's', entry: { hubItem: 'X-1', curriculum: 'civil-practice:new-block' }, sections: [{ title: 't', items: [
    { id: 'X-1', title: 'a', plan: 'new', sources: ['road-act', 'jis#A5308'] },
    { id: 'X-2', title: 'b', plan: 'existing', paths: [A], links: [B] },
  ] }] }] };
  assert.deepEqual(validateSeries(ok, ctx), []);

  const bad = { series: [{ id: 's', entry: { hubItem: 'X-9', curriculum: 'nope:b' }, sections: [{ title: 't', items: [
    { id: 'X-1', title: 'a', plan: 'new', sources: ['no-such-law'] },
    { id: 'X-1', title: 'dup', plan: 'strengthen' },
    { id: 'X-3', title: 'c', plan: 'existing', paths: ['content/site/civil-practice/gone/article.mdx'], links: ['content/site/civil-practice/gone2/article.mdx'] },
    { id: 'X-4', title: 'd', plan: 'excluded' },
    { id: 'X-5', title: 'e', plan: 'new', paths: ['docs/x.md'] },
  ] }] }] };
  const issues = validateSeries(bad, ctx).join('\n');
  for (const re of [/no-such-law/, /項目の id が重複/, /記事のパスが無い/, /既存の記事が無い/, /関連記事が無い/, /理由が無い/, /入口のハブ X-9/, /nope:b/, /パスの形が違う/]) {
    assert.match(issues, re);
  }
});

test('実データ: 台帳 config/content-series.json は違反 0 で、項目の状態が出る', () => {
  const config = loadSeriesConfig(REPO_ROOT);
  const ctx = seriesContext(REPO_ROOT);
  assert.deepEqual(validateSeries(config, ctx), []);
  const view = seriesView(config, ctx.stateOf);
  assert.ok(view.length >= 1);
  for (const s of view) assert.equal(s.summary.missing, 0);
});
