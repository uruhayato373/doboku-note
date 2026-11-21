// 部品の層の向き（2026-11-22 アトミックデザインの点検）。下の層は上の層・機能別のディレクトリを import しない。
//   src/lib は src/components を import しない（型も含む。型は lib に置き、部品が lib から引く）。
//   汎用部品 src/components/ui は機能別のディレクトリ（docs・laws・category・standards・home・search・topics）を import しない。
//   記事ページ専用の部品は src/components/docs に置く。機能別のディレクトリから ui を import するのは正しい向き。
// 以前は lib が components の型と関数を、ui が docs・laws の部品を import していた（#1701〜の点検で直した）。
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { test } from 'node:test';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { listFiles } from '../scripts/lib/fs-walk.mjs';

const CODE = /\.(ts|tsx|mjs|js)$/;
const sources = (dir) => listFiles(`${REPO_ROOT}/${dir}`)
  .filter((f) => CODE.test(f))
  .map((f) => ({ rel: relative(REPO_ROOT, f).split('\\').join('/'), src: readFileSync(f, 'utf8') }));
/** import・export … from・動的 import の行き先（コメントの中の言及は数えない） */
const specifiers = (src) => {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  return [...code.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]/g)].map((m) => m[1]);
};
const lineOf = (src, spec) => src.split('\n').findIndex((l) => l.includes(`'${spec}'`) || l.includes(`"${spec}"`)) + 1;

const FEATURE_DIRS = ['docs', 'laws', 'category', 'standards', 'home', 'search', 'topics'];
/** src/lib に置いてあるが、役目として部品を import するもの（理由つき） */
const LIB_ALLOW = new Map([
  ['src/lib/component-loader/index.ts', 'MDX のタグ名と部品の登録表（next-mdx-remote に渡す）。部品を import するのが役目'],
]);

test('src/lib は src/components を import しない', () => {
  const files = sources('src/lib');
  for (const rel of LIB_ALLOW.keys()) assert.ok(files.some((f) => f.rel === rel), `許可リストの ${rel} が無い（消したら許可リストからも外す）`);
  const hits = files.filter((f) => !LIB_ALLOW.has(f.rel)).flatMap((f) => specifiers(f.src)
    .filter((s) => s.startsWith('@/components') || /^(\.\.\/)+components\//.test(s))
    .map((s) => `${f.rel}:${lineOf(f.src, s)} → ${s}`));
  console.log(`[layer-direction] src/lib: 検査 ${files.length} ファイル・逆向きの import ${hits.length}`);
  assert.ok(files.length > 50, `検査不成立: src/lib のファイルが ${files.length} 件しか見つからない`);
  assert.deepEqual(hits, [], hits.join('\n'));
});

test('汎用部品 src/components/ui は機能別のディレクトリを import しない', () => {
  const files = sources('src/components/ui');
  const feature = new RegExp(`^(?:@/components/|(?:\\.\\./)+)(${FEATURE_DIRS.join('|')})/`);
  const hits = files.flatMap((f) => specifiers(f.src)
    .filter((s) => feature.test(s))
    .map((s) => `${f.rel}:${lineOf(f.src, s)} → ${s}`));
  console.log(`[layer-direction] src/components/ui: 検査 ${files.length} ファイル・機能別への import ${hits.length}`);
  assert.ok(files.length > 50, `検査不成立: src/components/ui のファイルが ${files.length} 件しか見つからない`);
  assert.deepEqual(hits, [], hits.join('\n'));
});

test('検出の自己検査: 逆向きの import を拾い、コメントの中の言及は拾わない', () => {
  const src = [
    "import type { X } from '@/components/ui/X/X';",
    "export { y } from '../components/home/y';",
    "const z = await import('@/components/docs/DocPage');",
    '// import { w } from "@/components/laws/W";',
    "/* from '@/components/category/C' */",
    "import { ok } from '@/lib/ok';",
  ].join('\n');
  assert.deepEqual(specifiers(src), ['@/components/ui/X/X', '../components/home/y', '@/components/docs/DocPage', '@/lib/ok']);
});
