#!/usr/bin/env node
/**
 * ビルド済み HTML の note 密度・商品重複・転職広告の配置とピクセルを検査する。
 * Usage: node scripts/check-cta-density.mjs [--json] [--out <dir>]
 * DN-1198 A の記録は B/C が読む。CI 登録は C。検査 0 件・読み取り失敗も exit 1。
 * DOM だけを見る（RSC は除外）。EXP-053 は隣接する image/text の同じ CTA を1枚にする。
 * 記事カード内は note 最大3枚、記事下と右側のもくじは各1枚の別枠。
 * 旧ネイティブカードは許可しない。非記事ページは総数30とピクセルの既存ガードのみ。
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'node-html-parser';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { impressionKeyCounts } from './lib/affiliate-link-keys.mjs';

import { PAGE_ALLOWLIST, SURFACE_ALLOWLIST, articleImageKind } from '../src/lib/cta-density-policy.mjs';
import { RAIL_KINDS } from '../src/lib/rail-kinds.mjs';
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
  // 右の欄（TwoColumnShell の aside・幅 316px）は RailStack だけが描き、1 つ 1 つが台帳（src/lib/rail-kinds.mjs）の種類を持つ。
  // 手書きの入れ物・台帳に無い種類が戻ったら止める（2026-11-17 に右の欄を共通化）。
  const rails = dom.querySelectorAll('aside').filter(n => hasClass(n, 'w-[316px]'));
  let railUnits = 0;
  for (const rail of rails) {
    if (!rail.querySelector('[data-rail-stack]')) { add('rail-without-stack', 1, 0, [], ['layout']); continue; }
    const units = rail.querySelectorAll('[data-rail-stack], [data-article-sidebar-group], [data-article-sidebar-lower-ads]').flatMap(box => box.childNodes.filter(n => n.tagName));
    railUnits += units.length;
    const unknown = units.filter(n => !Object.hasOwn(RAIL_KINDS, attr(n, 'data-rail-kind')));
    if (unknown.length) add('rail-kind-unknown', unknown.length, 0, [], ['layout'], { kinds: [...new Set(unknown.map(n => attr(n, 'data-rail-kind') || n.tagName.toLowerCase()))] });
  }
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
    const forbidden = sponsored.filter(n => !articleImageKind(attr(n, 'data-cta-placement')) || attr(n, 'data-cta') !== 'affiliate').filter(n => !within(n, article) ||
      /(?:^|-)(?:end|footer|sidebar)(?:-|$)/.test(attr(n, 'data-cta-placement')) ||
      ancestor(n, p => p.tagName === 'ASIDE' || p.tagName === 'FOOTER'));
    if (forbidden.length) add('affiliate-forbidden-surface', forbidden.length, 0, [], ['affiliate'], {
      links: forbidden.map(n => ({ href: attr(n, 'href'), placement: attr(n, 'data-cta-placement') })),
    });
    const affiliates = page.querySelectorAll('[data-cta="affiliate"]').filter(n => !exemptSurface(n));
    for (const [viewport, desktop] of [['mobile', false], ['desktop', true]]) {
      const visible = affiliates.filter(n => visibleAt(n, desktop));
      const imageLinks = visible.filter(n => articleImageKind(attr(n, 'data-cta-placement')));
      for (const kind of ['inline', 'rail', 'end']) {
        const links = imageLinks.filter(n => articleImageKind(attr(n, 'data-cta-placement')) === kind);
        for (const n of links) {
          const wrapper = ancestor(n, p => attr(p, 'data-article-affiliate') === kind);
          const aside = ancestor(n, p => p.tagName === 'ASIDE');
          const valid = wrapper && (kind === 'inline' ? within(n, prose) && !ancestor(n, p => p.tagName === 'DETAILS') : kind === 'rail' ? desktop && Boolean(aside) : !within(n, article) && !aside);
          if (!valid) add('affiliate-image-position', 1, 0, [], ['affiliate'], { viewport, placement: attr(n, 'data-cta-placement') });
        }
      }
      // 過去問だけ、右の欄の組の間を埋めるバナー（article-rail-fill）は同じ案件・同じ面の繰り返しを許す（2026-11-16 運営者判断）。
      const rail = page.querySelector('[data-article-sidebar-cards]');
      const questionSeries = Boolean(rail?.hasAttribute('data-article-question-series'));
      const isFill = n => attr(n, 'data-cta-placement') === 'article-rail-fill';
      const slots = imageLinks.filter(n => !(questionSeries && isFill(n))).map(n => attr(n, 'data-cta-placement'));
      if (new Set(slots).size !== slots.length) add('affiliate-image-duplicate', slots.length - new Set(slots).size, 0, [], ['affiliate'], { viewport });
      // 数の上限は 2026-11-15 に廃止（運営者判断）。位置・重複・ピクセルは検査する。
      if (desktop && rail) {
        const banners = rail.querySelectorAll('[data-article-affiliate="rail"]');
        const anchorOf = b => b.querySelector('a[data-cta="affiliate"]') ?? b;
        const fillBanner = b => questionSeries && isFill(anchorOf(b));
        const railTargets = banners.filter(b => !fillBanner(b)).map(b => attr(anchorOf(b), 'href')).filter(Boolean);
        const duplicated = railTargets.length - new Set(railTargets).size;
        if (duplicated) add('affiliate-rail-duplicate', duplicated, 0, [], ['affiliate']);
        for (const banner of banners) {
          // 埋める組はバナーだけ。実カードの直後という決まりは過去問の埋める組には当てない。
          if (fillBanner(banner)) continue;
          // 右の欄の 1 つ 1 つは RailStack が data-rail-kind の div で包む。包みがあれば包みを 1 単位として前後を見る
          const unit = banner.parentNode.hasAttribute('data-rail-kind') ? banner.parentNode : banner;
          const parent = unit.parentNode;
          const children = parent.childNodes.filter(n => n.tagName);
          // 回遊候補が尽きた組だけ広告単独を許す。空の「実カード」で検査をすり抜けない。
          const adOnly = parent.hasAttribute('data-article-sidebar-group') && attr(parent, 'data-article-sidebar-ad-only') === 'true'
            && parent.parentNode.hasAttribute('data-article-sidebar-continuation') && children.length === 1;
          if (!adOnly && !children[children.indexOf(unit) + 1]?.hasAttribute('data-article-sidebar-card')) add('affiliate-rail-adjacent', 1, 0, [], ['affiliate']);
        }
      }
      for (const n of imageLinks.filter(n => articleImageKind(attr(n, 'data-cta-placement')) === 'inline')) {
        const wrapper = ancestor(n, p => attr(p, 'data-article-affiliate') === 'inline');
        if (!wrapper) continue;
        const siblings = wrapper.parentNode.childNodes.filter(n => n.tagName);
        const index = siblings.indexOf(wrapper);
        for (const neighbor of [siblings[index-1], siblings[index+1]]) {
          if (neighbor?.querySelector('[data-cta="affiliate"], [data-cta="note"]')) add('affiliate-image-adjacent', 1, 0, [], ['affiliate'], { viewport });
        }
      }
    }

  }
  // インフィード広告（記事の一覧の 1 項目・src/lib/feed-ads.ts）: 1 ページ 3 枠まで、前後は広告・転職・note・ココナラでない一覧の項目（2026-11-16）
  const feedAds = dom.querySelectorAll('[data-adsense^="inFeed"]');
  if (feedAds.length > 3) add('feed-ad-total', feedAds.length, 3, [], ['adsense']);
  const adLike = n => !n || n.hasAttribute('data-adsense') || Boolean(n.querySelector('[data-adsense], [data-cta="affiliate"], [data-cta="note"], [data-cta="coconala"], [data-cta="career-need"]'));
  for (const ad of feedAds) {
    const siblings = ad.parentNode.childNodes.filter(n => n.tagName);
    const index = siblings.indexOf(ad);
    if (adLike(siblings[index - 1]) || adLike(siblings[index + 1])) add('feed-ad-adjacent', 1, 0, [], ['adsense'], { slot: attr(ad, 'data-adsense') });
  }
  const programPixels = new Map();
  for (const pixel of dom.querySelectorAll('[data-article-pixel-program]')) {
    const program = attr(pixel, 'data-article-pixel-program');
    programPixels.set(program, (programPixels.get(program) ?? 0) + 1);
  }
  for (const [program, count] of programPixels) if (count > 1) add('affiliate-program-pixel-dup', count, 1, [], ['affiliate'], { program });
  for (const [mat, count] of Object.entries(impressionKeyCounts(dom.toString()))) {
    if (count > 1) add('affiliate-pixel-dup', count, 1, [], ['affiliate'], { mat });
  }
  return { slug, pageType: type, article: Boolean(article), noteCount: notes.length, rail: rails.length > 0, railUnits, violations, exclusions };
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
    railPages: pages.filter(p => p.rail).length, railUnits: pages.reduce((n, p) => n + (p.railUnits ?? 0), 0),
    violationPages: pages.filter(p => p.violations.length).length, violationCount: violations.length,
    // 原因は重複しうる（3枚以上で自動×手書き・手書き同士の両方）。総数は violationCount。
    byPageTypeAndCause: [...groups.values()].map(g => ({ ...g, pages: [...g.pages] })),
    excludedCount: pages.reduce((n, p) => n + p.exclusions.length, 0),
    exclusions: pages.flatMap(p => p.exclusions),
    errors, violations,
  };
}

export function main(argv = process.argv.slice(2)) {
  const args = parseCliArgs({ json: { type: 'boolean' }, out: { type: 'string' } }, argv);
  const report = auditDirectory(args.out ? path.resolve(args.out) : path.join(REPO_ROOT, 'out'));
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`[check-cta-density] 対象 ${report.files} / 検査 ${report.checkedPages} ページ（記事 ${report.articlePages}）・違反 ${report.violationCount} 件 / ${report.violationPages} ページ・取得失敗 ${report.errors.length} 件`);
    console.log(`  許可リストによる除外 ${report.excludedCount} 件（理由は JSON に記録）`);
    console.log(`  右の欄: ${report.railPages} ページ・${report.railUnits} 個の種類を台帳と照合`);
    if (!report.files) console.error('out/ の HTML が空です。先に npm run build を実行してください。');
    for (const g of report.byPageTypeAndCause) console.log(`  ${g.pageType} × ${g.cause}: ${g.violations} 件 / ${g.pages.length} ページ`);
    for (const v of report.violations) console.error(`  ${v.slug}: ${v.rule} = ${v.count}（上限 ${v.limit}） [${v.causes.join(', ')}]`);
    for (const e of report.errors) console.error(`  ${e.slug}: ${e.message}`);
  }
  return report.ok ? 0 : 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main();
