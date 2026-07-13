#!/usr/bin/env node

/**
 * check-seo-build — build 済み out/ の全 HTML を構造化パーサで検査する SEO ゲート。
 *
 * next build（output: export）が生成した out/ を対象に、sitemap 掲載 URL の母集合を正として:
 *   - sitemap 掲載 URL の HTML 欠落 / noindex 混入 / redirect 混入 / 404 混入
 *   - 各 indexable ページの title / description / self canonical / self og:url / robots /
 *     JSON-LD parse・可視整合 / SSR（main・H1・本文）
 *   - 内部リンク切れ / noncanonical link / orphan / 到達不能（home からの BFS）
 * を検査する。
 *
 * ゲート（error → exit 1・baseline で隠さない）:
 *   sitemap HTML 欠落・noindex/redirect/404 混入・canonical/og:url 不一致・
 *   title/description 欠落・JSON-LD parse error・SSR 破壊・broken internal link・
 *   検査 URL 数が sitemap 母集合の 90% 未満（母集合不足を成功扱いにしない）。
 * 参考（warn・非ゲート）: description 160 字超・JSON-LD 欠落/見出し乖離・
 *   noncanonical link・orphan・到達不能。
 *
 * Usage: node scripts/check-seo-build.mjs [--json] [--ci] [--out <dir>]
 */

import fs from 'node:fs';
import path from 'node:path';
import {
  extractSeo,
  runIndexablePageChecks,
  isNoindex,
  normalizeUrlForCompare,
  selfUrl,
} from './lib/seo-checks.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const jsonOut = argv.includes('--json');
function getArg(name, def) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}
const OUT = path.resolve(ROOT, getArg('--out', 'out'));
const SITEMAP = path.join(OUT, 'sitemap.xml');
const REDIRECTS = path.join(ROOT, 'public', '_redirects');

/** 検査母集合ガードの下限比率（sitemap 母集合の 90%）。 */
const COVERAGE_MIN_RATIO = 0.9;

const findings = []; // { level, code, page, message }
function add(level, code, page, message) {
  findings.push({ level, code, page, message });
}

function die(msg) {
  console.error(`check-seo-build: ${msg}`);
  process.exit(2);
}

if (!fs.existsSync(OUT)) die(`out ディレクトリが無い: ${OUT}（先に npm run build）`);
if (!fs.existsSync(SITEMAP)) die(`sitemap.xml が無い: ${SITEMAP}`);

// ---- URL <-> ファイルパス ----
function urlPathToFile(urlPath) {
  if (urlPath === '/') return path.join(OUT, 'index.html');
  return path.join(OUT, `${urlPath.replace(/^\//, '')}.html`);
}
function fileToUrlPath(relFromOut) {
  const p = relFromOut.replace(/\\/g, '/');
  if (p === 'index.html') return '/';
  return `/${p.replace(/\.html$/, '')}`;
}

// ---- 全 HTML ルート集合（404/_not-found/_ 配下・非ルートは除外） ----
const EXCLUDE_FILES = new Set(['404.html', '_not-found.html']);
function walkHtml(dir, base = '') {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name === 'pagefind' || entry.name === 'content') continue;
      results.push(...walkHtml(path.join(dir, entry.name), rel));
    } else if (entry.name.endsWith('.html')) {
      if (EXCLUDE_FILES.has(rel) || rel.startsWith('_') || rel.includes('/_')) continue;
      results.push(rel);
    }
  }
  return results;
}
const allHtmlRel = walkHtml(OUT);
const routeSet = new Set(allHtmlRel.map(fileToUrlPath));

// ---- sitemap 母集合 ----
function parseSitemapPaths() {
  const xml = fs.readFileSync(SITEMAP, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const paths = new Set();
  for (const loc of locs) {
    const m = loc.match(/^https?:\/\/[^/]+(\/.*)?$/);
    let p = m && m[1] ? m[1] : '/';
    p = p.replace(/\/$/, '') || '/';
    paths.add(p);
  }
  return paths;
}
const sitemapPaths = parseSitemapPaths();

// ---- redirect ソース（301/302 の from パス） ----
function parseRedirectSources() {
  const map = new Map(); // from -> to
  if (!fs.existsSync(REDIRECTS)) return map;
  for (const rawLine of fs.readFileSync(REDIRECTS, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;
    map.set(parts[0], parts[1]);
  }
  return map;
}
const redirectSources = parseRedirectSources();

// ---- 404 ページ判定（誤って sitemap に混入した場合の検出用） ----
function looksLike404(seo) {
  return Boolean(seo.title && /ページが見つかりません/.test(seo.title));
}

// ---- 全 sitemap ページを解析（link graph でも再利用） ----
const pages = new Map(); // urlPath -> seo
let checked = 0;
for (const urlPath of sitemapPaths) {
  const file = urlPathToFile(urlPath);
  if (!fs.existsSync(file)) {
    add('error', 'sitemap_html_missing', urlPath, `sitemap 掲載 URL の HTML が無い: ${file}`);
    continue;
  }
  let seo;
  try {
    seo = extractSeo(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    add('error', 'html_parse_error', urlPath, `HTML parse 失敗: ${e.message}`);
    continue;
  }
  pages.set(urlPath, seo);
  checked++;

  // sitemap 混入検査
  if (looksLike404(seo)) {
    add('error', 'sitemap_404', urlPath, 'sitemap に 404 相当ページが混入');
  }
  if (isNoindex(seo)) {
    add('error', 'sitemap_noindex', urlPath, `sitemap 掲載 URL が noindex: "${seo.robots}"`);
  }
  if (seo.metaRefresh && /url=/i.test(seo.metaRefresh)) {
    add('error', 'sitemap_redirect', urlPath, `sitemap 掲載 URL が meta refresh redirect: "${seo.metaRefresh}"`);
  }

  // indexable ページ標準検査
  for (const f of runIndexablePageChecks(seo, urlPath, { expectIndexable: true })) {
    add(f.level, f.code, urlPath, f.message);
  }
}

// ---- 母集合ガード ----
const expected = sitemapPaths.size;
const coverageRatio = expected > 0 ? checked / expected : 0;
if (coverageRatio < COVERAGE_MIN_RATIO) {
  add(
    'error',
    'coverage_below_threshold',
    null,
    `検査 URL 数 ${checked} が sitemap 母集合 ${expected} の ${(COVERAGE_MIN_RATIO * 100).toFixed(0)}% 未満`,
  );
}

// ---- 内部リンクグラフ ----
// path -> canonical path（比較用正規化済み）
const canonicalPathByRoute = new Map();
for (const [urlPath, seo] of pages) {
  if (seo.canonical) {
    const norm = normalizeUrlForCompare(seo.canonical);
    // self 期待の正規化と同じ土俵に載せるため path 部分を抽出
    const m = norm && norm.match(/^https?:\/\/[^/]+(\/.*)?$/);
    canonicalPathByRoute.set(urlPath, m && m[1] ? m[1] : '/');
  }
}

/** page link（拡張子なしのルート的パス）だけを対象にする。 */
function isPageLink(p) {
  const last = p.split('/').pop() || '';
  return !last.includes('.');
}

const inbound = new Map(); // path -> inbound count（sitemap ページ間）
const graph = new Map(); // path -> Set<path>（到達可能ページのみ）
for (const p of sitemapPaths) inbound.set(p, 0);

for (const [fromPath, seo] of pages) {
  const outSet = new Set();
  for (const link of seo.internalLinks) {
    if (!isPageLink(link)) continue;
    const target = link === '' ? '/' : link;
    if (redirectSources.has(target)) {
      add('warn', 'noncanonical_link_redirect', fromPath, `redirect ソースへの内部リンク: ${target} → ${redirectSources.get(target)}`);
      continue;
    }
    if (!routeSet.has(target)) {
      add('error', 'broken_internal_link', fromPath, `存在しないページへの内部リンク: ${target}`);
      continue;
    }
    // noncanonical: リンク先ページの canonical が link path と異なる
    const canon = canonicalPathByRoute.get(target);
    if (canon && normalizeUrlForCompare(selfUrl(canon)) !== normalizeUrlForCompare(selfUrl(target))) {
      add('warn', 'noncanonical_link', fromPath, `noncanonical URL への内部リンク: ${target}（canonical=${canon}）`);
    }
    if (inbound.has(target) && target !== fromPath) {
      inbound.set(target, inbound.get(target) + 1);
    }
    outSet.add(target);
  }
  graph.set(fromPath, outSet);
}

// orphan（sitemap ページのうち被リンク 0・home 自身は除外）
const orphans = [];
for (const [p, count] of inbound) {
  if (p === '/') continue;
  if (count === 0) orphans.push(p);
}
for (const p of orphans) add('warn', 'orphan_page', p, 'サイト内被リンク 0（orphan）');

// 到達不能（home からの BFS で辿れない sitemap ページ）
const reachable = new Set();
const queue = ['/'];
while (queue.length) {
  const cur = queue.shift();
  if (reachable.has(cur)) continue;
  reachable.add(cur);
  const outs = graph.get(cur);
  if (outs) for (const t of outs) if (!reachable.has(t)) queue.push(t);
}
const unreachable = [];
for (const p of sitemapPaths) {
  if (!reachable.has(p)) unreachable.push(p);
}
for (const p of unreachable) add('warn', 'unreachable_page', p, 'home から内部リンクで到達不能');

// ---- 集計・出力 ----
const errors = findings.filter((f) => f.level === 'error');
const warns = findings.filter((f) => f.level === 'warn');
const byCode = {};
for (const f of findings) byCode[f.code] = (byCode[f.code] || 0) + 1;

const summary = {
  generated_at: new Date().toISOString(),
  out_dir: path.relative(ROOT, OUT) || 'out',
  sitemap_urls: expected,
  html_routes: routeSet.size,
  checked,
  coverage_ratio: Number(coverageRatio.toFixed(4)),
  errors: errors.length,
  warnings: warns.length,
  by_code: byCode,
};

if (jsonOut) {
  console.log(JSON.stringify({ summary, findings }, null, 2));
} else {
  console.log('\n🔎 build 後 SEO スキャン（out/）');
  console.log(`   sitemap 母集合: ${expected}`);
  console.log(`   HTML ルート数: ${routeSet.size}`);
  console.log(`   検査 URL 数: ${checked}（母集合比 ${(coverageRatio * 100).toFixed(1)}%）`);
  console.log(`   error: ${errors.length} / warn: ${warns.length}\n`);

  if (errors.length) {
    console.log('❌ error（ゲート違反）:');
    const shown = errors.slice(0, 60);
    for (const f of shown) {
      console.log(`   [${f.code}] ${f.page ?? '(global)'} — ${f.message}`);
    }
    if (errors.length > shown.length) console.log(`   … 他 ${errors.length - shown.length} 件`);
    console.log('');
  } else {
    console.log('✅ error なし\n');
  }

  if (warns.length) {
    const warnByCode = {};
    for (const f of warns) warnByCode[f.code] = (warnByCode[f.code] || 0) + 1;
    console.log('⚠️  warn（参考・非ゲート）:');
    for (const [code, n] of Object.entries(warnByCode)) console.log(`   ${code}: ${n}`);
    console.log('');
  }
}

process.exit(errors.length > 0 ? 1 : 0);
