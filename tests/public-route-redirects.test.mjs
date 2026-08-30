import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

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

test('全MDXの旧 /docs URLが正規公開URLへ301接続されている', () => {
  const index = JSON.parse(readFileSync('src/config/doc-meta-index.json', 'utf8'));
  const slugs = Object.keys(index.docs ?? {});
  const redirects = loadManagedRedirects();

  assert.ok(slugs.length >= 1_000, `検査対象が少なすぎる: ${slugs.length}`);
  assert.equal(redirects.size, slugs.length, `redirect=${redirects.size} / docs=${slugs.length}`);
  for (const slug of slugs) {
    const target = redirects.get(slug);
    assert.ok(target, `/docs/${slug} の301が無い`);
    assert.ok(!target.startsWith('/docs/'), `/docs/${slug} の転送先が旧URLのまま: ${target}`);
  }
});
