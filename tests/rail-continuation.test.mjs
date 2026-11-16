import process from 'node:process';
import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

// DN-1218 段 3: 基準書の章・節と資格トップの右の欄の「下に続く束」。
function evaluate(source) {
  return JSON.parse(execFileSync(process.execPath, ['--conditions', 'react-server', '--import', 'tsx', '--input-type=module', '-e', source], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }));
}

test('組の数: 基準書は字数×1.4で3,000px未満は0組・約2,000pxごと・上限20。資格トップは記事数16本から1組・40本から2組', () => {
  const values = evaluate(`
    import { articleSidebarGroupCount as count } from './src/lib/article-sidebar-plan.ts';
    import { categoryRailGroupCount as category } from './src/lib/rail-continuation.ts';
    process.stdout.write(JSON.stringify({
      standards: [count(0, 0, 'standards'), count(686, 0, 'standards'), count(2142, 0, 'standards'), count(2143, 0, 'standards'), count(4716, 0, 'standards'), count(36707, 0, 'standards'), count(200000, 0, 'standards')],
      category: [0, 4, 14, 15, 16, 30, 39, 40, 185, 725].map(category),
    }));`);
  assert.deepEqual(values.standards, [0, 0, 0, 1, 3, 20, 20]);
  assert.deepEqual(values.category, [0, 0, 0, 0, 1, 1, 1, 2, 2, 2]);
});

test('基準書 2-1（4,716字）は3組・短い章は0組・長い章はカードの数だけ上詰め（バナーだけの組なし）・2 組目は AdSense。同じ記事を2回出さず、上の束の記事も出さない', () => {
  const rows = evaluate(`
    Date.now = () => Date.parse('2026-11-16T00:00:00+09:00');
    const { getStandardChapter, readStandardChapterMarkdown, getStandardChapterPresentation } = await import('./src/lib/standards-articles.ts');
    const { planInlineSlots } = await import('./src/lib/standards-inline-slots.mjs');
    const { standardsSidebarContinuation } = await import('./src/lib/standards-sidebar-continuation.ts');
    const { getStandardChapterTopics, getStandardRelatedDocs } = await import('./src/lib/standards-discovery.ts');
    const { getPublicDocPath } = await import('./src/lib/content-routes.ts');
    const rows = ['mlit/sekou-kanri-kijun/2-1', 'mlit/sekou-kanri-kijun/1-1', 'kinki/common/1-1', 'chubu/special/2-1'].map(path => {
      const [agency, document, chapter] = path.split('/');
      const resolved = getStandardChapter(agency, document, chapter);
      const markdown = getStandardChapterPresentation(agency, document, resolved.chapter)?.markdown ?? readStandardChapterMarkdown(agency, document, resolved.chapter);
      const chars = planInlineSlots(markdown).chars;
      const groups = standardsSidebarContinuation(resolved.document, resolved.chapter, chars);
      const shown = getStandardRelatedDocs(getStandardChapterTopics(resolved.chapter), 3);
      return {
        path, chars,
        groups: groups.map(g => ({ slot: g.slot, fill: Boolean(g.fill), adsense: Boolean(g.adsense), label: g.card?.label, plain: g.card?.plain, hrefs: g.card?.links.map(l => l.href) ?? [], program: g.banner?.program })),
        upper: [...shown.practice, ...shown.exam].map(doc => getPublicDocPath(doc.slug)),
        self: '/standards/' + path.replace(/\\/([^/]+)$/, '/chapters/$1'),
      };
    });
    process.stdout.write(JSON.stringify(rows));`);
  const byPath = Object.fromEntries(rows.map(row => [row.path, row]));
  const main = byPath['mlit/sekou-kanri-kijun/2-1'];
  assert.equal(main.groups.length, 3);
  assert.deepEqual(main.groups.map(g => g.label), ['rail-standards-practice', 'rail-standards-exam', 'rail-standards-chapters']);
  assert.equal(byPath['mlit/sekou-kanri-kijun/1-1'].groups.length, 0, '短い章は0組');
  assert.equal(byPath['chubu/special/2-1'].groups.length, 0, '特に短い章は0組');
  const long = byPath['kinki/common/1-1'];
  assert.ok(long.groups.length > 3 && long.groups.length <= 20, '長い章は回遊の候補の数まで（上限20）');
  assert.ok(long.groups.every(g => !g.fill), 'バナーだけの組は作らない（上詰めで広告が続く）');
  for (const row of [main, long]) {
    const hrefs = row.groups.flatMap(g => g.hrefs);
    assert.equal(new Set(hrefs).size, hrefs.length, row.path + ' 同じリンクを2回出さない');
    for (const href of row.upper) assert.ok(!hrefs.includes(href), row.path + ' 上の束の記事を出さない ' + href);
    assert.ok(!hrefs.includes(row.self), '自分の章を出さない');
    // 2 件の組を出したら打ち切る（createCardPicker）ので、2 件を許すのはカードの組の最後だけ。後ろにバナーだけの組が続いてもよい
    // （2026-11-16: 記事の更新日でテーマの記事の並びが変わり、長い章の最後のカードの組が 2 件になった）
    const lastCard = row.groups.length - 1;
    row.groups.forEach((g, i) => {
      assert.equal(g.slot, 'standards-rail-fill');
      assert.equal(g.adsense, i === 1, '2 組目だけ AdSense');
      if (i === 1) assert.equal(g.program, undefined, 'AdSense の組に転職バナーは無い');
      else assert.ok(g.program, 'ほかの組に転職バナー');
      if (i === lastCard) { assert.ok(g.hrefs.length === 2 || g.hrefs.length === 3, 'カードの最後の組は 2〜3 件'); }
      else { assert.equal(g.hrefs.length, 3, '1組は3件（カードの最後の組だけ2件）'); }
    });
    const cards = row.groups.filter(g => !g.fill);
    cards.forEach((g, i) => assert.notEqual(g.label, cards[i - 1]?.label, '同じ種類を続けない'));
  }
  assert.ok(main.groups[2].plain, '前後の章は文字の一覧（サムネイルなし）');
  assert.deepEqual([...new Set(main.groups.map(g => g.program).filter(Boolean))].sort(), ['buildjob', 'dainishinsotsu-agent-neo'], '案件は基準書の右欄の転職系だけ（DXを出さない）');
});

test('案件が無ければバナーなしで回遊だけを出し、回遊が尽きれば組なし', () => {
  const result = evaluate(`
    const { getStandardChapter } = await import('./src/lib/standards-articles.ts');
    const { standardsSidebarContinuation } = await import('./src/lib/standards-sidebar-continuation.ts');
    const { chapter, document } = getStandardChapter('mlit', 'sekou-kanri-kijun', '2-1');
    const groups = standardsSidebarContinuation(document, chapter, 4716, {});
    process.stdout.write(JSON.stringify({ n: groups.length, banners: groups.filter(g => g.banner).length, cards: groups.filter(g => g.card).length }));`);
  assert.deepEqual(result, { n: 3, banners: 0, cards: 3 });
});

test('資格トップ: 1級土木は人気→新着の2組・ランキングに出た記事は出さない・記事が少ない資格は0組・バナーは上の束と同じ案件', () => {
  const rows = evaluate(`
    Date.now = () => Date.parse('2026-11-16T00:00:00+09:00');
    const { getAllDocsMeta } = await import('./src/lib/docs.ts');
    const { getPopularDocs } = await import('./src/lib/popular.ts');
    const { resolvePlacements } = await import('./src/lib/affiliate-placement.ts');
    const { categorySidebarContinuation } = await import('./src/lib/category-sidebar-continuation.ts');
    const { getPublicDocPath } = await import('./src/lib/content-routes.ts');
    const all = getAllDocsMeta();
    const rows = ['civil-construction-1', 'concrete-engineer', 'pe-first-stage', 'pavement'].map(slug => {
      const docs = all.filter(d => d.category === slug && d.published !== false && !d.tags?.includes('模範論文') && !d.hideFromCategory);
      const placements = resolvePlacements({ pageKind: 'category', category: slug });
      const popular = getPopularDocs(docs, 5);
      const groups = categorySidebarContinuation(docs, popular, placements['category-sidebar'] ?? null);
      return { slug, docs: docs.length, sidebar: placements['category-sidebar']?.program, shown: popular.map(p => getPublicDocPath(p.doc.slug)),
        groups: groups.map(g => ({ slot: g.slot, adsense: Boolean(g.adsense), label: g.card?.label, hrefs: g.card?.links.map(l => l.href) ?? [], program: g.banner?.program, thumbs: g.card?.links.every(l => l.doc) })) };
    });
    process.stdout.write(JSON.stringify(rows));`);
  const by = Object.fromEntries(rows.map(row => [row.slug, row]));
  assert.deepEqual(by['civil-construction-1'].groups.map(g => g.label), ['rail-popular', 'rail-latest']);
  assert.deepEqual(by['concrete-engineer'].groups.map(g => g.adsense), [false, true], '1 組だけなら後ろに AdSense');
  assert.equal(by['pavement'].groups.length, 0);
  for (const row of rows.filter(r => r.groups.length)) {
    const hrefs = row.groups.flatMap(g => g.hrefs);
    assert.equal(new Set(hrefs).size, hrefs.length);
    for (const href of row.shown) assert.ok(!hrefs.includes(href), row.slug + ' ランキングの記事を出さない');
    assert.equal(row.groups.filter(g => g.adsense).length, 1, 'AdSense は 1 枠');
    for (const g of row.groups.filter(g => !g.adsense)) { assert.equal(g.slot, 'category-rail-fill'); assert.equal(g.program, row.sidebar); assert.ok(g.thumbs, '記事はサムネイルつき'); }
  }
});

test('基準書の右の欄を描画: 上の束の後に下に続く束・各組はバナーの直後が実カード・埋める面にピクセルを付けず・上の束の並びは変えない', () => {
  const script = `
    import { createRequire } from 'node:module';
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { parse } from 'node-html-parser';
    const require = createRequire(import.meta.url);
    require.cache[require.resolve('server-only')] = { exports: {} };
    Date.now = () => Date.parse('2026-11-16T00:00:00+09:00');
    const { default: nav } = await import('./src/components/standards/StandardsNavigation.tsx');
    const { getStandardChapter } = await import('./src/lib/standards-articles.ts');
    const { standardsSidebarContinuation } = await import('./src/lib/standards-sidebar-continuation.ts');
    const { chapter, document } = getStandardChapter('mlit', 'sekou-kanri-kijun', '2-1');
    const railGroups = standardsSidebarContinuation(document, chapter, 4716);
    const render = props => parse(renderToStaticMarkup(React.createElement(nav.default ?? nav, { agencyId: 'mlit', currentDocument: document, currentChapter: chapter, ...props })));
    const withGroups = render({ railGroups });
    const without = render({});
    const order = root => root.childNodes.filter(el => el.tagName).map(el => el.getAttribute('data-standards-affiliate') === 'rail' ? el.querySelector('[data-cta-placement]').getAttribute('data-cta-placement') : el.getAttribute('data-cta-label') ?? el.getAttribute('data-cta') ?? el.getAttribute('aria-label'));
    const groups = withGroups.querySelectorAll('[data-article-sidebar-group]');
    process.stdout.write(JSON.stringify({
      upperWith: order(withGroups.querySelector('[data-standards-sidebar]')), upperWithout: order(without.querySelector('[data-standards-sidebar]')),
      wrapper: withGroups.querySelector('div').childNodes.filter(el => el.tagName).map(el => el.hasAttribute('data-standards-sidebar') ? 'upper' : el.hasAttribute('data-article-sidebar-continuation') ? 'continuation' : 'other'),
      wrapperClass: withGroups.querySelector('div').getAttribute('class'),
      groups: groups.map(g => g.childNodes.filter(el => el.tagName).map(el => el.hasAttribute('data-article-affiliate') ? 'banner:' + el.querySelector('a[data-cta-placement]').getAttribute('data-cta-placement') : el.getAttribute('data-adsense') === 'rail' ? 'adsense' : el.hasAttribute('data-article-sidebar-card') ? 'card' : 'other')),
      pixels: withGroups.querySelector('[data-article-sidebar-continuation]').querySelectorAll('img[width="1"]').length,
      thumbs: withGroups.querySelectorAll('[data-article-sidebar-card] a[data-thumb]').length,
      plainRows: withGroups.querySelectorAll('[data-article-sidebar-card] a').filter(a => a.getAttribute('href').includes('/standards/')).length,
      noGroups: without.querySelectorAll('[data-article-sidebar-continuation]').length,
    }));`;
  const data = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }));
  assert.deepEqual(data.upperWith, data.upperWithout, '上の束は変えない');
  assert.deepEqual(data.upperWith.slice(0, 5), ['standards-rail', 'standards-tree', 'standards-rail-2', 'standards-related', 'standards-rail-3']);
  assert.deepEqual(data.wrapper, ['upper', 'continuation']);
  assert.match(data.wrapperClass, /flex h-full flex-1 flex-col/);
  assert.equal(data.groups.length, 3);
  data.groups.forEach((group, i) => assert.deepEqual(group, [i === 1 ? 'adsense' : 'banner:standards-rail-fill', 'card'], '広告の直後は実カード・2 組目は AdSense'));
  assert.equal(data.pixels, 0, '埋める面にピクセルは付けない');
  assert.equal(data.thumbs, 6, '実務と試験対策の記事 6 件はサムネイルつき');
  assert.equal(data.plainRows, 3, '前後の章は文字の一覧');
  assert.equal(data.noGroups, 0, '組が無ければ今までどおり');
});
