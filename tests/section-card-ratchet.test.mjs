// 枠つきの区画は MetaCard の 1 部品（2026-11-17 に SectionCard を取り込み、見出しを title・lead の引数にした）。
//   - card-surface-section を className に直接書くのは、部品と理由つきの許可リストだけ
//   - MetaCard の直下に見出しの h2 を手で書かない（title・lead で渡す）
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { test } from 'node:test';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { listFiles } from '../scripts/lib/fs-walk.mjs';

const ALLOW = new Map([
  ['src/components/ui/MetaCard/MetaCard.tsx', '区画の部品'],
  ['src/components/ui/ArticleThumbRow/ArticleThumbRow.tsx', 'framed の行（1 件ずつ枠で囲むリンク）'],
  ['src/components/tools/ToolParts.tsx', 'ツールの入力・結果の枠（ToolPanel）'],
  ['src/components/search/SearchResults.tsx', '検索結果に挟む広告の枠（結果のカードと同じ枠にそろえる）'],
  ['src/components/category/CategoryViews.tsx', '見出しの id と aria-labelledby で結ぶ技術士一次の入口（見出しの大きさも別）'],
]);

const files = () => listFiles(`${REPO_ROOT}/src`, { ext: '.tsx' }).map((f) => ({ rel: relative(REPO_ROOT, f).split('\\').join('/'), src: readFileSync(f, 'utf8') }));

test('card-surface-section を部品の外に手書きしない（ツールの中は ToolPanel を使う）', () => {
  const all = files();
  const hits = all.filter((f) => !ALLOW.has(f.rel) && !f.rel.startsWith('src/app/tools/') && /card-surface-section/.test(f.src)).map((f) => f.rel);
  console.log(`[section-card] 検査 ${all.length} ファイル・手書きの外枠 ${hits.length}`);
  assert.ok(all.length > 100);
  assert.deepEqual(hits, [], `MetaCard を使う:\n${hits.join('\n')}`);
});

test('MetaCard の直下に見出しを手書きしない（title・lead で渡す）', () => {
  const all = files();
  const hits = all.flatMap((f) => [...f.src.matchAll(/<MetaCard\b[^>]*>\s*<h2\b/g)].map((m) => `${f.rel}:${f.src.slice(0, m.index).split('\n').length}`));
  console.log(`[section-card] MetaCard の直下の手書きの見出し ${hits.length}`);
  assert.deepEqual(hits, [], hits.join('\n'));
});

test('SectionCard は廃止した（MetaCard に一本化）', () => {
  const hits = files().filter((f) => /import SectionCard|from ['"]@\/components\/ui\/SectionCard/.test(f.src)).map((f) => f.rel);
  assert.deepEqual(hits, []);
});
