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
        lower: groups.filter(g => g.lower).length,
        groups: groups.filter(g => !g.lower).map(g => ({ slot: g.slot, adsense: Boolean(g.adsense), label: g.card?.label, plain: g.card?.plain, hrefs: g.card?.links.map(l => l.href) ?? [], banner: 'banner' in g })),
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
  assert.ok(long.groups.every(g => g.hrefs.length), 'カードの無い組は作らない（上詰めで広告が続く）');
  assert.equal(long.lower, 40, '空きの AdSense の候補は 40 枠');
  assert.equal(byPath['mlit/sekou-kanri-kijun/1-1'].lower, 40, '組が無くても空きの AdSense の候補は 40 枠（出すかは描画した高さで決める）');
  for (const row of [main, long]) {
    const hrefs = row.groups.flatMap(g => g.hrefs);
    assert.equal(new Set(hrefs).size, hrefs.length, row.path + ' 同じリンクを2回出さない');
    for (const href of row.upper) assert.ok(!hrefs.includes(href), row.path + ' 上の束の記事を出さない ' + href);
    assert.ok(!hrefs.includes(row.self), '自分の章を出さない');
    // 2 件の組を出したら打ち切る（createCardPicker）ので、2 件を許すのはカードの組の最後だけ
    // （2026-11-16: 記事の更新日でテーマの記事の並びが変わり、長い章の最後のカードの組が 2 件になった）
    const lastCard = row.groups.length - 1;
    row.groups.forEach((g, i) => {
      assert.equal(g.slot, 'standards-rail-group');
      assert.equal(g.adsense, i % 2 === 0, '1 組目から 1 組おきに AdSense');
      assert.equal(g.banner, false, '下に続く組に転職バナーは置かない（右の欄の転職は上の束の 2 つまで）');
      if (i === lastCard) { assert.ok(g.hrefs.length === 2 || g.hrefs.length === 3, 'カードの最後の組は 2〜3 件'); }
      else { assert.equal(g.hrefs.length, 3, '1組は3件（カードの最後の組だけ2件）'); }
    });
    row.groups.forEach((g, i) => assert.notEqual(g.label, row.groups[i - 1]?.label, '同じ種類を続けない'));
  }
  assert.ok(main.groups[2].plain, '前後の章は文字の一覧（サムネイルなし）');
});

test('下に続く組はカードだけで、転職バナーを持たない（AdSense は 1 組おき）', () => {
  const result = evaluate(`
    const { getStandardChapter } = await import('./src/lib/standards-articles.ts');
    const { standardsSidebarContinuation } = await import('./src/lib/standards-sidebar-continuation.ts');
    const { chapter, document } = getStandardChapter('mlit', 'sekou-kanri-kijun', '2-1');
    const groups = standardsSidebarContinuation(document, chapter, 4716);
    const packed = groups.filter(g => !g.lower);
    process.stdout.write(JSON.stringify({ n: packed.length, banners: packed.filter(g => 'banner' in g).length, cards: packed.filter(g => g.card).length, ads: packed.filter(g => g.adsense).length }));`);
  assert.deepEqual(result, { n: 3, banners: 0, cards: 3, ads: 2 });
});

test('資格トップ: 1級土木は AdSense＋新着の1組（人気順は上の束の人気記事だけ）・ランキングに出た記事は出さない・記事が少ない資格は0組・転職バナーは置かない', () => {
  const rows = evaluate(`
    Date.now = () => Date.parse('2026-11-16T00:00:00+09:00');
    const { getAllDocsMeta } = await import('./src/lib/docs.ts');
    const { getPopularDocs } = await import('./src/lib/popular.ts');
    const { categorySidebarContinuation } = await import('./src/lib/category-sidebar-continuation.ts');
    const { getPublicDocPath } = await import('./src/lib/content-routes.ts');
    const all = getAllDocsMeta();
    const rows = ['civil-construction-1', 'concrete-engineer', 'pe-first-stage', 'pavement'].map(slug => {
      const docs = all.filter(d => d.category === slug && d.published !== false && !d.tags?.includes('模範論文') && !d.hideFromCategory);
      const popular = getPopularDocs(docs, 5);
      const groups = categorySidebarContinuation(docs, popular);
      return { slug, docs: docs.length, shown: popular.map(p => getPublicDocPath(p.doc.slug)),
        groups: groups.filter(g => !g.lower).map(g => ({ slot: g.slot, adsense: Boolean(g.adsense), label: g.card?.label, hrefs: g.card?.links.map(l => l.href) ?? [], banner: 'banner' in g, thumbs: g.card?.links.every(l => l.doc) })) };
    });
    process.stdout.write(JSON.stringify(rows));`);
  const by = Object.fromEntries(rows.map(row => [row.slug, row]));
  // 人気順は上の束の人気記事（順位つきのサムネイル）だけが持つ（2026-11-22）。下の続きは新着の 1 組で、カードの上に AdSense
  assert.deepEqual(by['civil-construction-1'].groups.map(g => [g.label, g.adsense]), [['rail-latest', true]]);
  assert.deepEqual(by['concrete-engineer'].groups.map(g => g.adsense), [true], '1 組だけでもカードの上に AdSense');
  assert.equal(by['pavement'].groups.length, 0);
  for (const row of rows.filter(r => r.groups.length)) {
    const hrefs = row.groups.flatMap(g => g.hrefs);
    assert.equal(new Set(hrefs).size, hrefs.length);
    for (const href of row.shown) assert.ok(!hrefs.includes(href), row.slug + ' ランキングの記事を出さない');
    for (const g of row.groups) {
      assert.equal(g.slot, 'category-rail'); assert.ok(g.thumbs, '記事はサムネイルつき');
      assert.equal(g.banner, false, row.slug + ' 下に続く組に転職バナーは置かない');
    }
  }
});

test('基準書の右の欄を描画: 上の束の転職は 2 つ・下に続く組は AdSense とカードだけ・ピクセルを付けず・上の束の並びは変えない', () => {
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
    // 右の欄の 1 つ 1 つは RailStack の data-rail-kind の包みの中。包みを外して中身を見る（中身が空の包みは数えない）
    const unwrap = root => root.childNodes.filter(el => el.tagName).flatMap(el => el.getAttribute('data-rail-kind') ? el.childNodes.filter(c => c.tagName).slice(0, 1) : [el]);
    const order = root => unwrap(root).map(el => el.getAttribute('data-standards-affiliate') === 'rail' ? el.querySelector('[data-cta-placement]').getAttribute('data-cta-placement') : el.getAttribute('data-cta-label') ?? el.getAttribute('data-cta') ?? el.getAttribute('aria-label'));
    const groups = withGroups.querySelectorAll('[data-article-sidebar-group]');
    process.stdout.write(JSON.stringify({
      upperWith: order(withGroups.querySelector('[data-standards-sidebar]')), upperWithout: order(without.querySelector('[data-standards-sidebar]')),
      wrapper: withGroups.querySelector('div').childNodes.filter(el => el.tagName).map(el => el.hasAttribute('data-standards-sidebar') ? 'upper' : el.hasAttribute('data-article-sidebar-continuation') ? 'continuation' : 'other'),
      wrapperClass: withGroups.querySelector('div').getAttribute('class'),
      groups: groups.map(g => g.childNodes.filter(el => el.tagName).map(el => el.hasAttribute('data-rail-kind') && !el.hasAttribute('data-article-sidebar-card') ? el.childNodes.filter(c => c.tagName)[0] : el).map(el => el.hasAttribute('data-article-affiliate') ? 'banner:' + el.querySelector('a[data-cta-placement]').getAttribute('data-cta-placement') : el.getAttribute('data-adsense') === 'rail' ? 'adsense' : el.hasAttribute('data-article-sidebar-card') ? 'card' : 'other')),
      pixels: withGroups.querySelector('[data-article-sidebar-continuation]').querySelectorAll('img[width="1"]').length,
      thumbs: withGroups.querySelectorAll('[data-article-sidebar-card] a[data-thumb]').length,
      plainRows: withGroups.querySelectorAll('[data-article-sidebar-card] a').filter(a => a.getAttribute('href').includes('/standards/')).length,
      noGroups: without.querySelectorAll('[data-article-sidebar-continuation]').length,
    }));`;
  const data = JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }));
  assert.deepEqual(data.upperWith, data.upperWithout, '上の束は変えない');
  assert.deepEqual(data.upperWith.slice(0, 4), ['standards-rail', 'standards-tree', 'standards-rail-2', 'standards-related']);
  assert.equal(data.upperWith.filter(v => /^standards-rail/.test(v)).length, 2, '右の欄の転職は上の束の 2 つまで');
  assert.deepEqual(data.wrapper, ['upper', 'continuation']);
  assert.match(data.wrapperClass, /flex h-full flex-1 flex-col/);
  assert.equal(data.groups.length, 3);
  data.groups.forEach((group, i) => assert.deepEqual(group, i % 2 === 0 ? ['adsense', 'card'] : ['card'], '1 組目から 1 組おきに AdSense・転職バナーは置かない'));
  assert.equal(data.pixels, 0, '下に続く組にピクセルは付けない');
  assert.equal(data.thumbs, 6, '実務と試験対策の記事 6 件はサムネイルつき');
  assert.equal(data.plainRows, 3, '前後の章は文字の一覧');
  assert.equal(data.noGroups, 0, '組が無ければ今までどおり');
});
