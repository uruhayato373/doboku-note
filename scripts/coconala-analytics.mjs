#!/usr/bin/env node
/**
 * coconala-analytics.mjs — ココナラ「サービス・ブログ分析」を read-only で収集する
 * ---------------------------------------------------------------------------
 * なぜ必要か:
 *   KPI（閲覧数・お気に入り・販売数）は長らく「手で貼る」運用だったが、貼付が続かず
 *   kpi-log.json の weekly は空のままだった（2026-08-17 時点で 0 行）。撤退ライン
 *   （出品4週で S2 受注3件未満）や価格引き上げの判定が、素地が無いまま止まっていた。
 *   本スクリプトは分析画面を機械可読なスナップショットに落とし、kpi-log への追記
 *   （--append-kpi）まで行う。read-only・書き込み操作なし（メモ追加・設定変更はしない）。
 *
 * 方針変更の記録（2026-08-17）:
 *   coconala-operations.md §4 の「自社ダッシュボードはスクレイプしない（手動貼付が正）」を
 *   ユーザー判断で改訂し、**read-only の自動取得を可**とした。受注収集（coconala-orders）と
 *   同じ安全弁（account assert・低頻度・書き込みなし）に揃える。
 *
 * 実機確定（2026-08-17 probe）:
 *   全体      = /mypage/analytics            指標カード .c-analyticsMetricsCard_item ×5
 *               （セラーサクセス表示数 / 閲覧数 / 販売数 / 販売額 / お気に入り数）
 *   サービス別 = /mypage/analytics/{n}       ×4（販売額が無い）。{n} はカタログ serviceUrl
 *               https://coconala.com/services/{n} の数値と**同一**（実測: 4317886）。
 *               画面の「詳細」クリックに頼らず URL 直打ちで採る。
 *   ブログ    = 同一ページ内 .c-blogs（タブ切替なしで DOM に載る）
 *               .c-blogs_numberOfView / _status / _openedAt / _title
 *   期間      = .c-analyticsTerm_periodArea「対象期間：YYYY/MM/DD - YYYY/MM/DD 過去30日間」
 *               サービス側とブログ側で**期間が1日ずれる**ことがあるため別々に採る。
 *
 * 数値の罠（最重要）:
 *   「セラーサクセス 表示数」は**未加入だと `0000` とマスク表示**される。これを 0 として
 *   記録すると「表示数ゼロ」という嘘の実績が残る。マスクは null + masked:true で記録する。
 *   同様に、取得できなかったサービスは 0 ではなく null（欠測）で残し、status を partial にする。
 *
 * 使い方:
 *   node scripts/coconala-analytics.mjs                  # 収集のみ（snapshot 更新）
 *   node scripts/coconala-analytics.mjs --append-kpi     # ＋ kpi-log.json へ週次 upsert
 *   node scripts/coconala-analytics.mjs --no-services    # 全体＋ブログのみ（サービス別を回らない）
 *   node scripts/coconala-analytics.mjs --headless
 *
 * 出力: .claude/state/coconala/analytics-snapshot.json
 * exit: 0=全対象を取得 / 2=1つでも取得失敗（partial・「検査ゼロを PASS と呼ばない」）
 * ---------------------------------------------------------------------------
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  launchContext,
  waitForLogin,
  assertAccount,
  readCatalog,
  sleep,
  ROOT,
} from './lib/coconala-session.mjs';
import { todayJst } from './lib/jst-date.mjs';

const TAG = '[coconala-analytics]';
const HEADLESS = process.argv.includes('--headless');
const WITH_SERVICES = !process.argv.includes('--no-services');
const APPEND_KPI = process.argv.includes('--append-kpi');

const OUT_PATH = join(ROOT, '.claude/state/coconala/analytics-snapshot.json');
const KPI_PATH = join(ROOT, '.claude/state/coconala/kpi-log.json');
const BLOG_DIR = join(ROOT, 'docs/coconala-blog');
const OVERVIEW_URL = 'https://coconala.com/mypage/analytics?ref=menu';

/** 指標ラベル → snapshot のキー */
const METRIC_KEYS = {
  'セラーサクセス 表示数': 'impressions',
  表示数: 'impressions',
  閲覧数: 'views',
  販売数: 'orders',
  販売額: 'salesYen',
  お気に入り数: 'favorites',
};

/* ------------------------------------------------------------------ */
/* ページ内で走る抽出（DOM 依存はここに集約）                          */
/* ------------------------------------------------------------------ */

/** 指標カード・期間・ブログ行を1回の evaluate で採る */
function extractAnalytics() {
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

  const cards = [...document.querySelectorAll('.c-analyticsMetricsCard_item')].map((el) => ({
    label: norm(el.querySelector('.c-analyticsMetricsCard_itemLabel')?.innerText),
    perf: norm(el.querySelector('.c-analyticsMetricsCard_performance')?.innerText),
    classifier: norm(el.querySelector('.c-analyticsMetricsCard_classifier')?.innerText),
    // 未加入指標には鍵アイコンが付く（0000 マスクの機械的な裏取り）
    locked: !!el.querySelector('.c-analyticsMetricsCard_lockIcon'),
  }));

  // 期間表示はサービス側とブログ側で別に描画される（DOM 出現順に採る）
  const periods = [...document.querySelectorAll('.c-analyticsTerm_periodArea')].map((el) => norm(el.innerText));

  const blogs = [...document.querySelectorAll('.c-blogs')].map((el) => ({
    title: norm(el.querySelector('.c-blogs_title')?.innerText),
    kind: norm(el.querySelector('.c-blogs_kind')?.innerText),
    status: norm(el.querySelector('.c-blogs_status')?.innerText),
    openedAtText: norm(el.querySelector('.c-blogs_openedAt')?.innerText),
    viewText: norm(el.querySelector('.c-blogs_numberOfView')?.innerText),
  }));

  return {
    cards,
    periods,
    blogs,
    serviceCards: document.querySelectorAll('.c-services_box').length,
    // サービス別分析ページのタイトル行（取り違え検出に使う）
    detailHeading: norm(document.querySelector('.c-service_box .c-services_overview, .c-service_box')?.innerText).slice(0, 120),
  };
}

/* ------------------------------------------------------------------ */
/* パーサ                                                              */
/* ------------------------------------------------------------------ */

/**
 * "270 回" → 270 / "10,000 円" → 10000 / "0000 回"(マスク) → null
 * マスク判定: 鍵アイコンがある、または数字が3桁以上のゼロ並び（0000）。
 */
export function parseMetricValue(perf, locked) {
  const digits = String(perf || '').replace(/[^\d]/g, '');
  if (!digits) return { value: null, masked: false };
  if (locked || /^0{3,}$/.test(digits)) return { value: null, masked: true };
  return { value: Number(digits), masked: false };
}

/** "対象期間：2026/07/18 - 2026/08/16 過去30日間" → {from,to,label,windowDays} */
export function parsePeriod(text) {
  const s = String(text || '');
  const m = s.match(/(\d{4})\/(\d{2})\/(\d{2})\s*-\s*(\d{4})\/(\d{2})\/(\d{2})/);
  const label = (s.match(/過去\s*\d+\s*[日ヶか]?[月間]*/) || [])[0] || null;
  const win = label && /ヶ月/.test(label) ? Number(label.replace(/\D/g, '')) * 30 : label ? Number(label.replace(/\D/g, '')) : null;
  if (!m) return { from: null, to: null, label, windowDays: win };
  return {
    from: `${m[1]}-${m[2]}-${m[3]}`,
    to: `${m[4]}-${m[5]}-${m[6]}`,
    label,
    windowDays: win,
  };
}

/** "投稿日時：2026/08/17" → "2026-08-17" */
export function parseBlogDate(text) {
  const m = String(text || '').match(/(\d{4})\/(\d{2})\/(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** 指標カード配列 → { impressions, views, orders, salesYen, favorites, masked:[] } */
export function cardsToMetrics(cards) {
  const out = { impressions: null, views: null, orders: null, salesYen: null, favorites: null };
  const masked = [];
  let matched = 0;
  for (const c of cards || []) {
    const key = METRIC_KEYS[c.label];
    if (!key) continue;
    matched++;
    const { value, masked: isMasked } = parseMetricValue(c.perf, c.locked);
    out[key] = value;
    if (isMasked) masked.push(key);
  }
  return { ...out, masked, matchedCards: matched };
}

/** ISO 週初（月曜）を JST 基準で返す。 */
export function weekStart(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = dt.getUTCDay(); // 0=Sun
  const back = dow === 0 ? 6 : dow - 1;
  dt.setUTCDate(dt.getUTCDate() - back);
  return dt.toISOString().slice(0, 10);
}

/** docs/coconala-blog 配下の article.md frontmatter から title → {slug, blogId} を作る */
function readBlogIndex() {
  const idx = [];
  if (!existsSync(BLOG_DIR)) return idx;
  for (const slug of readdirSync(BLOG_DIR)) {
    const p = join(BLOG_DIR, slug, 'article.md');
    if (!existsSync(p)) continue;
    const src = readFileSync(p, 'utf8');
    const fm = src.split(/^---$/m)[1] || '';
    const pick = (k) => ((fm.match(new RegExp(`^${k}:\\s*"?([^"\\n]*)"?`, 'm')) || [, ''])[1] || '').trim();
    idx.push({ slug, title: pick('title'), blogId: pick('blogId'), blogUrl: pick('blogUrl') });
  }
  return idx;
}

/* ------------------------------------------------------------------ */
/* 収集                                                                */
/* ------------------------------------------------------------------ */

async function goto(page, url) {
  for (let i = 0; i < 2; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      try { await page.waitForLoadState('networkidle', { timeout: 20000 }); } catch {}
      await sleep(2500);
      return true;
    } catch {
      if (i === 1) return false;
      await sleep(1500);
    }
  }
  return false;
}

async function main() {
  const catalog = readCatalog();
  const withId = Object.values(catalog)
    .map((s) => ({ ...s, numericId: (String(s.serviceUrl || '').match(/\/services\/(\d+)/) || [])[1] || null }))
    .filter((s) => s.numericId);
  // 分析ページが存在するのは**公開中（listed）**のサービスだけ。アーカイブ済み（paused/retired）は
  // 構造的にページが無いので、これを失敗に数えると**毎回必ず赤いゲート**になり赤が意味を失う。
  // 除外は黙って落とさず skipped として snapshot に残す（no silent caps）。
  const targets = withId.filter((s) => s.status === 'listed');
  const skipped = withId
    .filter((s) => s.status !== 'listed')
    .map((s) => ({ serviceId: s.id, catalogStatus: s.status, pauseReason: s.pauseReason || null, reason: '公開中でないため分析ページが存在しない' }));

  const ctx = await launchContext({ headless: HEADLESS });
  const page = ctx.pages()[0] || (await ctx.newPage());

  const login = await waitForLogin(page, { tag: TAG });
  if (!login.ok) {
    console.error(`${TAG} x ${login.reason}`);
    await ctx.close();
    process.exit(2);
  }
  const acct = await assertAccount(page, { tag: TAG });
  if (!acct.ok) {
    console.error(`${TAG} x アカウント不一致で中断: ${acct.reason}`);
    await ctx.close();
    process.exit(2);
  }

  const scan = [];

  /* --- 1. 全体（全出品サービス累計）＋ブログ --- */
  let totals = null;
  let blogs = [];
  let servicePeriod = null;
  let blogPeriod = null;
  const overviewOk = await goto(page, OVERVIEW_URL);
  if (overviewOk) {
    const raw = await page.evaluate(extractAnalytics);
    totals = cardsToMetrics(raw.cards);
    const periods = (raw.periods || []).map(parsePeriod);
    servicePeriod = periods[0] || null;
    blogPeriod = periods[1] || periods[0] || null;
    blogs = (raw.blogs || []).map((b) => {
      const { value } = parseMetricValue(b.viewText, false);
      return {
        title: b.title,
        kind: b.kind || null,
        status: b.status || null,
        postedOn: parseBlogDate(b.openedAtText),
        views: value,
      };
    });
    scan.push({ key: 'overview', label: '全体', url: OVERVIEW_URL, ok: true, cards: totals.matchedCards, blogs: blogs.length, serviceCards: raw.serviceCards });
    console.log(`${TAG} 全体 指標 ${totals.matchedCards} 種・ブログ ${blogs.length} 件・画面のサービス ${raw.serviceCards} 枚`);
    if (totals.masked.length) console.log(`${TAG}   マスク指標（セラーサクセス未加入）: ${totals.masked.join(', ')} → null 記録`);
  } else {
    scan.push({ key: 'overview', label: '全体', url: OVERVIEW_URL, ok: false, reason: 'ページ取得に失敗' });
    console.error(`${TAG} x 全体: ページ取得に失敗`);
  }

  /* --- 2. サービス別 --- */
  const services = [];
  if (WITH_SERVICES) {
    for (const t of targets) {
      const url = `https://coconala.com/mypage/analytics/${t.numericId}`;
      const ok = await goto(page, url);
      if (!ok) {
        services.push({ serviceId: t.id, numericId: t.numericId, catalogStatus: t.status, ok: false, views: null, orders: null, favorites: null, impressions: null, reason: 'ページ取得に失敗' });
        console.error(`${TAG} x ${t.id}: ページ取得に失敗`);
        continue;
      }
      const raw = await page.evaluate(extractAnalytics);
      const m = cardsToMetrics(raw.cards);
      // 指標カードが1枚も無い＝ページ構造が変わったか権限が無い。0 と混同しないため失敗扱い。
      const got = m.matchedCards > 0;
      services.push({
        serviceId: t.id,
        numericId: t.numericId,
        catalogStatus: t.status,
        title: t.title,
        ok: got,
        impressions: m.impressions,
        views: m.views,
        orders: m.orders,
        favorites: m.favorites,
        masked: m.masked,
        ...(got ? {} : { reason: '指標カードが取得できない（構造変化・権限の疑い）' }),
      });
      console.log(
        `${TAG} ${got ? ' ' : 'x'} ${t.id.padEnd(28)} 閲覧 ${String(m.views ?? '—').padStart(4)} / お気に入り ${String(m.favorites ?? '—').padStart(3)} / 販売 ${String(m.orders ?? '—').padStart(2)}`
      );
    }
    const okCount = services.filter((s) => s.ok).length;
    scan.push({ key: 'services', label: 'サービス別', url: 'https://coconala.com/mypage/analytics/{id}', ok: okCount === targets.length, rows: okCount, expected: targets.length, skipped: skipped.length });
  }

  await ctx.close();

  /* --- 3. スナップショット出力 --- */
  const okScans = scan.filter((s) => s.ok).length;
  const status = okScans === scan.length ? 'ok' : 'partial';

  const snapshot = {
    version: 1,
    fetchedAt: new Date().toISOString(),
    fetchedOnJst: todayJst(),
    status,
    source: 'coconala.com /mypage/analytics（Playwright・read-only・書き込みなし）',
    caveats: [
      '数値は「対象期間」の累計であって週次の増分ではない（既定は過去30日間のローリング）。週次差分として扱わないこと。',
      'セラーサクセス未加入の「表示数」は画面上 0000 とマスクされるため null（masked）で記録する。0 ではない。',
      'データはココナラ側で午前0〜1時頃に更新される。当日分は未確定。',
    ],
    period: { services: servicePeriod, blogs: blogPeriod },
    totals: totals
      ? { impressions: totals.impressions, views: totals.views, orders: totals.orders, salesYen: totals.salesYen, favorites: totals.favorites, masked: totals.masked }
      : null,
    services,
    skipped,
    blogs,
    scan: { steps: scan, ok: okScans, total: scan.length },
  };

  mkdirSync(join(ROOT, '.claude/state/coconala'), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(snapshot, null, 2) + '\n');

  console.log('');
  console.log(
    `${TAG} 対象(listed) ${targets.length} 件 / 取得 ${services.filter((s) => s.ok).length} 件・除外(公開中でない) ${skipped.length} 件・ブログ ${blogs.length} 件 → ${OUT_PATH}`
  );

  /* --- 4. kpi-log へ upsert --- */
  if (APPEND_KPI) {
    const appended = appendKpi(snapshot);
    console.log(`${TAG} kpi-log: weekly ${appended.services} 行 / blogsWeekly ${appended.blogs} 行を upsert（weekOf=${appended.weekOf}）`);
  }

  if (status !== 'ok') {
    console.error(`${TAG} x partial（取得できなかった対象があります）— 件数を「全件」と扱わないこと`);
    process.exit(2);
  }
  console.log(`${TAG} OK: 全対象を取得`);
}

/** snapshot を kpi-log.json へ upsert（同一 weekOf+serviceId は置換＝二重計上しない） */
export function appendKpi(snapshot, kpiPath = KPI_PATH) {
  const kpi = JSON.parse(readFileSync(kpiPath, 'utf8'));
  const asOf = snapshot.period?.services?.to || snapshot.fetchedOnJst || todayJst();
  const weekOf = weekStart(asOf);

  kpi.weekly = kpi.weekly || [];
  kpi.blogsWeekly = kpi.blogsWeekly || [];

  const period = snapshot.period?.services || null;
  let sCount = 0;
  for (const s of snapshot.services || []) {
    if (!s.ok) continue; // 欠測は書かない（0 と混同させない）
    const row = {
      weekOf,
      serviceId: s.serviceId,
      views: s.views ?? null,
      favorites: s.favorites ?? null,
      orders: s.orders ?? null,
      period: period ? { from: period.from, to: period.to } : null,
      windowDays: period?.windowDays ?? null,
      cumulative: true,
      source: 'analytics-auto',
    };
    const i = kpi.weekly.findIndex((r) => r.weekOf === weekOf && r.serviceId === s.serviceId);
    if (i >= 0) kpi.weekly[i] = row; else kpi.weekly.push(row);
    sCount++;
  }

  const blogIdx = readBlogIndex();
  const bPeriod = snapshot.period?.blogs || null;
  let bCount = 0;
  for (const b of snapshot.blogs || []) {
    const hit = blogIdx.find((x) => x.title && b.title && x.title === b.title);
    const row = {
      weekOf,
      slug: hit?.slug || null,
      blogId: hit?.blogId || null,
      title: b.title,
      views: b.views ?? null,
      postedOn: b.postedOn,
      period: bPeriod ? { from: bPeriod.from, to: bPeriod.to } : null,
      windowDays: bPeriod?.windowDays ?? null,
      cumulative: true,
      source: 'analytics-auto',
    };
    const key = hit?.slug || b.title;
    const i = kpi.blogsWeekly.findIndex((r) => r.weekOf === weekOf && (r.slug || r.title) === key);
    if (i >= 0) kpi.blogsWeekly[i] = row; else kpi.blogsWeekly.push(row);
    bCount++;
  }

  kpi.weekly.sort((a, b) => (a.weekOf === b.weekOf ? String(a.serviceId).localeCompare(String(b.serviceId)) : String(a.weekOf).localeCompare(String(b.weekOf))));
  kpi.blogsWeekly.sort((a, b) => (a.weekOf === b.weekOf ? String(a.slug || a.title).localeCompare(String(b.slug || b.title)) : String(a.weekOf).localeCompare(String(b.weekOf))));
  kpi.updatedAt = todayJst();
  kpi.source =
    'ココナラ「サービス・ブログ分析」を npm run coconala-analytics（Playwright・read-only）で収集し、--append-kpi で upsert する。数値は対象期間の累計（既定30日ローリング）であって週次増分ではない。手動貼付も引き続き可。';
  kpi.howToUpdate =
    'npm run coconala-analytics -- --append-kpi → weekly / blogsWeekly を weekOf 単位で upsert → npm run check-coconala-analytics で鮮度・欠測・整合を確認 → /coconala-status で撤退ライン判定。';

  writeFileSync(kpiPath, JSON.stringify(kpi, null, 2) + '\n');
  return { services: sCount, blogs: bCount, weekOf };
}

const isMain = process.argv[1] && process.argv[1].endsWith('coconala-analytics.mjs');
if (isMain) {
  main().catch((e) => {
    console.error(`${TAG} x ${e.message}`);
    process.exit(2);
  });
}
