import { test } from 'node:test';
import { URL } from 'node:url';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planInlineSlots, withInlineSlots, INLINE_FIRST_CHARS, INLINE_INTERVAL_CHARS, INLINE_REMAINING_CHARS, INLINE_MAX_SLOTS } from '../src/lib/standards-inline-slots.mjs';

const text = (n) => '土'.repeat(n);
const table = '| 項目 | 基準 |\n| --- | --- |\n| 高さ | 10 |';
const headingBody = (first, rest) => `## 一\n${text(first)}\n## 二\n${text(rest)}`;

test('閾値は共有定数で、初回は600字超・末尾800字以上', () => {
  const firstHeadingChars = planInlineSlots('## 一').chars;
  assert.equal(planInlineSlots(headingBody(INLINE_FIRST_CHARS - firstHeadingChars, INLINE_REMAINING_CHARS)).insertAt.length, 0);
  assert.equal(planInlineSlots(headingBody(INLINE_FIRST_CHARS - firstHeadingChars + 1, INLINE_REMAINING_CHARS)).insertAt.length, 1);
  const body = `${text(INLINE_FIRST_CHARS + 1)}\n${table}\n`;
  assert.equal(planInlineSlots(body + text(INLINE_REMAINING_CHARS - 1)).insertAt.length, 0);
  assert.equal(planInlineSlots(body + text(INLINE_REMAINING_CHARS)).insertAt.length, 1);
});

test('2つ目以降の見出しの前を候補にし、挿入後も見出し行を保存する', () => {
  const md = headingBody(700, 900);
  assert.deepEqual(planInlineSlots(md).insertAt, [{ line: 2, slot: 'standards-inline', afterLabel: '見出し『二』の前' }]);
  const output = withInlineSlots(md);
  assert.match(output, /<StandardsInlineBanner slot="standards-inline" \/>\n\n## 二/);
  assert.deepEqual(output.split('\n').filter((l) => l.startsWith('## ')), ['## 一', '## 二']);
});

test('間隔2500字以上の最初の区切りに置き、最大3枠に制限する', () => {
  const md = `${text(700)}\n${table}\n` + `${text(INLINE_INTERVAL_CHARS)}\n${table}\n`.repeat(5) + text(900);
  const plan = planInlineSlots(md);
  assert.equal(plan.insertAt.length, INLINE_MAX_SLOTS);
  assert.deepEqual(plan.insertAt.map((p) => p.slot), ['standards-inline', 'standards-inline-2', 'standards-inline-3']);
  const counts = plan.insertAt.map(({ line }) => planInlineSlots(md.split('\n').slice(0, line).join('\n')).chars);
  assert.ok(counts.slice(1).every((n, i) => n - counts[i] >= INLINE_INTERVAL_CHARS));
  assert.equal((withInlineSlots(md).match(/<StandardsInlineBanner /g) ?? []).length, 3);
});

test('表の後の空行・単位・出典・複数行コメントを表に含める', () => {
  const prefix = `${text(700)}\n${table}\n\n単位：mm\n\n<SourceRef pages="21" kind="table" />\n{/* 注記\n後半 */}\n\n`;
  const md = prefix + text(900);
  const plan = planInlineSlots(md);
  assert.equal(plan.tables, 1);
  assert.equal(plan.insertAt[0].line, prefix.split('\n').length - 1);
  assert.equal(plan.insertAt[0].afterLabel, '表 1 の後');
  assert.match(withInlineSlots(md), /後半 \*\/\}[\s\n]*<StandardsInlineBanner/);
});

test('1列の表と、表の直後の見出しも区切りとして扱う', () => {
  const md = `## 一\n${text(700)}\n| 項目 |\n| --- |\n| 高さ |\n\n## 二\n${text(900)}`;
  const plan = planInlineSlots(md);
  assert.equal(plan.tables, 1);
  assert.equal(plan.insertAt.length, 1);
  assert.equal(plan.insertAt[0].afterLabel, '表 1 の後');
  assert.equal(md.split('\n')[plan.insertAt[0].line], '## 二');
});

test('フェンス内の見出し・表・文字は無視し、コメント・タグ行・空白を字数に含めない', () => {
  const fenced = `\`\`\`\`md\n## 偽の一\n\`\`\`\n## 偽の二\n${table}\n${text(2000)}\n\`\`\`\`\n`;
  assert.deepEqual(planInlineSlots(fenced), { insertAt: [], chars: 0, tables: 0 });
  const md = fenced + headingBody(700, 900);
  assert.equal(planInlineSlots(md).insertAt[0].afterLabel, '見出し『二』の前');
  assert.equal(planInlineSlots(`{/* ${text(100)}\n注 */}\n<SourceRef pages="1" />\n 土 木 \t\n`).chars, 2);
});

test('見出しなしの短い章は0枠、表の後に十分な本文があれば1枠', () => {
  const short = `${table}\n${text(200)}`;
  assert.equal(planInlineSlots(short).insertAt.length, 0);
  assert.equal(withInlineSlots(short), short);
  assert.equal(planInlineSlots(`${text(650)}\n${table}\n${text(900)}`).insertAt.length, 1);
  assert.equal(planInlineSlots(`${text(2000)}\n普通の文 | 区切りではない\n${text(1000)}`).tables, 0);
});

test('2-1章は表の後に 3 枠置き、末尾と枠の間隔の字数を守る', () => {
  const md = readFileSync(new URL('../content/site/standards-articles/mlit/sekou-kanri-kijun/chapters/2-1.md', import.meta.url), 'utf8');
  const plan = planInlineSlots(md);
  assert.equal(plan.tables, 10);
  assert.equal(plan.insertAt.length, 3);
  assert.deepEqual(plan.insertAt.map((p) => p.afterLabel), ['表 2 の後', '表 4 の後', '表 6 の後']);
  for (const { line } of plan.insertAt) {
    assert.ok(plan.chars - planInlineSlots(md.split('\n').slice(0, line).join('\n')).chars >= INLINE_REMAINING_CHARS);
  }
});

test('描画した面だけがピクセルを持ち、rail 3 面・モバイル追加でも重複しない', async () => {
  const { execFileSync } = await import('node:child_process');
  const { execPath } = await import('node:process');
  const script = `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { parse } from 'node-html-parser';
    import { StandardsRailBanner, StandardsEndBanner, StandardsInlineBanner } from './src/components/standards/StandardsAffiliateBanners.tsx';
    Date.now = () => Date.parse('2026-11-16T00:00:00+09:00');
    const cases = [[], ['standards-inline'], ['standards-inline', 'standards-inline-2', 'standards-inline-3']].map(inlineSlots => ({ pageKind: 'standards', inlineSlots }));
    cases.push({ pageKind: 'standards-list', inlineSlots: [] });
    const result = cases.map(props => {
      const { inlineSlots, pageKind } = props;
      const railSlots = pageKind === 'standards' ? ['standards-rail', 'standards-rail-2', 'standards-rail-3'] : ['standards-list-rail', 'standards-list-rail-2'];
      const rail = railSlots.map(slot => renderToStaticMarkup(React.createElement(StandardsRailBanner, { ...props, slot }))).join('');
      const end = renderToStaticMarkup(React.createElement(StandardsEndBanner, props));
      const inline = inlineSlots.map(slot => renderToStaticMarkup(React.createElement(StandardsInlineBanner, { slot, inlineSlots }))).join('');
      const root = parse(rail + inline + end);
      const extras = parse(parse(end).querySelector('[data-standards-affiliate="end"]').childNodes.filter(el => el.getAttribute?.('class') === 'zenn-desktop:hidden').map(el => el.toString()).join(''));
      const pixels = html => parse(html).querySelectorAll('img[width="1"]').map(el => el.getAttribute('src'));
      return {
        pixels: pixels(rail + inline + end), railPixels: pixels(rail).length,
        cards: root.querySelectorAll('[data-cta="affiliate"]').length,
        railArms: parse(rail).querySelectorAll('[data-program-split-arm]').length,
        extraPixels: extras.querySelectorAll('img[width="1"]').length,
        extraCards: extras.querySelectorAll('[data-cta="affiliate"]').filter(el => railSlots.includes(el.getAttribute('data-cta-placement'))).length,
      };
    });
    process.stdout.write(JSON.stringify(result));
  `;
  // tsx CLI は IPC の listen を要求するため、sandbox でも動く import フックで描画する。
  const results = JSON.parse(execFileSync(execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { encoding: 'utf8' }));
  assert.deepEqual(results.map((r) => r.railPixels), [2, 1, 1, 1], 'buildjob は inline を優先、kensetsu-jobs は end を優先し、neo は rail が持つ');
  assert.deepEqual(results.map((r) => r.extraCards), [2, 1, 1, 1], '本文中・本文末にない buildjob と neo だけモバイル追加する');
  assert.equal(results[2].cards, 11, '本文中6枚・rail3枚・末尾1枚・モバイル追加1枚');
  for (const result of results) {
    assert.equal(result.railArms, 0);
    assert.equal(result.extraPixels, 0);
    assert.equal(result.pixels.length, new Set(result.pixels).size);
  }
});

test('表も 2 つ目の ## も無い長い章は段落の切れ目に置き、箇条の項目の間と見出しの直後には置かない', () => {
  const para = 'あ'.repeat(700);
  const md = ['## 総則', '', para, '', '- 項目一' + 'い'.repeat(700), '', '- 項目二' + 'う'.repeat(700), '', '### 細目', '', para, '', para, '', para, '', para].join('\n');
  const plan = planInlineSlots(md);
  assert.ok(plan.insertAt.length >= 1);
  const lines = md.split('\n');
  for (const { line } of plan.insertAt) {
    assert.ok(!/^#/.test(lines[line - 1] ?? ''), '見出しの直後');
    assert.ok(!(/^- /.test(lines[line - 1] ?? '') && /^- /.test(lines[line + 1] ?? '')), '箇条の項目の間');
  }
});


test('PC は上端・目次後・回遊カード間へ配置し、モバイルの Disclosure には入れない', async () => {
  const { execFileSync } = await import('node:child_process');
  const { execPath } = await import('node:process');
  const script = `
    import { createRequire } from 'node:module';
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import { parse } from 'node-html-parser';
    const require = createRequire(import.meta.url);
    // Node の静的描画では RSC の専用マーカーだけを無効にし、実際のデータ・部品を使う。
    require.cache[require.resolve('server-only')] = { exports: {} };
    const { default: nav } = await import('./src/components/standards/StandardsNavigation.tsx');
    const { default: top } = await import('./src/app/standards/page.tsx');
    const { ThemeProvider } = await import('./src/components/providers/ThemeProvider.tsx');
    const { StandardTopicDiscovery } = await import('./src/components/standards/StandardsSidebarDiscovery.tsx');
    const { StandardsRailBanner } = await import('./src/components/standards/StandardsAffiliateBanners.tsx');
    const { getStandardChapter } = await import('./src/lib/standards-articles.ts');
    Date.now = () => Date.parse('2026-11-16T00:00:00+09:00');
    const render = (component, props) => parse(renderToStaticMarkup(React.createElement(component.default ?? component, props)));
    const identify = el => el.getAttribute('data-cta-label') ?? el.getAttribute('data-cta') ?? el.getAttribute('aria-label');
    const order = root => root.childNodes.filter(el => el.tagName).map(el => el.getAttribute('data-standards-affiliate') === 'rail' ? el.querySelector('[data-cta-placement]').getAttribute('data-cta-placement') : identify(el));
    const rows = ['mlit/sekou-kanri-kijun/2-1', 'kinki/common/1-1'].map(path => {
      const [agencyId, docId, chapterId] = path.split('/');
      const { document, chapter } = getStandardChapter(agencyId, docId, chapterId);
      const props = { agencyId, currentDocument: document, currentChapter: chapter };
      const pc = render(nav, props).querySelector('[data-standards-sidebar]');
      const section = render(nav, { ...props, currentSection: chapter.sections[0]?.number }).querySelector('[data-standards-sidebar]');
      const mobile = render(nav, { ...props, variant: 'mobile' });
      return { order: order(pc), sectionOrder: order(section), mobileAds: mobile.querySelectorAll('[data-standards-affiliate]').length };
    });
    const topRoot = parse(renderToStaticMarkup(React.createElement(ThemeProvider, null, React.createElement(top.default ?? top))));
    const topRail = topRoot.querySelector('[data-standards-sidebar]');
    const single = render(StandardTopicDiscovery, { topics: [], heading: '回遊', withBridge: true, betweenCards: React.createElement(StandardsRailBanner, { slot: 'standards-list-rail-2', pageKind: 'standards-list' }) });
    process.stdout.write(JSON.stringify({ rows, top: order(topRail), explore: order(topRail.querySelector('[data-standards-explore]')), single: order(single), main: Boolean(topRoot.querySelector('main')), text: topRoot.textContent.includes('土木') }));
  `;
  const data = JSON.parse(execFileSync(execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { encoding: 'utf8' }));
  for (const row of data.rows) {
    assert.deepEqual(row.order.slice(0, 5), ['standards-rail', 'standards-tree', 'standards-rail-2', 'standards-related', 'standards-rail-3']);
    assert.ok(row.order.length > 5, '3面目は回遊カードの間');
    assert.deepEqual(row.sectionOrder, row.order);
    assert.equal(row.mobileAds, 0);
  }
  assert.equal(data.top[0], 'standards-list-rail');
  assert.deepEqual(data.explore.slice(0, 2), ['standards-entry-chapter', 'standards-list-rail-2']);
  assert.ok(data.explore.length > 2);
  assert.deepEqual(data.single, ['card', 'standards-list-rail-2'], '回遊が1枚だけなら後ろ');
  assert.equal(data.main, true);
  assert.equal(data.text, true);
});
