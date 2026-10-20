// サイト記事の置き場は `content/site/<資格>/<slug>/article.mdx` の 1 形式だけ（DN-0788）。
// 旧 Convention A（`<資格>/<slug>.mdx` の個別ファイル名）は 2026-08 には既に 0 本だったが、CLAUDE.md・規約・
// pdf-to-mdx のテンプレートが「共存する」と書き続けていたので、文書を直したうえでここで形を固定する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relative, sep } from 'node:path';
import { listSiteMdx } from '../scripts/lib/mdx-files.mjs';
import { SITE_CONTENT_ROOT } from '../scripts/lib/repository-paths.mjs';

test('content/site の .mdx はすべて <資格>/<slug>/article.mdx', () => {
  const files = listSiteMdx();
  assert.ok(files.length > 1000, `検査対象が ${files.length} 件しかない（列挙の失敗を 0 件の合格にしない）`);
  const bad = files
    .map((f) => relative(SITE_CONTENT_ROOT, f).split(sep).join('/'))
    .filter((rel) => !/^[^/]+\/[^/]+\/article\.mdx$/.test(rel));
  assert.deepEqual(bad, [], `article.mdx 以外の置き方: ${bad.slice(0, 10).join(', ')}`);
});
