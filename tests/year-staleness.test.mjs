import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  reiwaYearOf,
  currentFiscalYearFrom,
  buildStalePattern,
  isStaleMatch,
  isYearEncodedSlug,
  isExcludedGroup,
  extractFrontmatterFields,
} from '../scripts/lib/year-staleness.mjs';

test('reiwaYearOf: 令和1年 = 2019年', () => {
  assert.equal(reiwaYearOf(2019), 1);
  assert.equal(reiwaYearOf(2026), 8);
});

test('currentFiscalYearFrom: exams[*].year の最大値を採用', () => {
  assert.equal(currentFiscalYearFrom({ exams: { a: { year: 2026 }, b: { year: 2025 } } }), 2026);
});

test('currentFiscalYearFrom: exams が空なら例外', () => {
  assert.throws(() => currentFiscalYearFrom({ exams: {} }));
});

test('isStaleMatch: 当年度=2026（令和8）で前年度以前だけ true', () => {
  assert.equal(isStaleMatch('令和8年度', 2026), false);
  assert.equal(isStaleMatch('令和7年度', 2026), true);
  assert.equal(isStaleMatch('令和1年度', 2026), true);
  assert.equal(isStaleMatch('2026年度', 2026), false);
  assert.equal(isStaleMatch('2025年度', 2026), true);
  assert.equal(isStaleMatch('2027年度', 2026), false);
});

test('buildStalePattern: 本文中の該当表現だけを拾う（当年度・未来は拾わない）', () => {
  const { pattern } = buildStalePattern(2026);
  const text = '令和8年度の試験は10月、令和7年度は昨年、2025年度の統計、2026年度版';
  const matches = [...text.matchAll(pattern)].map((m) => m[0]);
  assert.deepEqual(matches.filter((t) => isStaleMatch(t, 2026)), ['令和7年度', '2025年度']);
});

test('isYearEncodedSlug: 年度が主題のディレクトリ名を検出', () => {
  assert.equal(isYearEncodedSlug('r05-essay-general-contractor'), true);
  assert.equal(isYearEncodedSlug('primary-r07-a'), true);
  assert.equal(isYearEncodedSlug('h28-a'), true);
  assert.equal(isYearEncodedSlug('civil-construction-2/primary-r06-kouki'.split('/')[1]), true);
  assert.equal(isYearEncodedSlug('guide-exam-overview'), false);
  assert.equal(isYearEncodedSlug('textbook-river-works'), false);
});

test('isExcludedGroup: past-exam/primary/secondary のみ除外', () => {
  assert.equal(isExcludedGroup('past-exam'), true);
  assert.equal(isExcludedGroup('primary'), true);
  assert.equal(isExcludedGroup('secondary'), true);
  assert.equal(isExcludedGroup('guide'), false);
  assert.equal(isExcludedGroup(null), false);
});

test('extractFrontmatterFields: title/seoTitle/description/group を取り出す（引用符除去）', () => {
  const text = `---\ntitle: サンプル記事\nseoTitle: "サンプル記事｜見出し"\ndescription: 令和7年度の解説\ngroup: guide\n---\n\n本文`;
  const fm = extractFrontmatterFields(text);
  assert.equal(fm.title, 'サンプル記事');
  assert.equal(fm.seoTitle, 'サンプル記事｜見出し');
  assert.equal(fm.description, '令和7年度の解説');
  assert.equal(fm.group, 'guide');
});

test('extractFrontmatterFields: フィールドが無ければ null', () => {
  const fm = extractFrontmatterFields('---\ntitle: 見出しだけ\n---\n本文');
  assert.equal(fm.seoTitle, null);
  assert.equal(fm.description, null);
  assert.equal(fm.group, null);
});
