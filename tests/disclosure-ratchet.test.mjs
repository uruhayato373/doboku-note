/**
 * サイトの開閉（<details>）は src/components/ui/Disclosure/Disclosure.tsx だけが書く（DN-0856）。
 * 以前は 12 か所が矢印（DisclosureChevron・lucide・文字の ⌄・無し）、マーカーの消し方、フォーカスと 44px の有無を
 * それぞれに書いていた。新しい開閉は Disclosure を使う。MDX 記事内の素の <details>（content/site）は対象外。
 *
 * 例外は件数つきで ALLOWED に書く。減らしたら件数も下げる。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { listFiles } from '../scripts/lib/fs-walk.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const ALLOWED = {
  'src/components/ui/Disclosure/Disclosure.tsx': 1,
};

/** コメントを除いた JSX の <details> の数（コメント中の「<details> の目次リスト」等は数えない） */
export function countDetails(source) {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  return (code.match(/<details[\s>]/g) ?? []).length;
}

test('src/ の <details> は Disclosure（と件数つきの例外）だけ', () => {
  const files = listFiles(join(REPO_ROOT, 'src'), { ext: '.tsx' });
  assert.ok(files.length > 100, `検査した .tsx が ${files.length} 件しかない（走査先の誤り）`);
  const over = [];
  for (const file of files) {
    const path = relative(REPO_ROOT, file).split('\\').join('/');
    const count = countDetails(readFileSync(file, 'utf8'));
    if (count > (ALLOWED[path] ?? 0)) over.push(`${path}: ${count} 件（許容 ${ALLOWED[path] ?? 0}）`);
  }
  assert.deepEqual(over, [], `素の <details> は src/components/ui/Disclosure/Disclosure.tsx を使う:\n${over.join('\n')}`);
});

test('検出の型: JSX の <details> を数え、コメントは数えない', () => {
  assert.equal(countDetails('<details className="group">\n<summary>a</summary></details>'), 1);
  assert.equal(countDetails('return <details key={k} open>'), 1);
  assert.equal(countDetails('// 超過分は <details> の目次リストに畳む'), 0);
  assert.equal(countDetails('/** collapsible: 章を <details> 開閉カードにする */'), 0);
  assert.equal(countDetails('<Disclosure summary="x">'), 0);
});
