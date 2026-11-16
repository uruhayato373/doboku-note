import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';
import { loadTsModule } from './lib/load-ts.mjs';

// 記事末の「前の記事・次に読む」の並びは資格ページと同じ category-curriculum.json（記載順）。
const { resolveSeriesNav } = await loadTsModule('src/lib/next-in-series.ts');
const curriculum = JSON.parse(readFileSync(join(ROOT, 'src/config/category-curriculum.json'), 'utf8'));
const practice = curriculum['civil-practice'].fields.blocks;
const all = practice.flatMap((b) => b.slugs.map((s) => `civil-practice-${s}`));
const titles = (slugs) => new Map(slugs.map((s) => [s, `題:${s}`]));

test('分野別の並びの次と前を返す', () => {
  const nav = resolveSeriesNav('civil-practice', all[1], titles(all));
  assert.equal(nav.prev.slug, all[0]);
  assert.equal(nav.next.slug, all[2]);
  assert.equal(nav.heading, practice[0].label);
});

test('block の最後の次は次の block の先頭', () => {
  const last = `civil-practice-${practice[0].slugs.at(-1)}`;
  const nav = resolveSeriesNav('civil-practice', last, titles(all));
  assert.equal(nav.next.slug, `civil-practice-${practice[1].slugs[0]}`);
});

test('非公開（available に無い）記事は飛ばす', () => {
  const avail = titles(all.filter((s) => s !== all[2]));
  assert.equal(resolveSeriesNav('civil-practice', all[1], avail).next.slug, all[3]);
});

test('並びに無い記事・並びの無い資格は null', () => {
  assert.equal(resolveSeriesNav('civil-practice', 'civil-practice-not-exist', titles(all)), null);
  assert.equal(resolveSeriesNav('no-such-category', all[0], titles(all)), null);
  assert.equal(resolveSeriesNav(undefined, all[0], titles(all)), null);
});

// DN-1219: 並びの設定に無い記事の前後（2026-11-15 の点検で 815 本に前後の行き先が無かった）
const { resolveGroupSeriesNav } = await loadTsModule('src/lib/next-in-series.ts');

test('1級の章の入口の要点ガイドは、章の順に 1 本の列でつなぐ', () => {
  const intro = curriculum['civil-construction-1'].textbookChapters.flatMap((c) => (c.introGuides ?? []).map((s) => `civil-construction-1-${s}`));
  const nav = resolveSeriesNav('civil-construction-1', intro[1], titles(intro));
  assert.equal(nav.prev.slug, intro[0]);
  assert.equal(nav.next.slug, intro[2]);
  assert.equal(nav.heading, '土工の要点');
});

test('並びの設定に無い記事は、資格ページと同じ記事型の並びで前後を返す（キャリア記事は列に入れない）', () => {
  const doc = (slug, extra = {}) => ({ slug, title: `題:${slug}`, category: 'concrete-engineer', group: 'primary', published: true, tags: [], ...extra });
  const docs = [doc('concrete-engineer-primary-b'), doc('concrete-engineer-primary-a'), doc('concrete-engineer-primary-c'), doc('concrete-engineer-guide-x', { group: 'guide', tags: ['career'] })];
  const nav = resolveGroupSeriesNav('concrete-engineer', 'concrete-engineer-primary-b', docs);
  assert.ok(nav.prev || nav.next);
  for (const item of [nav.prev, nav.next].filter(Boolean)) assert.match(item.slug, /-primary-/);
  assert.equal(resolveGroupSeriesNav('concrete-engineer', 'concrete-engineer-guide-x', docs), null, 'キャリア記事には出さない');
});

test('ownGroup を渡すと、その列で前後を決める（法令のテーマごとの列）', () => {
  const docs = ['laws-a', 'laws-b', 'laws-c'].map((slug) => ({ slug, title: slug, category: 'laws', group: 'guide', tags: [] }));
  const nav = resolveGroupSeriesNav('laws', 'laws-b', docs, { ownGroup: () => ({ heading: '道路', docs: [docs[2], docs[1]] }) });
  assert.equal(nav.heading, '道路');
  assert.equal(nav.prev.slug, 'laws-c');
  assert.equal(nav.next, null);
});
