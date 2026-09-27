import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectPublishedDocs } from '../scripts/lib/published-docs.mjs';

function loadManagedRedirects() {
  const redirects = new Map();
  let managed = false;
  for (const raw of readFileSync('public/_redirects', 'utf8').split('\n')) {
    const line = raw.trim();
    if (line === '# BEGIN GENERATED PUBLIC ROUTES') {
      managed = true;
      continue;
    }
    if (line === '# END GENERATED PUBLIC ROUTES') break;
    if (!managed || !line || line.startsWith('#')) continue;
    const match = line.match(/^\/docs\/([^/*\s]+)\s+(\/\S+)\s+301$/);
    if (match) redirects.set(match[1], match[2]);
  }
  return redirects;
}

// 公開記事の集合は MDX から直接数える。src/config/doc-meta-index.json は git 管理外の生成物で、
// ローカルの写しが古いと git 上は正しい _redirects に対して偽の赤を出す（2026-09-25）。
test('全MDXの旧 /docs URLが正規公開URLへ301接続されている', () => {
  const slugs = collectPublishedDocs().docs.map((doc) => doc.slug);
  const redirects = loadManagedRedirects();

  assert.ok(slugs.length >= 1_000, `検査対象が少なすぎる: ${slugs.length}`);
  const published = new Set(slugs);
  const orphaned = [...redirects.keys()].filter((slug) => !published.has(slug));
  assert.deepEqual(orphaned, [], `公開 MDX が無い /docs 転送がある（npm run refresh-indexes で再生成）: ${orphaned.join(', ')}`);
  for (const slug of slugs) {
    const target = redirects.get(slug);
    assert.ok(target, `/docs/${slug} の301が無い`);
    assert.ok(!target.startsWith('/docs/'), `/docs/${slug} の転送先が旧URLのまま: ${target}`);
  }
});
