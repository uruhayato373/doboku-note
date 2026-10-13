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

test('validateBasis: 書籍の項目数・割り当て先の項目と記事・書籍の区分を検査する', async () => {
  const { validateBasis, basisView } = await import('../scripts/lib/content-series.mjs');
  const config = { series: [{ id: 's', sections: [{ title: 't', items: [{ id: 'X-1', title: 'a', plan: 'new' }] }] }] };
  const ctx = {
    referenceClasses: new Map([['book', 'commercial-book'], ['law', 'external-primary']]),
    bookSummary: { book: { candidates: { textUnits: 3 } } },
    stateOf,
  };
  const ok = { books: { book: { units: { u0001: 's/X-1', u0002: { article: A }, u0003: { excluded: '索引' } } } } };
  assert.deepEqual(validateBasis(ok, config, ctx), []);
  assert.deepEqual(basisView(ok).byBook.book, { units: 3, series: 1, article: 1, excluded: 1 });
  assert.deepEqual(basisView(ok).byItem.get('s/X-1'), { book: 1 });

  const bad = { books: {
    book: { units: { u0001: 's/X-9', u0002: { article: 'content/site/civil-practice/gone/article.mdx' } } },
    law: { units: {} },
    nobook: { units: {} },
  } };
  const issues = validateBasis(bad, config, ctx).join('\n');
  for (const re of [/割り当て 2 項目 ≠ 書籍の項目 3/, /s\/X-9 がシリーズの台帳に無い/, /記事が無い/, /law: 書籍/, /nobook: 参考文献の台帳に無い/]) assert.match(issues, re);
});

test('visualState・visualJobs: 図と写真の状態は実体と台帳から出し、未完了だけを作業にする', async () => {
  const { visualState, visualJobs } = await import('../scripts/lib/content-series.mjs');
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const root = mkdtempSync(join(tmpdir(), 'series-visual-'));
  mkdirSync(join(root, 'content/site/civil-practice/x/img'), { recursive: true });
  writeFileSync(join(root, 'content/site/civil-practice/x/img/figure-a.svg'), '<svg/>');
  const ctx = { root, provenance: { 'civil-practice/x/img/photo-b': { kind: 'ai-generated', prompt: 'p' } }, aiLedger: { figures: {} } };
  assert.equal(visualState({ kind: 'figure', subject: 's' }, ctx), 'planned');
  assert.equal(visualState({ kind: 'figure', subject: 's', figKey: 'civil-practice/x/img/figure-a' }, ctx), 'placed');
  assert.equal(visualState({ kind: 'photo', subject: 's', figKey: 'civil-practice/x/img/photo-b' }, ctx), 'spec');
  assert.equal(visualState({ kind: 'photo', subject: 's', figKey: 'civil-practice/x/img/photo-c' }, ctx), 'planned');
  const view = [{ id: 's', sections: [{ items: [{ id: 'X-1', visuals: [
    { kind: 'figure', subject: 'done', figKey: 'civil-practice/x/img/figure-a' },
    { kind: 'photo', subject: 'todo', figKey: 'civil-practice/x/img/photo-b' },
  ] }] }] }];
  const jobs = visualJobs(view, ctx);
  assert.equal(jobs.length, 1);
  assert.match(jobs[0].next, /gen-article-photo -- --fig civil-practice\/x\/img\/photo-b$/);
});

test('実データ: 書籍の全項目の割り当ては違反 0（件数は書籍の網羅の要約と一致）', async () => {
  const { loadBasis, validateBasis } = await import('../scripts/lib/content-series.mjs');
  assert.deepEqual(validateBasis(loadBasis(REPO_ROOT), loadSeriesConfig(REPO_ROOT), seriesContext(REPO_ROOT)), []);
});
