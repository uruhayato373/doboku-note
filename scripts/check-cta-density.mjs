#!/usr/bin/env node
/**
 * ビルド済み HTML の note 密度・商品重複・転職広告の配置とピクセルを検査する。
 * Usage: node scripts/check-cta-density.mjs [--json] [--out <dir>] [--record-dn1198]
 * DN-1198 A の記録は B/C が読む。CI 登録は C。検査 0 件・読み取り失敗も exit 1。
 * DOM だけを見る（RSC は除外）。EXP-053 は隣接する image/text の同じ CTA を1枚にする。
 * 記事カード内は note 最大3枚、記事下と右側のもくじは各1枚の別枠。
 * EXP-048 の2社は同じ grid の1枠。非記事ページは総数30とピクセルの既存ガードのみ。
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'node-html-parser';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { impressionKeyCounts } from './lib/affiliate-link-keys.mjs';
import { writeDataset } from './lib/dataset-write.mjs';

import { PAGE_ALLOWLIST, SURFACE_ALLOWLIST } from '../src/lib/cta-density-policy.mjs';
export { PAGE_ALLOWLIST, SURFACE_ALLOWLIST };

const attr = (node, key) => node.getAttribute(key) ?? '';
const within = (node, parent) => {
  for (let p = node; p; p = p.parentNode) if (p === parent) return true;
  return false;
};
function ancestor(node, predicate) {
  for (let p = node.parentNode; p; p = p.parentNode) if (predicate(p)) return p;
  return null;
}
const hasClass = (node, name) => attr(node, 'class').split(/\s+/).includes(name);
// TwoColumnShell / 基準書のバナーは 993px 境界で同じ枠の DOM を切り替える。
function visibleAt(node, desktop) {
  for (let p = node; p; p = p.parentNode) {
    if (desktop && hasClass(p, 'zenn-desktop:hidden')) return false;
    if (hasClass(p, 'hidden') && !(desktop && hasClass(p, 'zenn-desktop:block'))) return false;
  }
  return true;
}
const signature = (node) => ['href', 'data-cta', 'data-cta-label', 'data-cta-placement'].map(k => attr(node, k)).join('\n');

/** ページ全体で同じ商品をまとめない。直隣の対になった実験案だけを畳む。 */
function visibleNotes(dom) {
  const ignored = new Set();
  for (const arm of dom.querySelectorAll('[data-note-body-arm="image"]')) {
    const siblings = arm.parentNode.childNodes.filter(n => n.tagName);
    const index = siblings.indexOf(arm);
    const text = siblings[index + 1];
    if (!text || attr(text, 'data-note-body-arm') !== 'text') continue;
    const unmatched = arm.querySelectorAll('[data-cta="note"]').map(signature);
    for (const node of text.querySelectorAll('[data-cta="note"]')) {
      const i = unmatched.indexOf(signature(node));
      if (i >= 0) { ignored.add(node); unmatched.splice(i, 1); }
    }
  }
  return dom.querySelectorAll('[data-cta="note"]').filter(n => !ignored.has(n));
}

function productUrl(node) {
  const href = attr(node, 'href');
  // もくじは商品ではなく、記事下とサイドバーへの再掲を許す。
  if (['article-footer', 'article-sidebar'].includes(attr(node, 'data-cta-placement')) &&
      /-(?:footer|docs-sb)$/.test(attr(node, 'data-cta-label'))) return null;
  try {
    const url = new URL(href);
    return url.hostname === 'note.com' ? `${url.origin}${url.pathname.replace(/\/$/, '')}` : null;
  } catch { return null; }
}
function pageType(slug, isArticle) {
  if (!isArticle) return 'non-article';
  const parts = slug.split('/');
  return parts[0] === 'exam' ? `exam/${parts[2] ?? 'other'}` : parts[0];
}
function causesOf(notes) {
  const manual = notes.filter(n => n.source === 'manual').length;
  const causes = [];
  if (manual && manual < notes.length) causes.push('auto-manual');
  if (manual >= 2) causes.push('manual-manual');
  if (!causes.length) causes.push(manual ? 'manual' : 'auto-auto');
  return causes;
}

export function inspectHtml(html, slug) {
  const dom = parse(html);
  dom.querySelectorAll('script, style, template').forEach(n => n.remove());
  const prose = dom.querySelector('article .prose-blog');
  const article = prose && ancestor(prose, n => n.tagName === 'ARTICLE');
  const type = pageType(slug, Boolean(article));
  const elements = dom.querySelectorAll('*');
  const order = new Map(elements.map((n, i) => [n, i]));
  const notes = visibleNotes(dom).map(node => ({
    node,
    product: productUrl(node),
    label: attr(node, 'data-cta-label'),
    placement: attr(node, 'data-cta-placement'),
    // article-mid は手書きにも使われる。自動挿入は resolvePlacement の枠ラベルで区別する。
    source: prose && within(node, prose) && !(attr(node, 'data-cta-placement') === 'article-mid' &&
      /-(?:top|inline-\d+)-mid$/.test(attr(node, 'data-cta-label'))) ? 'manual' : 'auto',
  }));
  const violations = [];
  const exclusions = [];
  const pageAllow = PAGE_ALLOWLIST.filter(e => e.page === slug || (e.prefix && slug.startsWith(e.prefix)));
  const evidence = ns => ns.map(({ node, ...n }) => ({ ...n, position: order.get(node) }));
  const add = (rule, count, limit, ns = [], causes = causesOf(ns), extra = {}) => {
    const allowed = pageAllow.find(e => e.rules.includes(rule));
    const result = { slug, pageType: type, rule, count, limit, causes, ...extra, ...(ns.length ? { notes: evidence(ns) } : {}) };
    if (allowed) exclusions.push({ ...result, reason: allowed.reason });
    else violations.push(result);
  };
  if (notes.length > 30) add('note-total', notes.length, 30, notes);
  if (article) {
    const bodyNotes = notes.filter(n => within(n.node, article));
    if (bodyNotes.length > 3) add('note-non-footer', bodyNotes.length, 3, bodyNotes);
    const h2 = prose.querySelector('h2');
    const before = bodyNotes.filter(n => !h2 || order.get(n.node) < order.get(h2));
    if (before.length > 1) add('note-before-first-h2', before.length, 1, before);
    const products = new Map();
    for (const note of notes) {
      if (!note.product) continue;
      if (!products.has(note.product)) products.set(note.product, []);
      products.get(note.product).push(note);
    }
    for (const [product, ns] of products) {
      // 許す再掲は記事カードの冒頭＋本文の外側にある直後CTAの2枚だけ。
      const topEndPair = ns.length === 2 && ns.every(n => n.source === 'auto' && within(n.node, article)) &&
        ns.some(n => n.placement === 'article-top') &&
        ns.some(n => n.placement === 'article-end' && !within(n.node, prose) && /-end$/.test(n.label));
      if (ns.length > 1 && !topEndPair) add('note-product-dup', ns.length, 1, ns, causesOf(ns), { product });
    }
    for (const placement of ['article-footer', 'article-sidebar']) {
      const ns = notes.filter(n => n.placement === placement);
      if (ns.length > 1) add(`note-${placement}`, ns.length, 1, ns);
    }
    // 記事カード外の footer / aside は広告禁止。本文内でも明示された末尾/側面は検出する。
    const main = ancestor(article, n => n.tagName === 'MAIN');
    // TwoColumnShell の aside は main の兄弟。main 内だけだとサイドバーを見落とす。
    const page = main?.parentNode ?? dom;
    const exemptSurface = node => Boolean(SURFACE_ALLOWLIST[attr(node, 'data-cta-placement')]);
    for (const [placement, reason] of Object.entries(SURFACE_ALLOWLIST)) {
      const count = page.querySelectorAll(`[data-cta-placement="${placement}"]`).length;
      if (count) exclusions.push({ slug, placement, count, reason });
    }
    const sponsored = page.querySelectorAll('[rel]').filter(n => !exemptSurface(n)).filter(n => attr(n, 'rel').split(/\s+/).includes('sponsored'));
    const forbidden = sponsored.filter(n => !within(n, article) ||
      /(?:^|-)(?:end|footer|sidebar)(?:-|$)/.test(attr(n, 'data-cta-placement')) ||
      ancestor(n, p => p.tagName === 'ASIDE' || p.tagName === 'FOOTER'));
    if (forbidden.length) add('affiliate-forbidden-surface', forbidden.length, 0, [], ['affiliate'], {
      links: forbidden.map(n => ({ href: attr(n, 'href'), placement: attr(n, 'data-cta-placement') })),
    });
    const affiliates = page.querySelectorAll('[data-cta="affiliate"]').filter(n => !exemptSurface(n));
    const slotOf = n => {
      // EXP-048 B2 の実 DOM は2枚が同一 grid 内。別 grid・別配置を一緒にはしない。
      if (attr(n, 'data-cta-variant') === 'B2') {
        const grid = ancestor(n, p => hasClass(p, 'grid-cols-2'));
        if (grid) return grid;
      }
      return n;
    };
    const slotsByViewport = Object.fromEntries([['mobile', false], ['desktop', true]].map(([key, desktop]) =>
      [key, new Set(affiliates.filter(n => visibleAt(n, desktop)).map(slotOf)).size]));
    const slotCount = Math.max(...Object.values(slotsByViewport));
    if (slotCount > 1) add('affiliate-slots', slotCount, 1, [], ['affiliate'], {
      slotsByViewport,
      links: affiliates.map(n => ({ href: attr(n, 'href'), placement: attr(n, 'data-cta-placement') })),
    });
  }
  for (const [mat, count] of Object.entries(impressionKeyCounts(dom.toString()))) {
    if (count > 1) add('affiliate-pixel-dup', count, 1, [], ['affiliate'], { mat });
  }
  return { slug, pageType: type, article: Boolean(article), noteCount: notes.length, violations, exclusions };
}

export function auditDirectory(outRoot) {
  const files = listFiles(outRoot, { ext: '.html', skipDir: (_p, name) => name === 'pagefind', allowMissing: true }).sort();
  const pages = [];
  const errors = [];
  for (const file of files) {
    const slug = path.relative(outRoot, file).split(path.sep).join('/').replace(/\.html$/, '').replace(/\/index$/, '');
    try { pages.push(inspectHtml(fs.readFileSync(file, 'utf8'), slug)); }
    catch (error) { errors.push({ slug, message: error.message }); }
  }
  const violations = pages.flatMap(p => p.violations);
  const groups = new Map();
  for (const v of violations) for (const cause of v.causes) {
    const key = `${v.pageType}:${cause}`;
    if (!groups.has(key)) groups.set(key, { pageType: v.pageType, cause, violations: 0, pages: new Set() });
    const group = groups.get(key);
    group.violations++;
    group.pages.add(v.slug);
  }
  return {
    schemaVersion: 1,
    ok: files.length > 0 && errors.length === 0 && violations.length === 0,
    ...(files.length ? {} : { reason: 'no-build' }),
    files: files.length, checkedPages: pages.length, articlePages: pages.filter(p => p.article).length,
    violationPages: pages.filter(p => p.violations.length).length, violationCount: violations.length,
    // 原因は重複しうる（3枚以上で自動×手書き・手書き同士の両方）。総数は violationCount。
    byPageTypeAndCause: [...groups.values()].map(g => ({ ...g, pages: [...g.pages] })),
    excludedCount: pages.reduce((n, p) => n + p.exclusions.length, 0),
    exclusions: pages.flatMap(p => p.exclusions),
    errors, violations,
  };
}

export function main(argv = process.argv.slice(2)) {
  const args = parseCliArgs({ json: { type: 'boolean' }, out: { type: 'string' }, 'record-dn1198': { type: 'boolean' } }, argv);
  const report = auditDirectory(args.out ? path.resolve(args.out) : path.join(REPO_ROOT, 'out'));
  if (args.recordDn1198) writeDataset(REPO_ROOT, 'state.cta-layout-dn1198', {
    _doc: '.claude/plans/DN-1198-cta-layout.md', generatedAt: new Date().toISOString(), ...report,
  });
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`[check-cta-density] 対象 ${report.files} / 検査 ${report.checkedPages} ページ（記事 ${report.articlePages}）・違反 ${report.violationCount} 件 / ${report.violationPages} ページ・取得失敗 ${report.errors.length} 件`);
    console.log(`  許可リストによる除外 ${report.excludedCount} 件（理由は JSON に記録）`);
    if (!report.files) console.error('out/ の HTML が空です。先に npm run build を実行してください。');
    for (const g of report.byPageTypeAndCause) console.log(`  ${g.pageType} × ${g.cause}: ${g.violations} 件 / ${g.pages.length} ページ`);
    for (const v of report.violations) console.error(`  ${v.slug}: ${v.rule} = ${v.count}（上限 ${v.limit}） [${v.causes.join(', ')}]`);
    for (const e of report.errors) console.error(`  ${e.slug}: ${e.message}`);
  }
  return report.ok ? 0 : 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main();
