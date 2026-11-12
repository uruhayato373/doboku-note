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
