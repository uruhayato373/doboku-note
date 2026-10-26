/**
 * 基準類の逐語ページ（/standards/{agency}/{document}/part-NN）は 2026-10-26 に公開をやめた。
 * 旧 URL は public/_redirects が章・節・文書ページへ転送するが、サイトの本文から転送を経由させない。
 * 行き先は scripts/lib/standards-part-targets.mjs（_redirects と同じ答え）で書く。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { listFiles } from '../scripts/lib/fs-walk.mjs';
import { REPO_ROOT, SITE_CONTENT_ROOT } from '../scripts/lib/repository-paths.mjs';
import {
  PART_URL,
  PART_FALLBACK_RULE,
  isGeneratedPartRule,
  loadStandardsLibrary,
  standardPartRedirectRules,
  standardPartTarget,
} from '../scripts/lib/standards-part-targets.mjs';

test('content/site の本文（MDX・章記事）に逐語ページへのリンクが無い', () => {
  const files = listFiles(SITE_CONTENT_ROOT, {
    ext: ['.mdx', '.md'],
    // standards-library は逐語の文字起こしそのもの（エージェントの照合用・公開しない）
    skipDir: (path, name) => name === 'img' || name.startsWith('.') || name === 'standards-library',
  });
  assert.ok(files.length > 1000, `検査した本文が ${files.length} 件しかない（走査先の誤り）`);
  const found = files
    .filter((file) => PART_URL.test(readFileSync(file, 'utf8')))
    .map((file) => relative(REPO_ROOT, file).split('\\').join('/'));
  assert.deepEqual(found, [], `逐語ページへのリンクは章・節・文書ページへ書き換える（standards-part-targets.mjs）:\n${found.join('\n')}`);
});

test('src/ に逐語ページのルートが無い', () => {
  const routes = listFiles(join(REPO_ROOT, 'src', 'app', 'standards'), { ext: '.tsx' })
    .map((file) => relative(REPO_ROOT, file).split('\\').join('/'))
    .filter((path) => path.includes('[part]'));
  assert.deepEqual(routes, []);
});

test('全分冊の旧 URL が _redirects で転送される（章のある文書は分冊ごと、無い文書は動的ルール 1 本）', () => {
  const library = loadStandardsLibrary();
  const { staticRules, dynamicRules } = standardPartRedirectRules(library);
  const redirects = readFileSync(join(REPO_ROOT, 'public', '_redirects'), 'utf8');
  for (const rule of [...staticRules, ...dynamicRules]) assert.ok(redirects.includes(rule), `_redirects に無い: ${rule}`);
  const partCount = library.reduce((sum, document) => sum + (document.chapters.length > 0 ? document.parts.length : 0), 0);
  assert.equal(staticRules.length, partCount);
  assert.deepEqual(dynamicRules, library.some((document) => document.chapters.length === 0) ? [PART_FALLBACK_RULE] : []);
  assert.ok(dynamicRules.every(isGeneratedPartRule));
  // 動的ルールは静的ルールの後ろ（章のある文書の分冊は静的ルールが先に当たる）
  const lines = redirects.split(/\r?\n/).map((line) => line.trim());
  const lastStatic = Math.max(...staticRules.map((rule) => lines.indexOf(rule)));
  assert.ok(dynamicRules.every((rule) => lines.indexOf(rule) > lastStatic), '動的ルールが静的ルールより前にある');
});

test('行き先の型: ページを含む章、節ページに分けた章は節、台帳に無い分冊は null', () => {
  const library = [{
    agencyId: 'a', documentId: 'd', parts: [{ slug: 'part-01', firstPage: 1, lastPage: 50 }],
    chapters: [
      { chapterId: '1-1', firstPage: 5, lastPage: 20, sections: [] },
      { chapterId: '3-2', firstPage: 21, lastPage: 60, splitBySection: true, sections: [{ number: 4, firstPage: 30, lastPage: 40 }] },
    ],
  }];
  assert.equal(standardPartTarget(library, 'a', 'd', 'part-01'), '/standards/a/d');
  assert.equal(standardPartTarget(library, 'a', 'd', 'part-01', 10), '/standards/a/d/chapters/1-1');
  assert.equal(standardPartTarget(library, 'a', 'd', 'part-01', 33), '/standards/a/d/chapters/3-2/sections/4');
  assert.equal(standardPartTarget(library, 'a', 'd', 'part-01', 25), '/standards/a/d/chapters/3-2');
  assert.equal(standardPartTarget(library, 'a', 'd', 'part-09', 10), null);
});
