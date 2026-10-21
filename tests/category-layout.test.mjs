// カテゴリの表示の決まりは categories.json だけが持つ（DN-0793）。架空のカテゴリを 1 行足した fixture で、
// 記事型の並び・見出し・ビュー・ジャンプ・並べ替えの規則・OGP の色キー・/exam の対象・並び順がそのカテゴリを返すことを確かめる。
// 以前は CategoryPage・doc-classifier・category-groups・CategoryJumpNav・ogp-create・/exam のページに資格ごとの分岐があり、
// RCCM の立ち上げで仕組み側 52 ファイル・88 か所を手で直していた。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toDataUrl } from './lib/load-ts.mjs';
import { categoryExamKeys } from '../.claude/skills/conversion/ogp-create/scripts/lib/category-exam-key.mjs';
import { ogpCoverageErrors } from '../scripts/check-home-exam-coverage.mjs';

const REAL = JSON.parse(readFileSync('src/config/categories.json', 'utf8'));
const TOKENS = JSON.parse(readFileSync('.claude/knowledge/design-system/note-cover-tokens.json', 'utf8'));
const FAKE = {
  slug: 'fake-qualification', label: '架空の資格', subtitle: 's', variant: 'civil', area: 'exam', groups: ['guide', 'primary'], order: 34,
  layout: {
    view: 'concrete', sort: 'concrete', ogpExamKey: 'common',
    groupLabels: { guide: '受験ガイド', primary: '過去問' },
    groupDescriptions: { guide: '試験の概要' },
    jumps: [{ href: '#sec-guide', label: '受験ガイド', goal: '試験を知る' }],
  },
};
const FIXTURE = [...REAL, FAKE];

async function loadWithFixture(rel) {
  const cache = new Map([['src/config/categories.json', 'data:text/javascript,' + encodeURIComponent(`export default ${JSON.stringify(FIXTURE)};`)]]);
  return import(toDataUrl(rel, cache));
}

test('架空のカテゴリを 1 行足すだけで、記事型の並び・見出し・既定の記事型が返る', async () => {
  const c = await loadWithFixture('src/lib/doc-classifier.ts');
  assert.deepEqual(c.getGroupOrder('fake-qualification'), ['guide', 'primary']);
  assert.equal(c.getGroupLabel('fake-qualification', 'primary'), '過去問');
  assert.equal(c.classifyDoc({ category: 'fake-qualification', tags: [] }), 'guide');
  assert.equal(c.classifyDoc({ category: 'fake-qualification', group: 'primary', tags: [] }), 'primary');
});

test('ビュー・並べ替え・ジャンプ・/exam の対象・並び順もそのカテゴリを返す', async () => {
  const cats = await loadWithFixture('src/lib/categories.ts');
  const def = cats.getCategoryBySlug('fake-qualification');
  assert.equal(def.layout.view, 'concrete');
  assert.equal(def.layout.sort, 'concrete');
  assert.deepEqual(def.layout.jumps.map((j) => j.href), ['#sec-guide']);
  assert.ok(cats.getExamCategories().some((c) => c.slug === 'fake-qualification'), '/exam の静的パスに出る');
  const order = cats.getAllCategories().map((c) => c.slug);
  assert.ok(order.indexOf('fake-qualification') > order.indexOf('surveyor') && order.indexOf('fake-qualification') < order.indexOf('civil-practice'), '並び順（order 34）の位置に出る');
});

test('OGP の色キーも categories.json から引き、網羅の検査が通る', () => {
  const keys = categoryExamKeys(FIXTURE);
  assert.equal(keys['fake-qualification'], 'common');
  assert.deepEqual(ogpCoverageErrors(FIXTURE, keys, TOKENS).errors, []);
  const { layout: { ogpExamKey: _drop, ...rest }, ...row } = FAKE;
  assert.equal(ogpCoverageErrors([...REAL, { ...row, layout: rest }], categoryExamKeys([...REAL, { ...row, layout: rest }]), TOKENS).errors.length, 1, '色キーを書き忘れると赤');
});

test('今の categories.json: グループ表示のカテゴリは全部 view を持ち、view と sort は語彙の中', () => {
  const VIEWS = new Set(['civil-1', 'civil-2', 'pe-first-stage', 'pe-comprehensive', 'pe-construction', 'concrete', 'practice']);
  const SORTS = new Set(['civil', 'concrete', 'pe-first-stage', 'pe-comprehensive']);
  for (const c of REAL) {
    if (c.layout?.view) assert.ok(VIEWS.has(c.layout.view), `${c.slug}: view ${c.layout.view}`);
    if (c.layout?.sort) assert.ok(SORTS.has(c.layout.sort), `${c.slug}: sort ${c.layout.sort}`);
    // 法令の領域（laws）は /laws の専用の一覧（src/app/laws/page.tsx）で、CategoryPage を使わない
    if (c.visible !== false && c.area !== 'laws') assert.ok(c.layout?.view, `${c.slug}: 表示中のカテゴリに view が無い（フラット表示になる）`);
  }
});
