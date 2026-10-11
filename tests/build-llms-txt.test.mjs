// build-llms-txt（DN-0696・2026-10-11）の回帰ゲート。手書きの llms.txt は URL の 97% が旧 /docs/、資格は 2 つだけ、
// 消えたページ 10 件を指していた。生成は正規公開パスだけを出し、資格名と並びは registry から引く。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectPages, buildIndex, buildFull, hubPathFor } from '../scripts/build-llms-txt.mjs';
import { loadRegistry, qualificationLabel } from '../scripts/lib/qualification-registry.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const registry = loadRegistry(REPO_ROOT);
const categories = [
  { slug: 'civil-construction-1', label: '1級土木施工管理技士', subtitle: '第1次・第2次検定 完全対策', description: '試験対策。', area: 'exam', visible: true },
  { slug: 'pe-comprehensive-management', label: '技術士 総監', subtitle: '5管理', description: 'キーワード。', area: 'exam', visible: true },
  { slug: 'civil-practice', label: '土木施工の実務', subtitle: '現場の手順', description: '実務。', area: 'practice', visible: true },
  { slug: 'reference-materials', label: '参考資料', subtitle: '', area: 'exam', visible: false },
];
const areas = { exam: { label: '資格試験', hubPath: '/exam' }, practice: { label: '土木施工の実務', hubPath: '/practice' }, standards: { label: '公的基準', hubPath: '/standards' } };
const docs = {
  'civil-construction-1-guide-strategy': { title: '1級 試験ガイド', shortTitle: '試験ガイド', description: '合格戦略。', category: 'civil-construction-1', group: 'guide', guide_order: 1, published: true },
  'civil-construction-1-primary-r07': { title: '令和7年度 第1次検定', description: '過去問。', category: 'civil-construction-1', group: 'primary', published: true },
  'pe-comprehensive-management-alarp': { title: 'ALARP', description: 'リスク。', category: 'pe-comprehensive-management', group: 'keyword', published: true },
  'civil-practice-x': { title: '実務記事', description: '手順。', category: 'civil-practice', group: 'guide', published: true },
  'reference-materials-y': { title: '参考', description: '', category: 'reference-materials', group: 'guide', published: true },
  'civil-construction-1-draft': { title: '下書き', description: '', category: 'civil-construction-1', group: 'guide', published: false },
  'civil-construction-1-no-path': { title: '正規パス無し', description: '', category: 'civil-construction-1', group: 'guide', published: true },
};
const pathFor = (slug) => ({
  'civil-construction-1-guide-strategy': '/exam/civil-construction-1/guide/strategy',
  'civil-construction-1-primary-r07': '/exam/civil-construction-1/primary/r07',
  'pe-comprehensive-management-alarp': '/exam/pe-comprehensive-management/keywords/alarp',
  'civil-practice-x': '/practice/x',
  'reference-materials-y': '/exam/reference-materials/y',
}[slug] ?? null);

test('公開済みで正規パスのある記事だけを数え、非公開・パス無しは除く', () => {
  const pages = collectPages({ docs, registry, categories, pathFor });
  assert.equal(pages.total, 5);
  assert.equal(pages.skipped, 1);
  assert.ok(pages.order.includes('civil-construction-1') && pages.order.includes('pe-comprehensive-management'));
  assert.deepEqual(pages.otherCats, ['civil-practice'], '非表示カテゴリ（reference-materials）はハブに出さない');
});

test('llms.txt は registry の資格名でハブと主要ページを並べ、旧 /docs/ URL を含まない', () => {
  const pages = collectPages({ docs, registry, categories, pathFor });
  const out = buildIndex({ pages, registry, categories, areas, origin: 'https://example.test' });
  assert.match(out, new RegExp(`\\[${qualificationLabel(registry, 'civil-construction-1')}\\]\\(https://example.test/exam/civil-construction-1\\)`));
  assert.match(out, /## .* — 主要ページ\n\n- \[試験ガイド\]\(https:\/\/example.test\/exam\/civil-construction-1\/guide\/strategy\)/);
  assert.match(out, /\[土木施工の実務\]\(https:\/\/example.test\/practice\)/);
  assert.match(out, /\[公的基準\]\(https:\/\/example.test\/standards\)/);
  assert.match(out, /全 5 ページ/);
  assert.doesNotMatch(out, /\/docs\//);
  assert.doesNotMatch(out, /reference-materials/);
});

test('llms-full.txt は資格ごとの節に全記事を 1 行 1 ページで並べる', () => {
  const pages = collectPages({ docs, registry, categories, pathFor });
  const out = buildFull({ pages, registry, categories, origin: 'https://example.test' });
  assert.match(out, new RegExp(`## ${qualificationLabel(registry, 'civil-construction-1')}（2 ページ）`));
  assert.match(out, /- \[令和7年度 第1次検定\]\(https:\/\/example.test\/exam\/civil-construction-1\/primary\/r07\) — 過去問。/);
  assert.match(out, /## 土木施工の実務（1 ページ）/);
  assert.doesNotMatch(out, /下書き|正規パス無し|\/docs\//);
});

test('ハブ URL: exam は /exam/<slug>、他の領域はその領域のハブ', () => {
  assert.equal(hubPathFor('civil-construction-1', categories, areas), '/exam/civil-construction-1');
  assert.equal(hubPathFor('civil-practice', categories, areas), '/practice');
});
