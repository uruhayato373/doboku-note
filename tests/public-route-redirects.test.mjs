import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectPublishedDocs } from '../scripts/lib/published-docs.mjs';
import { parseLegacyRedirects, parseRouteTable } from '../scripts/lib/legacy-routes.mjs';
import { resolveRedirect } from '../scripts/lib/redirect-matcher.mjs';
import { planDocRedirects, resolveByRules, isGeneratedDocRule } from '../scripts/lib/docs-redirect-plan.mjs';

const current = readFileSync('public/_redirects', 'utf8');
// DN-0675 の直前（全 /docs/<slug> を静的 301 で持っていた）の _redirects。
// 動的ルール化しても転送元・行き先・ステータスが 1 本も変わらないことの基準。意図して転送を消す・変えるときだけ更新する。
const baseline = readFileSync('tests/fixtures/redirects-before-dn0675.txt', 'utf8');

const ruleLines = (text) => text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const isDynamic = (line) => /[*:]/.test(line.split(/\s+/)[0] ?? '');

test('DN-0675: 旧ファイルの全転送元が、新ファイルでも同じ行き先・同じステータスになる（差分 0）', () => {
  const sources = ruleLines(baseline).map((l) => l.split(/\s+/)[0]);
  assert.ok(sources.length >= 1_400, `検査対象が少なすぎる: ${sources.length}`);
  const diffs = [];
  for (const from of sources) {
    const before = resolveRedirect(baseline, from);
    const after = resolveRedirect(current, from);
    if (!before || !after || before.to !== after.to || before.code !== after.code) {
      diffs.push(`${from}: ${before?.to}(${before?.code}) -> ${after?.to}(${after?.code})`);
    }
  }
  assert.deepEqual(diffs, []);
});

test('公開中の全 MDX の旧 /docs/<slug> が、正規公開URLへの 301 に解決される', () => {
  const slugs = collectPublishedDocs().docs.map((doc) => doc.slug);
  assert.ok(slugs.length >= 1_000, `検査対象が少なすぎる: ${slugs.length}`);
  for (const slug of slugs) {
    const hit = resolveRedirect(current, `/docs/${slug}`);
    assert.ok(hit, `/docs/${slug} の301が無い`);
    assert.equal(hit.code, 301, `/docs/${slug}`);
    assert.ok(!hit.to.startsWith('/docs/'), `/docs/${slug} の転送先が旧URLのまま: ${hit.to}`);
  }
});

test('# route の表（sitemap・RSS・URL 検査が読む）は動的ルールの解決結果と一致し、表の slug は全て公開中', () => {
  const table = parseRouteTable(current);
  assert.ok(table.size >= 500, `表が小さすぎる: ${table.size}`);
  const published = new Set(collectPublishedDocs().docs.map((doc) => doc.slug));
  for (const [slug, to] of table) {
    assert.ok(published.has(slug), `公開 MDX が無い slug が表にある（npm run refresh-indexes で再生成）: ${slug}`);
    const hit = resolveRedirect(current, `/docs/${slug}`);
    assert.equal(hit?.to, to, `/docs/${slug}: 表と解決結果が違う`);
    assert.equal(hit?.code, 301);
  }
  // 静的 301 でも表でもない公開 slug は無い（パーサが slug → 正規パスを引けない記事が無い）
  const legacy = parseLegacyRedirects(current);
  const missing = [...published].filter((slug) => !legacy.has(`/docs/${slug}`));
  assert.deepEqual(missing, [], `slug → 正規パスを引けない公開記事: ${missing.join(', ')}`);
});

test('Cloudflare Pages の制約: 静的は動的より前・静的 2,000 / 動的 100 に余裕がある', () => {
  const rules = ruleLines(current);
  const firstDynamic = rules.findIndex(isDynamic);
  assert.ok(firstDynamic > 0, '動的ルールが無い（検査不成立）');
  assert.ok(rules.slice(firstDynamic).every(isDynamic), '動的ルールの後ろに静的ルールがある');
  const staticCount = rules.filter((l) => !isDynamic(l)).length;
  const dynamicCount = rules.length - staticCount;
  assert.ok(staticCount > 100, `静的が少なすぎる: ${staticCount}`);
  assert.ok(staticCount <= 1_200, `静的ルールが多い: ${staticCount}/2000`);
  assert.ok(dynamicCount <= 60, `動的ルールが多い: ${dynamicCount}/100`);
  // 同じ接頭辞の動的ルールは 1 本だけ（先に書いたものしか効かない）
  const froms = rules.filter((l) => isGeneratedDocRule(l)).map((l) => l.split(/\s+/)[0]);
  assert.equal(new Set(froms).size, froms.length);
});

test('planDocRedirects: 規則どおりは動的 1 本にまとめ、統合・改名・規則外は静的に残して先に当てる', () => {
  const routes = [
    ...['a', 'b', 'c', 'd', 'e'].map((x) => ({ legacySlug: `cat-textbook-${x}`, path: `/exam/cat/textbook/${x}` })),
    ...['f', 'g', 'h', 'i'].map((x) => ({ legacySlug: `cat-${x}`, path: `/exam/cat/keywords/${x}` })),
    // 統合: 規則どおりに組み立てると別の行き先になる slug
    { legacySlug: 'cat-textbook-merged', path: '/exam/cat/guide/new-name' },
    // group が slug に出ない上、同じ接頭辞の少数派
    { legacySlug: 'cat-j', path: '/exam/cat/guide/j' },
  ];
  const plan = planDocRedirects(routes, { minSavings: 4 });
  assert.deepEqual(plan.dynamicRules.map((r) => r.from + ' ' + r.to), [
    '/docs/cat-textbook-* /exam/cat/textbook/:splat',
    '/docs/cat-* /exam/cat/keywords/:splat',
  ]);
  assert.deepEqual(plan.staticRoutes.map((r) => r.legacySlug).sort(), ['cat-j', 'cat-textbook-merged']);
  // 静的ルールを前、動的ルールを後ろに並べたファイルで、全ての slug が元の行き先に解決される
  const text = [
    ...plan.staticRoutes.map((r) => `/docs/${r.legacySlug} ${r.path} 301`),
    ...plan.dynamicRules.map((r) => `${r.from} ${r.to} 301`),
  ].join('\n');
  for (const r of routes) assert.equal(resolveRedirect(text, `/docs/${r.legacySlug}`)?.to, r.path, r.legacySlug);
});

test('planDocRedirects: 少数（minSavings 未満）の規則は作らず静的のまま。接頭辞が長い規則が先', () => {
  const few = [{ legacySlug: 'x-y', path: '/exam/x/guide/y' }, { legacySlug: 'x-z', path: '/exam/x/guide/z' }];
  const p = planDocRedirects(few, { minSavings: 4 });
  assert.equal(p.dynamicRules.length, 0);
  assert.equal(p.staticRoutes.length, 2);
  const many = [
    ...[1, 2, 3, 4].map((n) => ({ legacySlug: `x-primary-${n}`, path: `/exam/x/primary/${n}` })),
    ...[1, 2, 3, 4].map((n) => ({ legacySlug: `x-w${n}`, path: `/exam/x/keywords/w${n}` })),
  ];
  const q = planDocRedirects(many, { minSavings: 4 });
  assert.deepEqual(q.dynamicRules.map((r) => r.prefix), ['x-primary-', 'x-']);
  assert.equal(resolveByRules(q.dynamicRules, 'x-primary-9'), '/exam/x/primary/9');
  assert.equal(resolveByRules(q.dynamicRules, 'x-w9'), '/exam/x/keywords/w9');
});

test('isGeneratedDocRule: 生成する /docs の動的ルールだけを指す（既存の /docs/river/* などは指さない）', () => {
  assert.equal(isGeneratedDocRule('/docs/civil-practice-* /practice/:splat 301'), true);
  assert.equal(isGeneratedDocRule('/docs/river/* / 301'), false);
  assert.equal(isGeneratedDocRule('/posts/* https://storage.doboku-note.com/posts/:splat 301'), false);
});

test('parseRouteTable は「# route /docs/<slug> <path>」だけを読む', () => {
  const text = ['# route /docs/a-b /exam/x/guide/a-b', '#route /docs/c /exam/c', '/docs/d /exam/d 301', '# other /docs/e /exam/e', '# route /docs/f'].join('\n');
  assert.deepEqual([...parseRouteTable(text)], [['a-b', '/exam/x/guide/a-b']]);
  assert.equal(parseLegacyRedirects(text).get('/docs/d'), '/exam/d');
  assert.equal(parseLegacyRedirects(text).get('/docs/a-b'), '/exam/x/guide/a-b');
});
