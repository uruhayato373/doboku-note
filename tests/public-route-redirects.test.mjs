import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectPublishedDocs } from '../scripts/lib/published-docs.mjs';
import { parseLegacyRedirects, parseNoRedirectRoutes } from '../scripts/lib/legacy-routes.mjs';
import { existedBeforeRedirect, LEGACY_REDIRECTED_AT } from '../scripts/lib/legacy-sitemap.mjs';

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
const createdOf = (doc) => (doc.data.created instanceof Date ? doc.data.created.toISOString().slice(0, 10) : doc.data.created);

test('移転前から存在した記事の旧 /docs URL だけが正規公開URLへ301接続されている', () => {
  const docs = collectPublishedDocs().docs;
  const redirects = loadManagedRedirects();

  assert.ok(docs.length >= 1_000, `検査対象が少なすぎる: ${docs.length}`);
  const old = docs.filter((doc) => existedBeforeRedirect(createdOf(doc)));
  assert.ok(old.length >= 1_000, `移転前の記事が少なすぎる: ${old.length}`);
  const published = new Set(docs.map((doc) => doc.slug));
  const orphaned = [...redirects.keys()].filter((slug) => !published.has(slug));
  assert.deepEqual(orphaned, [], `公開 MDX が無い /docs 転送がある（npm run refresh-indexes で再生成）: ${orphaned.join(', ')}`);
  for (const doc of old) {
    const target = redirects.get(doc.slug);
    assert.ok(target, `/docs/${doc.slug} の301が無い`);
    assert.ok(!target.startsWith('/docs/'), `/docs/${doc.slug} の転送先が旧URLのまま: ${target}`);
  }
});

test('移転後（created > 2026-08-22）の記事には /docs の301を作らない（実在したことが無い・上限 2,000 の節約）', () => {
  const docs = collectPublishedDocs().docs;
  const redirects = loadManagedRedirects();
  const after = docs.filter((doc) => !existedBeforeRedirect(createdOf(doc)));
  assert.ok(after.length > 0, '移転後の記事が 1 件も無い（検査不成立）');
  const leaked = after.filter((doc) => redirects.has(doc.slug)).map((doc) => doc.slug);
  assert.deepEqual(leaked, [], `移転後の記事に /docs 転送がある: ${leaked.join(', ')}`);
});

test('移転後の記事は 301 の代わりに「# route」コメントで正規パスが残り、sitemap・URL 検査が slug から引ける', () => {
  const text = readFileSync('public/_redirects', 'utf8');
  const noRedirect = parseNoRedirectRoutes(text);
  const legacy = parseLegacyRedirects(text);
  const after = collectPublishedDocs().docs.filter((doc) => !existedBeforeRedirect(createdOf(doc)));
  assert.ok(after.length > 0, '移転後の記事が 1 件も無い（検査不成立）');
  for (const doc of after) {
    const target = noRedirect.get(doc.slug);
    assert.ok(target, `# route /docs/${doc.slug} が管理ブロックに無い`);
    assert.ok(!target.startsWith('/docs/'), `# route の転送先が旧URL: ${target}`);
    assert.equal(legacy.get(`/docs/${doc.slug}`), target);
  }
});

test('parseNoRedirectRoutes は「# route /docs/<slug> <path>」だけを読む', () => {
  const text = ['# route /docs/a-b /exam/x/guide/a-b', '#route /docs/c /exam/c', '/docs/d /exam/d 301', '# other /docs/e /exam/e', '# route /docs/f'].join('\n');
  assert.deepEqual([...parseNoRedirectRoutes(text)], [['a-b', '/exam/x/guide/a-b']]);
  assert.equal(parseLegacyRedirects(text).get('/docs/d'), '/exam/d');
  assert.equal(parseLegacyRedirects(text).get('/docs/a-b'), '/exam/x/guide/a-b');
});

test('existedBeforeRedirect: 境界日は移転前、翌日からは移転後。created 無しは残す側', () => {
  assert.equal(LEGACY_REDIRECTED_AT, '2026-08-22');
  assert.equal(existedBeforeRedirect('2026-08-22'), true);
  assert.equal(existedBeforeRedirect('2026-08-23'), false);
  assert.equal(existedBeforeRedirect(new Date('2026-08-23T00:00:00Z')), false);
  assert.equal(existedBeforeRedirect('2026-08-23T09:00:00+09:00'), false);
  assert.equal(existedBeforeRedirect(undefined), true);
  assert.equal(existedBeforeRedirect(''), true);
});

test('静的ルールは Cloudflare Pages の上限 2,000 に余裕がある（1,500 以下）', () => {
  const rules = readFileSync('public/_redirects', 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
  const staticRules = rules.filter((line) => !/[*:]/.test(line.split(/\s+/)[0] ?? ''));
  assert.ok(staticRules.length > 500, `検査対象が少なすぎる: ${staticRules.length}`);
  assert.ok(staticRules.length <= 1_500, `静的ルールが多い: ${staticRules.length}/2000`);
});
