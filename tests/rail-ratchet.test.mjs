// 右の欄（PC ≥993px）は RailStack の 1 部品が描き、並べるものは台帳 src/lib/rail-kinds.mjs の種類だけ（2026-11-17 に 4 か所の手書きの入れ物をまとめた）。
//   - 右の欄の入れ物（data-standards-sidebar・data-article-sidebar-cards の付いた div）を手書きしない
//   - カードの題名は MetaCard の title（nav-card-title の手書きを戻さない）
//   - 右の欄に入るカードの部品に、手書きの区切り線の行・手書きの外枠を戻さない（LinkRow・MetaCard を使う）
//   - data-rail-kind に書く種類は台帳にあるものだけ
// ビルド後の HTML（右の欄の 1 つ 1 つが台帳の種類か）は scripts/check-cta-density.mjs の rail-kind-unknown が見る。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { test } from 'node:test';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { listFiles } from '../scripts/lib/fs-walk.mjs';
import { RAIL_KINDS } from '../src/lib/rail-kinds.mjs';

const files = () => listFiles(`${REPO_ROOT}/src`, { ext: '.tsx' }).map((f) => ({ rel: relative(REPO_ROOT, f).split('\\').join('/'), src: readFileSync(f, 'utf8') }));
const lineOf = (src, index) => src.slice(0, index).split('\n').length;

// 右の欄に入るカードの部品（mobile の描画も同じファイルにある）
const RAIL_PARTS = [
  'src/components/ui/CategoryNavCard/CategoryNavCard.tsx',
  'src/components/ui/PillarNavCard/PillarNavCard.tsx',
  'src/components/ui/ExamQuestionNav/ExamQuestionNav.tsx',
  'src/components/category/PopularSections.tsx',
  'src/components/category/CategoryStudyNav.tsx',
  'src/components/category/ConcreteEngineerResources.tsx',
  'src/components/ui/RelatedTools.tsx',
  'src/components/ui/SidebarDiscovery.tsx',
  'src/components/ui/RelatedArticles/RailArticleList.tsx',
  'src/components/standards/StandardsNavigation.tsx',
  'src/components/standards/StandardsSidebarDiscovery.tsx',
  'src/components/standards/StandardsExplore.tsx',
];
const HAND_ROW = /className="[^"]*border-b border-\(--rule-soft\) last:border-b-0/g;
const HAND_LINK_ROW = /<Link\b[^>]*className="[^"]*\bmin-h-11/g;
const HAND_FRAME = /className="[^"]*\bborder border-\(--rule-soft\)[^"]*bg-\(--paper\)/g;

test('右の欄の入れ物は RailStack だけ（上の束の div を手書きしない）', () => {
  const all = files();
  const hits = all.filter((f) => f.rel !== 'src/components/ui/RailStack/RailStack.tsx').flatMap((f) =>
    [...f.src.matchAll(/<div\b[^>]*\b(?:data-standards-sidebar|data-article-sidebar-cards|data-rail-stack)\b/g)].map((m) => `${f.rel}:${lineOf(f.src, m.index)}`));
  console.log(`[rail] 検査 ${all.length} ファイル・手書きの入れ物 ${hits.length}`);
  assert.ok(all.length > 100);
  assert.deepEqual(hits, [], `RailStack（upperData・data）を使う:\n${hits.join('\n')}`);
});

test('カードの題名を nav-card-title で手書きしない（MetaCard の title）', () => {
  const hits = files().filter((f) => /nav-card-title/.test(f.src)).map((f) => f.rel);
  assert.deepEqual(hits, []);
});

test('右の欄のカードの部品に手書きの行・外枠を戻さない（LinkRow・MetaCard）', () => {
  let checked = 0;
  const hits = RAIL_PARTS.flatMap((rel) => {
    const src = readFileSync(`${REPO_ROOT}/${rel}`, 'utf8');
    checked += 1;
    return [...src.matchAll(HAND_ROW), ...src.matchAll(HAND_LINK_ROW), ...src.matchAll(HAND_FRAME)].map((m) => `${rel}:${lineOf(src, m.index)}`);
  });
  console.log(`[rail] 部品 ${checked} ファイル・手書きの行と外枠 ${hits.length}`);
  assert.equal(checked, RAIL_PARTS.length);
  assert.deepEqual(hits, [], hits.join('\n'));
});

test('data-rail-kind と kind に書く種類は台帳にあるものだけ・固有の形の種類は理由つき', () => {
  // kind: '…' は右の欄の items を組むファイル（RailStack・RailItem を import する）だけを見る
  const railFile = (f) => /RailStack|RailItem/.test(f.src);
  const used = files().flatMap((f) => [...f.src.matchAll(railFile(f) ? /data-rail-kind="([^"]+)"|\bkind: '([a-z]+)'/g : /data-rail-kind="([^"]+)"/g)].map((m) => ({ kind: m[1] ?? m[2], at: `${f.rel}:${lineOf(f.src, m.index)}` })));
  console.log(`[rail] 書かれた種類 ${used.length} 件・台帳 ${Object.keys(RAIL_KINDS).length} 種類`);
  assert.ok(used.length > 0);
  assert.deepEqual(used.filter((u) => !Object.hasOwn(RAIL_KINDS, u.kind)).map((u) => u.at), []);
  for (const [kind, entry] of Object.entries(RAIL_KINDS)) assert.ok(entry.reason.length > 4, `${kind} に理由が無い`);
});
