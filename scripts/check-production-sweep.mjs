#!/usr/bin/env node
/**
 * check-production-sweep.mjs — 本番 deploy 後に sitemap 全 URL を実際に叩いて検査する
 * ---------------------------------------------------------------------------
 * check-seo-build は `out/`（ビルド成果物）を見る。Cloudflare 層（_redirects・_headers・キャッシュ・
 * R2 の og:image）は本番でしか観測できないので、deploy 後に本番を全件スイープする。
 *
 * 検査:
 *   - sitemap 掲載 URL が 200 / 自分自身が canonical / <main> あり / noindex 無し / 3xx でない
 *   - og:image（R2 `storage.doboku-note.com` など）の一意集合が 200
 *   - `/` のレスポンスヘッダに HSTS / X-Content-Type-Options / X-Frame-Options / Referrer-Policy
 *
 * exit 0 = 全件 OK / 1 = 本番異常あり / 2 = 検査不成立（sitemap 0 件・接続失敗 5% 超）
 * §9: 対象数・実検査数・失敗内訳を必ず出す。
 *
 * CLI:
 *   node scripts/check-production-sweep.mjs                 # 全件（約 1,400 URL・8 並列・数分）
 *   node scripts/check-production-sweep.mjs --sample 50     # 先頭 N 件だけ（手元の動作確認）
 *   node scripts/check-production-sweep.mjs --json          # 機械可読
 * curl を使う（会社 PC は Node fetch がプロキシを通らない。check-production-ssr と同じ理由）。
 * ---------------------------------------------------------------------------
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { classifyPage, missingHeaders, parseSitemapLocs, splitCurlOutput, summarize } from './lib/production-sweep.mjs';

const run = promisify(execFile);
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};
const SITE = opt('--site', 'https://doboku-note.com');
const CONCURRENCY = Number(opt('--concurrency', 8));
const SAMPLE = Number(opt('--sample', 0));
const JSON_OUT = args.includes('--json');

async function curl(extra, url) {
  try {
    const { stdout } = await run('curl', ['-s', '--ssl-no-revoke', '--max-time', '30', ...extra, url], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    return stdout;
  } catch (e) {
    return e?.stdout ?? '';
  }
}
const getPage = async (url) => splitCurlOutput(await curl(['-w', '\\n__META__%{http_code}\\t%{redirect_url}\\t%{content_type}'], url));
// `-o /dev/null` は Windows の curl.exe（シェル非経由）では開けず 000 になるので使わない。
const headStatus = async (url) => splitCurlOutput(await curl(['-I', '-w', '\n__META__%{http_code}'], url)).code;
const headers = async (url) => splitCurlOutput(await curl(['-I', '-w', '\n__META__%{http_code}'], url)).body;

async function pool(items, worker) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await worker(items[i], i);
      }
    }),
  );
  return out;
}

async function main() {
  const sitemapXml = (await getPage(`${SITE}/sitemap.xml`)).body;
  let urls = parseSitemapLocs(sitemapXml);
  if (urls.length === 0) {
    console.error(`[production-sweep] ✗ sitemap の URL が 0 件（${SITE}/sitemap.xml を取得できていない）＝検査不成立`);
    process.exit(2);
  }
  if (SAMPLE > 0) urls = urls.slice(0, SAMPLE);
  const t0 = Date.now();
  let done = 0;
  const pages = await pool(urls, async (url) => {
    let res = await getPage(url);
    if (res.code === '000') res = await getPage(url); // 一過性の接続失敗は 1 回だけ再試行
    done++;
    if (!JSON_OUT && done % 200 === 0) console.log(`  … ${done}/${urls.length}`);
    return classifyPage(url, res);
  });
  const ogSet = [...new Set(pages.map((p) => p.ogImage).filter(Boolean))];
  const ogImages = await pool(ogSet, async (u) => ({ url: u, code: await headStatus(u) }));
  const headersMissing = missingHeaders(await headers(`${SITE}/`));
  const summary = summarize({ pages, ogImages, headersMissing });
  const elapsed = Math.round((Date.now() - t0) / 1000);

  if (JSON_OUT) {
    console.log(JSON.stringify({ site: SITE, summary, elapsedSec: elapsed, failed: pages.filter((p) => p.level !== 'ok'), ogFailed: ogImages.filter((o) => o.code !== '200') }, null, 2));
  } else {
    console.log(`[production-sweep] ${SITE} sitemap ${urls.length} URL を実検査（${CONCURRENCY} 並列・${elapsed}s）`);
    console.log(`  ページ: ok ${summary.ok} / 異常 ${summary.failed} / 接続失敗 ${summary.unreachable}`);
    console.log(`  og:image: ${summary.ogImages} 件中 非 200 が ${summary.ogFailed} 件`);
    console.log(`  security headers（/）: ${headersMissing.length ? '不足 ' + headersMissing.join(', ') : 'すべて有り'}`);
    for (const p of pages.filter((p) => p.level !== 'ok').slice(0, 40)) console.log(`  [${p.level}] ${p.url}\n      ${p.reasons.join(' / ')}`);
    for (const o of ogImages.filter((o) => o.code !== '200').slice(0, 20)) console.log(`  [og:image ${o.code}] ${o.url}`);
    if (summary.exitCode === 2) console.error(`\n[production-sweep] 検査不成立: 接続失敗 ${summary.unreachable}/${summary.total}（5% 超）`);
    else if (summary.exitCode === 1) console.error(`\n[production-sweep] ✗ 本番に異常あり`);
    else console.log(`\n[production-sweep] ✓ 全 ${summary.total} URL が 200・canonical 自己・<main> あり、og:image ${summary.ogImages} 件 200、ヘッダ完備`);
  }
  process.exit(summary.exitCode);
}

main().catch((e) => {
  console.error('[production-sweep] Fatal:', e?.message || e);
  process.exit(2);
});
