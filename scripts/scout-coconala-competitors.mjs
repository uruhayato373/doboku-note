#!/usr/bin/env node
/**
 * scout-coconala-competitors.mjs — ココナラ競合セラーの時系列偵察（read-only）
 * ---------------------------------------------------------------------------
 * .claude/config/coconala-competitors.json の各競合セラーの**出品サービス一覧**を
 * 公開プロフィールページ（coconala.com/users/{id}）から Playwright で取得し、
 * scout-note-competitors と同じ共通 snapshot schema（profile/counts/price/cadence/
 * drift/platformExtra）へ正規化して時系列に落とす。前回比 drift（価格改定/新商品/
 * 撤収）を機械検出する。
 *
 * なぜ Playwright か: プロフィールページのサービスカードはクライアントレンダ
 *   （SSR HTML に価格が出ない・Nuxt devalue 難読化）。coconala-research.mjs と同じ
 *   システム Chrome＋永続プロファイル＋headless で DOM をレンダ後に読む。ログイン不要。
 *
 * 規約・安全弁（coconala-operations.md §2.3・§5）:
 *   - 公開・ログイン不要ページの read-only のみ。書き込み一切なし。
 *   - **低頻度厳守（数ヶ月に1度＝四半期）**。ページ間 2 秒の礼節・同時実行なし。
 *   - 外部誘導しない（本スクリプトは取得のみ）。
 *
 * 使い方:
 *   node scripts/scout-coconala-competitors.mjs            # config 全社を偵察→時系列＋drift
 *   node scripts/scout-coconala-competitors.mjs --headed   # 目視デバッグ
 *   node scripts/scout-coconala-competitors.mjs --handle 2442601   # ad-hoc（履歴汚さない）
 * ---------------------------------------------------------------------------
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = join(ROOT, '.claude/config/coconala-competitors.json');
const STATE_DIR = join(ROOT, '.claude/state/coconala');
const HISTORY_DIR = join(STATE_DIR, 'history');
const LATEST_PATH = join(STATE_DIR, 'competitors-snapshot.json');
const IS_CI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
// CI は Playwright が管理する Chromium と runner の一時 profile を使う。
// ローカルは従来どおり system Chrome + 永続 profile（デバッグ時の再現性を維持）。
const PROFILE = IS_CI
  ? join(process.env.RUNNER_TEMP || join(ROOT, '.tmp'), 'playwright-coconala-profile')
  : join(ROOT, '.local/playwright-coconala-profile');
const PROXY = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';

const argv = process.argv.slice(2);
const HEADED = argv.includes('--headed');
const hi = argv.indexOf('--handle');
const HANDLE_OVERRIDE = hi >= 0 && argv[hi + 1] ? argv[hi + 1] : null;

function priceNum(s) {
  if (!s) return null;
  const m = String(s).match(/([\d,]+)[ \t]*円/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
}
function reviewNum(s) {
  if (!s) return null;
  const m = String(s).match(/\(?\s*([\d,]+)\s*\)?/);
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
}
const median = (arr) => {
  if (arr.length === 0) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
function priceBands(prices) {
  const b = { low: 0, mid: 0, high: 0, premium: 0 }; // ~999 / 1000-2999 / 3000-11999 / 12000+
  for (const p of prices) {
    if (p < 1000) b.low++;
    else if (p < 3000) b.mid++;
    else if (p < 12000) b.high++;
    else b.premium++;
  }
  return b;
}

/** プロフィールページから clean な header 指標（nickname・累計販売実績）だけを取る。
 *  プロフィールの「出品サービス」は推薦カルーセルと同一 DOM 構造で他社品が混入し価格が
 *  汚染されるため、個別サービスの価格/品揃えは profile からは取らない。それらは検索由来で
 *  正確に抽出済みの market-research.json（seller 名一致）から引く（下 servicesFromMarket）。 */
async function scrapeSeller(page, handle) {
  await page.goto(`https://coconala.com/users/${handle}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(2500);
  return await page.evaluate(() => {
    const nick =
      document.querySelector('[class*="userName"], [class*="UserName"], h1')?.innerText?.trim() ?? null;
    const salesM = document.body.innerText.match(/販売実績\s*([\d,]+)/);
    return { nick, totalSalesRaw: salesM ? salesM[1] : null };
  });
}

/** market-research.json（検索由来・正確抽出）から seller 名一致のサービスを引く。
 *  profile の nickname と label/config の label を突き合わせる（正規化して部分一致）。 */
function loadMarketServices() {
  const p = join(ROOT, '.claude/state/coconala/market-research.json');
  if (!existsSync(p)) return [];
  try {
    const j = JSON.parse(readFileSync(p, 'utf-8'));
    const all = [];
    for (const q of j.queries ?? []) for (const s of q.services ?? []) all.push(s);
    return all;
  } catch {
    return [];
  }
}
const normName = (s) => (s || '').normalize('NFKC').replace(/\s+/g, '').replace(/[（(].*$/, '');
function servicesFromMarket(market, names) {
  const targets = names.filter(Boolean).map(normName);
  const byUrl = new Map();
  for (const s of market) {
    const sn = normName(s.seller);
    if (!sn) continue;
    if (targets.some((t) => t && (sn === t || sn.includes(t) || t.includes(sn)))) {
      if (!byUrl.has(s.url)) byUrl.set(s.url, { title: s.title, priceYen: s.priceYen, rating: s.rating, reviews: s.reviews, url: s.url, segment: s.segment });
    }
  }
  return [...byUrl.values()];
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}
function loadPreviousSnapshot(todayFile) {
  let files = [];
  try {
    files = readdirSync(HISTORY_DIR).filter((f) => /^competitors-\d{4}-\d{2}-\d{2}\.json$/.test(f));
  } catch {
    return null;
  }
  const prior = files.filter((f) => f < todayFile).sort();
  if (prior.length === 0) return null;
  try {
    return { file: prior[prior.length - 1], data: JSON.parse(readFileSync(join(HISTORY_DIR, prior[prior.length - 1]), 'utf-8')) };
  } catch {
    return null;
  }
}
function computeDrift(current, previous) {
  if (!previous) return { basis: null, entries: [] };
  const prevBy = new Map((previous.data.competitors ?? []).map((c) => [c.handle, c]));
  const curBy = new Map(current.map((c) => [c.handle, c]));
  const entries = [];
  for (const cur of current) {
    const prev = prevBy.get(cur.handle);
    if (!prev) {
      entries.push({ handle: cur.handle, type: 'new-entrant', detail: '新規追跡対象（前回比較なし）' });
      continue;
    }
    const pa = prev.price ?? {}, ca = cur.price ?? {};
    if (ca.max != null && pa.max != null && ca.max !== pa.max) entries.push({ handle: cur.handle, type: 'price', field: 'max', before: pa.max, after: ca.max, detail: `最高価格 ¥${pa.max}→¥${ca.max}` });
    if (ca.median != null && pa.median != null && ca.median !== pa.median) entries.push({ handle: cur.handle, type: 'price', field: 'median', before: pa.median, after: ca.median, detail: `価格中央値 ¥${pa.median}→¥${ca.median}` });
    const pc = prev.counts?.services ?? 0, cc = cur.counts?.services ?? 0;
    if (cc !== pc) entries.push({ handle: cur.handle, type: cc > pc ? 'new-product' : 'removed', before: pc, after: cc, detail: `出品サービス ${pc}→${cc}件` });
    const ps = prev.platformExtra?.totalSales, cs = cur.platformExtra?.totalSales;
    if (ps != null && cs != null && cs !== ps) entries.push({ handle: cur.handle, type: 'sales', before: ps, after: cs, detail: `累計販売実績 ${ps}→${cs}` });
  }
  for (const prev of previous.data.competitors ?? []) {
    if (!curBy.has(prev.handle)) entries.push({ handle: prev.handle, type: 'dropped', detail: '今回取得なし（config除外/非公開/疎通不可）' });
  }
  return { basis: previous.file, entries };
}
const fmt = (n) => (n == null ? '—' : n.toLocaleString('ja-JP'));

async function main() {
  let competitors;
  if (HANDLE_OVERRIDE) {
    competitors = [{ handle: HANDLE_OVERRIDE }];
  } else {
    competitors = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')).competitors ?? [];
  }
  if (competitors.length === 0) {
    console.error('ERROR: 対象セラーがありません（coconala-competitors.json が空 or --handle 未指定）。');
    process.exit(1);
  }
  const PARTIAL = Boolean(HANDLE_OVERRIDE);

  console.log('=== ココナラ競合偵察（公開プロフィール read-only）===');
  console.log(`対象: ${competitors.length} セラー\n`);

  mkdirSync(STATE_DIR, { recursive: true });
  const launchOptions = {
    headless: !HEADED,
    proxy: PROXY ? { server: PROXY } : undefined,
    ignoreHTTPSErrors: true,
    viewport: { width: 1366, height: 1000 },
    args: ['--disable-blink-features=AutomationControlled'],
    locale: 'ja-JP',
  };
  if (!IS_CI) launchOptions.channel = 'chrome';
  const ctx = await chromium.launchPersistentContext(PROFILE, launchOptions);
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  const market = loadMarketServices();
  const results = [];
  let failed = 0;
  for (const comp of competitors) {
    let scraped;
    try {
      scraped = await scrapeSeller(page, comp.handle);
    } catch (e) {
      scraped = { nick: null, error: e?.message };
    }
    const totalSales = scraped.totalSalesRaw ? reviewNum(scraped.totalSalesRaw) : null;
    // 個別サービス（価格/品揃え）は market-research.json（検索由来・正確）から seller 名一致で引く
    const services = servicesFromMarket(market, [scraped.nick, comp.label]);
    const prices = services.map((s) => s.priceYen).filter((p) => p >= 100);
    const totalReviews = services.reduce((n, s) => n + (s.reviews || 0), 0);

    if ((!scraped.nick && totalSales == null) || scraped.error) {
      failed++;
      console.log(`✗ ${comp.handle}${comp.label ? `（${comp.label}）` : ''}: 取得失敗（${scraped.error || 'profile 取得不可'}）`);
    }

    results.push({
      handle: comp.handle,
      label: comp.label ?? scraped.nick ?? null,
      exams: comp.exams ?? [],
      note: comp.note ?? null,
      profile: { nickname: scraped.nick ?? null },
      counts: { services: services.length, servicesSource: 'market-research.json（土木/技術士 検索由来・関連サービスのみ＝全出品ではない）' },
      price: { min: prices.length ? Math.min(...prices) : null, median: median(prices), max: prices.length ? Math.max(...prices) : null, bands: priceBands(prices) },
      cadence: null, // ココナラは投稿日を公開しない＝更新頻度は取得不可
      platformExtra: { totalSales, totalReviews, avgRating: services.length ? +(services.reduce((n, s) => n + (s.rating || 0), 0) / services.length).toFixed(2) : null },
      services: services.slice(0, 30),
    });

    const r = results[results.length - 1];
    if (!scraped.error && (scraped.nick || services.length)) {
      console.log(`● ${comp.handle}（${r.label}）  ${(r.exams || []).join('/')}`);
      console.log(`   出品 ${r.counts.services}件  価格 ¥${fmt(r.price.min)}〜¥${fmt(r.price.max)}(中央¥${fmt(r.price.median)})  帯[低${r.price.bands.low}/中${r.price.bands.mid}/高${r.price.bands.high}/超${r.price.bands.premium}]`);
      console.log(`   累計販売 ${fmt(totalSales)} / レビュー計 ${fmt(totalReviews)} / 平均★${r.platformExtra.avgRating ?? '—'}\n`);
    }
    await page.waitForTimeout(2000); // 礼節
  }
  await ctx.close();

  const stamp = todayStamp();
  const todayFile = `competitors-${stamp}.json`;
  const previous = PARTIAL ? null : loadPreviousSnapshot(todayFile);
  const drift = computeDrift(results, previous);

  console.log('--- 前回比ドリフト ---');
  if (!previous) console.log(PARTIAL ? '  （--handle 部分実行のため比較・履歴保存なし）' : '  （初回＝比較対象なし。次回から差分検出）');
  else if (drift.entries.length === 0) console.log(`  変化なし（基準: ${drift.basis}）`);
  else { console.log(`  基準: ${drift.basis}`); for (const e of drift.entries) console.log(`  [${e.type}] ${e.handle}: ${e.detail}`); }

  const snapshot = {
    fetchedAt: new Date().toISOString(),
    platform: 'coconala',
    caveat: '累計販売実績(totalSales)/nickname は公開プロフィール header 由来（clean）。個別サービスの価格/品揃えは market-research.json（検索由来・土木/技術士 関連のみ＝全出品でない）。プロフィールの出品カードは推薦カルーセルと同一DOM構造で他社品が混入するため使わない。投稿日は非公開＝cadence取得不可。有料本文は取得不可。',
    driftBasis: drift.basis,
    drift: drift.entries,
    competitors: results,
  };
  writeFileSync(LATEST_PATH, JSON.stringify(snapshot, null, 2), 'utf-8');
  if (!PARTIAL) {
    mkdirSync(HISTORY_DIR, { recursive: true });
    writeFileSync(join(HISTORY_DIR, todayFile), JSON.stringify(snapshot, null, 2), 'utf-8');
    console.log(`\n時系列保存: .claude/state/coconala/history/${todayFile}`);
  }
  console.log(`最新ポインタ: ${LATEST_PATH}`);
  console.log(`完了: ${results.length} セラー（失敗 ${failed}）→ 分析は competitor-analyst --platform coconala`);
  process.exit(failed === results.length ? 1 : 0);
}

main().catch((e) => {
  console.error('[scout-coconala-competitors] ✗', e?.message ?? e);
  process.exit(1);
});
