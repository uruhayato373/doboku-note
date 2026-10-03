import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import matter from 'gray-matter';
import { classifyNote, loadThemes } from '../scripts/lib/content-theme.mjs';
import { buildNoteCoverCategories, classifyNoteCover, loadNoteCoverCategories, noteCoverCategoryLabel } from '../scripts/lib/note-cover-category.mjs';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const ctx = buildNoteCoverCategories({
  categories: [
    { id: 'index', label: 'もくじ' }, { id: 'guide', label: '無料ガイド' },
    { id: 'product', label: '有料教材' }, { id: 'career', label: '転職' }, { id: 'brand', label: '案内' },
  ],
  rules: { note: [{ category: 'index', noteSeries: '総合案内' }] },
  defaults: { themeIds: { career: 'career', common: 'brand' }, qualification: { free: 'guide', paid: 'product' } },
});

test('もくじは資格テーマや価格より優先する', () => {
  assert.equal(classifyNoteCover(ctx, '技術士総監/総監もくじ/article.md', { noteSeries: '総合案内', notePricing: 'free' }, 'pe-comprehensive-management', 'qualification'), 'index');
});

test('資格記事は無料ガイドと有料教材に分かれる', () => {
  assert.equal(classifyNoteCover(ctx, '資格/free/article.md', { notePricing: 'free' }, 'exam', 'qualification'), 'guide');
  assert.equal(classifyNoteCover(ctx, '資格/paid/article.md', { notePricing: 'paid' }, 'exam', 'qualification'), 'product');
  assert.equal(classifyNoteCover(ctx, '資格/member/article.md', { notePricing: 'membership' }, 'exam', 'family'), 'product');
});

test('転職と共通案内はテーマから分類する', () => {
  assert.equal(classifyNoteCover(ctx, '資格/career/article.md', {}, 'career', 'topic'), 'career');
  assert.equal(classifyNoteCover(ctx, '共通/著者紹介/article.md', {}, 'common', 'topic'), 'brand');
});

test('frontmatter の coverCategory は規則より優先し、未知の値は未分類にする', () => {
  assert.equal(classifyNoteCover(ctx, '資格/index/article.md', { coverCategory: 'brand', noteSeries: '総合案内' }, 'exam', 'qualification'), 'brand');
  assert.equal(classifyNoteCover(ctx, '資格/index/article.md', { coverCategory: 'typo' }, 'exam', 'qualification'), null);
  assert.equal(noteCoverCategoryLabel(ctx, null), '未分類');
});

test('未知の分類を指すルールは読み込みで止める', () => {
  assert.throws(() => buildNoteCoverCategories({ categories: [], rules: { note: [{ category: 'typo', pathPrefix: 'x/' }] } }), /未知の分類 typo/);
});

test('実際の note 記事はすべてカバー分類を持つ', () => {
  const covers = loadNoteCoverCategories(ROOT);
  const themes = loadThemes(ROOT);
  const noteRoot = join(ROOT, 'content', 'note');
  const unclassified = [];
  let checked = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) { if (entry.name !== 'img') walk(join(dir, entry.name)); continue; }
      if (!/^article(-[^/\\]+)?\.md$/.test(entry.name)) continue;
      const abs = join(dir, entry.name);
      const rel = relative(noteRoot, abs);
      const fm = matter(readFileSync(abs, 'utf8')).data;
      const themeId = classifyNote(themes, rel, fm);
      const themeKind = themeId ? themes.themes.get(themeId)?.kind ?? null : null;
      checked += 1;
      if (!classifyNoteCover(covers, rel, fm, themeId, themeKind)) unclassified.push(rel);
    }
  };
  walk(noteRoot);
  assert.ok(checked > 500, `検査対象が少なすぎる（${checked} 本）`);
  assert.deepEqual(unclassified, []);
});
