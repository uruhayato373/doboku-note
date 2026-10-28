import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
import { listSiteMdx } from '../scripts/lib/mdx-files.mjs';

/**
 * ExamPoint の summary="…" は JSX の属性文字列で、`\\` がエスケープにならずそのまま 2 文字で渡る。
 * items={[ "…" ]}（JS の文字列）と同じつもりで `$\\sqrt{…}$` と書くと KaTeX が改行＋文字列として描画する
 * （2026-10-28・技術士一次の 5 記事 17 か所。画面には `$\\sqrt{…}$` がそのまま出ていた）。
 */
test('ExamPoint の summary に二重のバックスラッシュを書かない（属性文字列は \\ 1 つ）', () => {
  const offenders = [];
  for (const file of listSiteMdx()) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/^\s*summary="([^"\n]*)"/gm)) {
      // `\\sqrt` のようなコマンドの前の二重だけを見る（行列の改行 `1&1\\v&u` は正しい）
      if (/\\\\[a-zA-Z]{2,}/.test(m[1])) offenders.push(`${relative(REPO_ROOT, file)}: ${m[1].slice(0, 60)}`);
    }
  }
  assert.deepEqual(offenders, []);
});
