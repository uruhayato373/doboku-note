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
 *
 * npm run check-rendered-pages — out/ の全ページを Chrome でスマホ幅に描画し、横のはみ出し・記法の残り（[題](URL)・**・### ・表・$$・<Tag>）・console エラー・画像切れ・KaTeX エラーを拾う（先に `npm run serve`。全件 約 55 分なので `-- --prefix /exam/…` で絞る。Git Bash では MSYS_NO_PATHCONV=1 を付ける）。部品・生成器・記事の一括変更の後、deploy 前に人が回す。結果は .tmp/rendered-pages/。exit 1=問題あり / 2=検査不成立
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { chromium } from 'playwright';
import { REPO_ROOT } from './lib/repository-paths.mjs';
import { listFiles } from './lib/fs-walk.mjs';
import { guardBrowserLaunch } from './lib/playwright-launch.mjs';
import { parseCliArgs } from './lib/cli-args.mjs';
import { inspectInPage } from './lib/rendered-page-inspect.mjs';
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
