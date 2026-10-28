#!/usr/bin/env node
/**
 * check-rendered-pages.mjs — out/ の全ページをブラウザで描画し、画面に出るおかしさを一巡で拾う
 * ---------------------------------------------------------------------------
 * check-production-sweep（本番の HTTP・canonical）や check-table-rendering / check-bold-rendering
 * （MDX の構文）は描画後の画面を見ない。ここでは Playwright で実際に描画し、決定的に判定できる
 * 症状だけを拾う。見た目の違和感の最終判断は人（またはエージェントの目視）が、ここで撮った
 * スクショを見て行う。
 *
 * 検査（スマホ幅 375×812・ライト）:
 *   http        ステータスが 200 でない
 *   overflow    ページが横にはみ出す（はみ出した要素のセレクタを添える）
 *   console     console.error / pageerror
 *   request     同一オリジン・R2 の 4xx/5xx・読み込み失敗（GA などの外部計測は除く）
 *   image       img が読み込めていない（naturalWidth 0）
 *   katex       .katex-error がある
 *   markup      本文に MDX/Markdown の記法が生で出ている（<Callout ・$$・**x**・](url) など）
 *   mojibake    U+FFFD
 *   main        <main> が無い／本文が極端に短い
 *
 * 使い方（先に `npm run serve` で out/ を 3025 に配信しておく）:
 *   node scripts/check-rendered-pages.mjs                     全ページ
 *   node scripts/check-rendered-pages.mjs --prefix /exam/civil-construction-1   配下だけ
 *   node scripts/check-rendered-pages.mjs --sample 30         先頭 N 件
 *   node scripts/check-rendered-pages.mjs --concurrency 3 --base http://127.0.0.1:3025
 * 出力: .tmp/rendered-pages/results.json（全件）と shots/（問題があったページのスクショ）
 *
 * exit 0 = 全件 OK / 1 = 問題あり / 2 = 検査不成立（対象 0 件・接続失敗が 5% 超）
 * §9: 対象数・実検査数・種類別件数を必ず出す。
 * ---------------------------------------------------------------------------
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { chromium } from 'playwright';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { guardBrowserLaunch } from './lib/playwright-launch.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { R2_PUBLIC_HOST, SITE_ORIGIN } from './lib/site-identity.mjs';

const flags = parseCliArgs({
  base: { type: 'string', default: 'http://127.0.0.1:3025' },
  prefix: { type: 'string', default: '' },
  sample: { type: 'integer', default: 0 },
  concurrency: { type: 'integer', default: 3 },
});
const BASE = flags.base.replace(/\/$/, '');
const PREFIX = flags.prefix;
const SAMPLE = flags.sample;
const CONCURRENCY = flags.concurrency;
const OUT_DIR = join(REPO_ROOT, '.tmp', 'rendered-pages');
const SHOT_DIR = join(OUT_DIR, 'shots');

const SKIP = new Set(['/404', '/_not-found']);
// 計測・広告は会社 PC のプロキシで落ちることがあり、ページの不具合ではない。
const IGNORED_REQUEST = /googletagmanager|google-analytics|doubleclick|googlesyndication|a8\.net|moshimo|afi-b|cloudflareinsights/;

// 自サイト（配信元・本番・R2）の URL か。部分一致ではなくホスト名で判定する
const OWN_HOSTS = new Set([new URL(SITE_ORIGIN).hostname, R2_PUBLIC_HOST]);
function isOwnUrl(url, origin) {
  try {
    const parsed = new URL(url);
    return parsed.origin === origin || OWN_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function htmlPathToRoute(file) {
  const rel = file.split(sep).join('/').replace(/\.html$/, '');
  if (rel === 'index') return '/';
  return `/${rel.replace(/\/index$/, '')}`;
}

function listRoutes() {
  const outRoot = join(REPO_ROOT, 'out');
  const routes = listFiles(outRoot)
    .filter((f) => f.endsWith('.html') && !f.includes(`${sep}pagefind${sep}`))
    .map((f) => htmlPathToRoute(relative(outRoot, f)))
    .filter((r) => !SKIP.has(r) && r.startsWith(PREFIX || '/'));
  return [...new Set(routes)].sort();
}

// ページ内で走る判定（ブラウザ側）。
function inspectInPage() {
  const vw = document.documentElement.clientWidth;
  const issues = [];
  const sw = document.documentElement.scrollWidth;
  if (sw > vw + 1) {
    const isClipped = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true;
      }
      return false;
    };
    const offenders = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      // position:fixed の要素（閉じたドロワー等）は文書の横幅を広げないので原因にしない
      if (r.width === 0 || r.right <= vw + 1 || isClipped(el) || getComputedStyle(el).position === 'fixed') continue;
      // 親もはみ出しているなら親だけを報告する
      const parent = el.parentElement;
      if (parent && parent.getBoundingClientRect().right > vw + 1 && !isClipped(parent) && parent !== document.body) continue;
      const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
      offenders.push(`${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''} (right=${Math.round(r.right)})`);
      if (offenders.length >= 3) break;
    }
    issues.push({ type: 'overflow', detail: `scrollWidth=${sw} > ${vw}: ${offenders.join(' | ')}` });
  }

  for (const img of document.querySelectorAll('img')) {
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
      issues.push({ type: 'image', detail: img.currentSrc || img.getAttribute('src') });
    }
  }

  const katex = document.querySelectorAll('.katex-error');
  if (katex.length) issues.push({ type: 'katex', detail: `${katex.length} 件: ${katex[0].textContent.slice(0, 60)}` });

  const main = document.querySelector('main');
  if (!main) {
    issues.push({ type: 'main', detail: '<main> が無い' });
    return issues;
  }
  const clone = main.cloneNode(true);
  clone.querySelectorAll('.katex, script, style, pre, code, noscript, svg, textarea').forEach((n) => n.remove());
  const text = clone.textContent ?? '';
  if (text.replace(/\s/g, '').length < 150) issues.push({ type: 'main', detail: `本文 ${text.replace(/\s/g, '').length} 字` });
  const patterns = [
    [/<\/?[A-Z][A-Za-z]+[\s/>]/, 'JSX タグ'],
    [/\$\$|\\(?:frac|times|mathrm|text|sqrt|left|right)\b/, '数式記法'],
    [/\*\*[^*\s][^*]{0,40}\*\*/, '太字記法'],
    [/\]\((?:https?:|\/)/, 'リンク記法'],
    [/^#{2,4} /m, '見出し記法'],
    [/\{\/\*|\*\/\}/, 'MDX コメント'],
    [/^\s*\|.*\|.*\|\s*$/m, '表記法'],
  ];
  for (const [re, label] of patterns) {
    const m = text.match(re);
    if (m) {
      const at = Math.max(0, m.index - 20);
      issues.push({ type: 'markup', detail: `${label}: …${text.slice(at, m.index + 40).replace(/\s+/g, ' ')}…` });
    }
  }
  if (text.includes('�')) issues.push({ type: 'mojibake', detail: 'U+FFFD' });
  return issues;
}

async function checkRoute(context, route) {
  const page = await context.newPage();
  const issues = [];
  const origin = new URL(BASE).origin;
  // 読み込み失敗の console は request 側で URL つきで拾うので重ねない
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) {
      issues.push({ type: 'console', detail: msg.text().slice(0, 200) });
    }
  });
  page.on('pageerror', (err) => issues.push({ type: 'console', detail: `pageerror: ${String(err.message).slice(0, 200)}` }));
  page.on('response', (res) => {
    const url = res.url();
    // RSC のセグメント（__next.a.b.txt）は out/ では入れ子のディレクトリにあり、npm run serve だけが 404 を返す
    // （本番の Cloudflare は 200。2026-10-28 に確認）。ページの不具合ではないので数えない。
    if (res.status() >= 400 && !IGNORED_REQUEST.test(url) && !/\/__next\.[^/]*\.txt/.test(url) && isOwnUrl(url, origin)) {
      issues.push({ type: 'request', detail: `${res.status()} ${url}` });
    }
  });
  page.on('requestfailed', (req) => {
    const url = req.url();
    // ERR_ABORTED はリンクの先読みが遷移・close で打ち切られたもの
    if (req.failure()?.errorText !== 'net::ERR_ABORTED' && !IGNORED_REQUEST.test(url) && isOwnUrl(url, origin)) {
      issues.push({ type: 'request', detail: `failed ${req.failure()?.errorText ?? ''} ${url}` });
    }
  });
  let connected = true;
  try {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: 'load', timeout: 30000 });
    if (!res || res.status() !== 200) issues.push({ type: 'http', detail: String(res?.status() ?? 'no response') });
    // 遅延読み込みの画像も判定に入れる
    await page.evaluate(() => document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; }));
    await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 8000 }).catch(() => {});
    issues.push(...(await page.evaluate(inspectInPage)).filter((i) => !(i.type === 'image' && IGNORED_REQUEST.test(i.detail))));
    if (issues.length) {
      const name = route === '/' ? 'index' : route.slice(1).replace(/\//g, '__');
      await page.screenshot({ path: join(SHOT_DIR, `${name}.png`) }).catch(() => {});
    }
  } catch (err) {
    connected = !/ERR_CONNECTION_REFUSED/.test(String(err));
    issues.push({ type: 'http', detail: `goto 失敗: ${String(err.message).split('\n')[0]}` });
  } finally {
    await page.close().catch(() => {});
  }
  return { route, connected, issues: dedupe(issues) };
}

function dedupe(issues) {
  const seen = new Set();
  return issues.filter((i) => {
    const k = `${i.type}\t${i.detail}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

async function main() {
  let routes = listRoutes();
  if (SAMPLE > 0) routes = routes.slice(0, SAMPLE);
  console.log(`[check-rendered-pages] 対象 ${routes.length} 件（${BASE}${PREFIX || ''}・並列 ${CONCURRENCY}）`);
  if (routes.length === 0) {
    console.error('[check-rendered-pages] 対象 0 件（out/ が無い、または --prefix が合っていない）');
    process.exit(2);
  }
  // 前回のスクショを残すと今回の結果と混ざる
  rmSync(SHOT_DIR, { recursive: true, force: true });
  mkdirSync(SHOT_DIR, { recursive: true });
  guardBrowserLaunch();
  // 会社 PC はプロキシで Playwright 同梱ブラウザの取得が通らないことがあるので、入っている Chrome を使う
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, colorScheme: 'light', serviceWorkers: 'block' });
  // 通らない外部計測はブラウザ内で止めておく（待ち時間の削減）
  await context.route(IGNORED_REQUEST, (r) => r.abort());

  const results = [];
  let next = 0;
  const started = Date.now();
  async function worker() {
    while (next < routes.length) {
      const route = routes[next++];
      results.push(await checkRoute(context, route));
      if (results.length % 100 === 0) {
        console.log(`  ${results.length}/${routes.length}（${Math.round((Date.now() - started) / 1000)}s）`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  await browser.close();

  results.sort((a, b) => a.route.localeCompare(b.route));
  const unreachable = results.filter((r) => !r.connected).length;
  const flagged = results.filter((r) => r.issues.length);
  const byType = {};
  for (const r of flagged) for (const i of r.issues) byType[i.type] = (byType[i.type] ?? 0) + 1;
  writeFileSync(join(OUT_DIR, 'results.json'), `${JSON.stringify({ base: BASE, prefix: PREFIX, total: routes.length, checked: results.length - unreachable, flagged: flagged.length, byType, results: flagged }, null, 2)}\n`);

  console.log(`[check-rendered-pages] 対象 ${routes.length} / 実検査 ${results.length - unreachable} / 問題あり ${flagged.length}`);
  for (const [type, n] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${type}: ${n}`);
  console.log(`  詳細: ${relative(REPO_ROOT, join(OUT_DIR, 'results.json'))}`);
  if (unreachable / routes.length > 0.05) {
    console.error(`[check-rendered-pages] 検査不成立: 接続失敗 ${unreachable} 件（npm run serve は起動している？）`);
    process.exit(2);
  }
  process.exit(flagged.length ? 1 : 0);
}

main().catch((err) => {
  console.error(`[check-rendered-pages] ${err.stack ?? err}`);
  process.exit(2);
});
