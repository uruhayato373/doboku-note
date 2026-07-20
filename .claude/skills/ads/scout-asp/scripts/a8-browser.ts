/**
 * a8-browser.ts — A8.net 管理画面の Playwright 操作 (list / import-partnered / scout / apply / check-approval / harvest)。
 *
 * doboku-note 版。publish-x.ts の永続プロファイル方式を踏襲:
 *   - chromium.launchPersistentContext(.local/playwright-a8-profile)
 *   - PROFILE_ROOT はメインチェックアウト固定 (worktree 共有・再ログイン不要)
 *   - isLoggedIn UI 判定 / tryClick 複数セレクタ / saveScreenshot / finally close
 *   - 状態変更 (apply) の前に --dry-run ゲート。isLoggedIn 失敗はカタログに記録し正常終了。
 *
 * 判定はすべてコア (a8-scout-core.mjs) に委譲。ブラウザ層は「操作 + 生データ抽出」のみ。
 * doboku は『転職一本』方針: scout は A8 カテゴリ 09(仕事) のみ (curated categoryCodeToVertical)、
 * register (SSOT 追記) は手キュレーション (src/config/affiliate-creatives.ts) のため harvest は候補出力に留める。
 *
 * ★★ 初回セットアップ (必須) ★★
 *   1. node .claude/skills/ads/scout-asp/scripts/login.mjs  (人間が手動ログイン)
 *   2. npx tsx a8-browser.ts list --dry-run --headed
 *      → A8 の DOM を .local/playwright-a8-debug/ にダンプ (page 構造 + スクショ)。
 *        SELECTORS 定数を実機に合わせて調整する (A8 UI は本コードの推測値のまま動く保証はない)。
 *   3. セレクタ確定後に list (申請済み/承認済みの確認) → import-partnered → (Phase2) scout/apply → harvest。
 *
 * 使い方:
 *   npx tsx a8-browser.ts list [--dry-run] [--headed]              # 申込中(審査待ち)+参加中(承認済み)を確認
 *   npx tsx a8-browser.ts import-partnered                         # 提携中を catalog に approved で取込
 *   npx tsx a8-browser.ts scout [--dry-run] [--limit N]
 *   npx tsx a8-browser.ts apply [--dry-run] [--max N]
 *   npx tsx a8-browser.ts check-approval [--dry-run]
 *   npx tsx a8-browser.ts harvest [--dry-run] [--limit N]
 */
import { chromium, type BrowserContext, type Page } from "playwright";
import * as path from "path";
import * as fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const core = require("../../../../scripts/ads/lib/a8-scout-core.mjs");
const codeCore = require("../../../../scripts/ads/lib/a8-code-core.mjs");
const applyBudget = require("../../../../scripts/ads/check-a8-apply-budget.cjs");

// ─── 設定 ──────────────────────────────────────────
const PROJECT_ROOT = path.resolve(__dirname, "../../../../..");
// ログインプロファイルはメインチェックアウト固定 (docs/reference/playwright-auth-profiles.md)。
const PROFILE_ROOT = "/Users/minamidaisuke/doboku-note";
const PROFILE_DIR = path.join(PROFILE_ROOT, ".local/playwright-a8-profile");
// ★A8 の認証はセッション Cookie で永続プロファイルに残らない。login.mjs が storageState に
//   捕獲した Cookie を起動時に addCookies で再注入する (認証再利用の実体)。
const STATE_PATH = path.join(PROFILE_ROOT, ".local/playwright-a8-state.json");
// ★申請サイト assert: この A8 口座は複数サイト登録 (例: 統計で見る都道府県=stats47 / doboku-note)。
//   申請 (apply) は detail ページの <select name="webSiteId"> を doboku-note に選んでから送る。
//   選べない場合は誤サイト提携を防ぐため申請しない (publish-x / coconala の account assert と同じ思想・2026-07-20)。
const TARGET_SITE = "doboku-note";
const DEBUG_DIR = path.join(PROJECT_ROOT, ".local/playwright-a8-debug");
const CATALOG_PATH = path.join(PROJECT_ROOT, ".claude/state/ads/a8-catalog.json");
const INVENTORY_PATH = path.join(PROJECT_ROOT, ".claude/state/ads/inventory-latest.json");
// doboku の creative SSOT (dedup / placed 判定の突合先)。stats47 の AFFILIATE_ADS[] とは形が違う。
const CREATIVES_PATH = path.join(PROJECT_ROOT, "src/config/affiliate-creatives.ts");
const MATS_PATH = path.join(PROJECT_ROOT, "src/config/affiliate-mats.json");

let IS_DRY_RUN = false;

/**
 * A8 新メディア管理画面 (media-console.a8.net) の URL / セレクタ。stats47 の 2026-07 実機調査で確定した推測値。
 * 旧 pub.a8.net/a8v2/*.do は廃止。UI 刷新時 / 初回は実機ダンプ (.local/playwright-a8-debug/) で再調整する。
 */
const BASE = "https://media-console.a8.net";
const A8 = {
  base: BASE,
  homeUrl: `${BASE}/home`,
  // ログイン再認証にリダイレクトされていない = ログイン済み。
  reAuthPattern: /re-authentication|\/login/i,
  categorySearchUrl: (code: string) => `${BASE}/program/search/category?primaryCategoryCode=${code}`,
  autoContractUrl: `${BASE}/program/search/auto-contract`, // 即時提携 (審査なし)
  partneredListUrl: `${BASE}/program/list/partnered`, // 参加中 (承認済み)
  applyingListUrl: `${BASE}/program/list/applying`, // 申込中 (審査待ち)
  detailNotPartneredUrl: (pid: string) => `${BASE}/program/detail-not-partnered?programId=${pid}`,
  createLinkUrl: (pid: string) => `${BASE}/program/create-link?programId=${pid}`,
  // 検索結果カード = div.pgInner。内部: h3.pgName / p.ecName / div.pgStatus / div.pgDetail の labelInfo+labelValue。
  card: "div.pgInner",
  applyButton: ["button:has-text('プログラムの提携申請をする')", "button.btnLink:has-text('提携申請')"],
  // 規約同意 → 申請確定 (次画面)。
  applyConfirm: [
    "button:has-text('同意して')",
    "button:has-text('提携申請する')",
    "button:has-text('申請する')",
    "button.btnPrimary",
  ],
  showAdLinkButton: ["button:has-text('広告リンクを表示')", "button.btnPrimary:has-text('広告リンク')"],
  adCodeTextarea: ["textarea"],
};

// ─── ヘルパー ──────────────────────────────────────

async function saveScreenshot(page: Page, label: string): Promise<void> {
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const fp = path.join(DEBUG_DIR, `${ts}_${label}.png`);
  try {
    await page.screenshot({ path: fp, fullPage: true });
    console.log(`📸 screenshot: ${fp}`);
  } catch (e) {
    console.error(`screenshot 失敗: ${e}`);
  }
}

/** 初回チューニング用: page の HTML と accessibility 情報を debug に落とす。 */
async function dumpPage(page: Page, label: string): Promise<void> {
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  try {
    const html = await page.content();
    fs.writeFileSync(path.join(DEBUG_DIR, `${ts}_${label}.html`), html, "utf8");
    console.log(`📝 page dump: ${label}.html (セレクタ調整用)`);
  } catch (e) {
    console.error(`page dump 失敗: ${e}`);
  }
  await saveScreenshot(page, label);
}

/** 複数セレクタを順に試し最初にヒットした Locator を返す (無ければ null)。 */
async function tryFind(page: Page, selectors: string[]) {
  for (const sel of selectors) {
    try {
      const loc = page.locator(sel).first();
      if ((await loc.count()) > 0) return loc;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** 複数セレクタで DOM クリック (pointer intercept 回避)。成功で true。 */
async function tryClick(page: Page, selectors: string[]): Promise<boolean> {
  const loc = await tryFind(page, selectors);
  if (!loc) return false;
  try {
    await loc.evaluate((el: HTMLElement) => el.click());
    return true;
  } catch {
    return false;
  }
}

// ─── セッション再注入 ──────────────────────────────
// login.mjs が保存した storageState の Cookie を context に addCookies で戻す。
// A8 の認証セッション Cookie は永続プロファイルに残らないため、これが認証の実体。
async function restoreSession(context: BrowserContext): Promise<boolean> {
  if (!fs.existsSync(STATE_PATH)) {
    console.error(`⚠️  セッション未保存 (${STATE_PATH})。login.mjs でログインしてください。`);
    return false;
  }
  try {
    const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    if (Array.isArray(state.cookies) && state.cookies.length > 0) {
      await context.addCookies(state.cookies);
    }
    return true;
  } catch (e) {
    console.error(`セッション復元に失敗: ${String(e).slice(0, 120)}`);
    return false;
  }
}

// ─── ログイン確認 ──────────────────────────────────
// 現在の URL が re-authentication/login でなく media-console 上で、パスワード欄が無ければログイン済み。
async function isLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();
  if (A8.reAuthPattern.test(url)) return false;
  if (!/media-console\.a8\.net/.test(url)) return false;
  const hasPw = await page
    .evaluate(() => document.querySelectorAll("input[type=password]").length > 0)
    .catch(() => true);
  return !hasPw;
}

// ─── カタログ IO ───────────────────────────────────
type Catalog = { entries: Record<string, any>; updatedAt?: string };

function loadCatalog(): Catalog {
  try {
    return JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  } catch {
    return { entries: {} };
  }
}

function saveCatalog(cat: Catalog): void {
  cat.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(CATALOG_PATH), { recursive: true });
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(cat, null, 2) + "\n", "utf8");
}

function nowIso(): string {
  return new Date().toISOString();
}

/** セッション失効を記録して正常終了 (パイプラインを止めない)。 */
function recordSessionExpired(step: string): void {
  const cat = loadCatalog();
  cat.entries.__session ??= { programId: "__session", status: "candidate", history: [] };
  cat.entries.__session.lastError = { step, error: "session-expired", at: nowIso() };
  saveCatalog(cat);
  console.error(`⚠️  A8 セッション失効 (${step})。login.mjs で再ログインしてください。`);
}

function loadCoverage(): any {
  try {
    return JSON.parse(fs.readFileSync(INVENTORY_PATH, "utf8")).coverage ?? {};
  } catch {
    return {};
  }
}

/**
 * doboku の既存 creative から a8mat トークンを抽出 (dedup 用)。
 * stats47 の affiliate-ads-data.ts (AFFILIATE_ADS[]) とは形が違うため、
 * affiliate-creatives.ts の href / pixelSrc と affiliate-mats.json の mats[].mat を突合する。
 * isDuplicate は htmlContent.includes(`a8mat=<token>`) を見るので、その形で返す。
 */
function loadExistingAds(): Array<{ title: string; htmlContent: string }> {
  const out: Array<{ title: string; htmlContent: string }> = [];
  try {
    const src = fs.readFileSync(CREATIVES_PATH, "utf8");
    for (const m of src.matchAll(/a8mat=([A-Za-z0-9+._%-]+)/g)) {
      out.push({ title: "", htmlContent: `a8mat=${m[1]}` });
    }
  } catch {
    /* creatives 未読でも続行 */
  }
  try {
    const mats = JSON.parse(fs.readFileSync(MATS_PATH, "utf8")).mats ?? [];
    for (const m of mats) {
      if (m?.mat) out.push({ title: m.label ?? "", htmlContent: `a8mat=${m.mat}` });
    }
  } catch {
    /* mats 未読でも続行 */
  }
  return out;
}

/** affiliate-mats.json の登録済み mat 一覧 (list の placed 表示用)。 */
function loadPlacedMats(): Array<{ mat: string; label: string }> {
  try {
    const mats = JSON.parse(fs.readFileSync(MATS_PATH, "utf8")).mats ?? [];
    return mats.filter((m: any) => m?.mat).map((m: any) => ({ mat: m.mat, label: m.label ?? "" }));
  } catch {
    return [];
  }
}

// ─── ページ抽出 ────────────────────────────────────
/** 現在の一覧/検索結果ページの div.pgInner カードから生プログラム配列を抽出。
 *  ★ $$eval コールバック内は名前付き関数を使わない (tsx/esbuild の __name ラップがブラウザ側で未定義になる)。
 *     すべてインライン式で書く。 */
async function scrapeCurrentPage(page: Page): Promise<any[]> {
  return page.$$eval("div.pgInner", (cards) =>
    cards.map((card) => {
      // pgDetail の labelInfo→labelValue を辞書化 (インライン・名前付き関数なし)。
      const detail: Record<string, string> = {};
      for (const d of Array.from(card.querySelectorAll(".pgDetail"))) {
        const label = (d.querySelector(".labelInfo")?.textContent || "").replace(/\s+/g, " ").trim();
        const value = (d.querySelector(".labelValue")?.textContent || "").replace(/\s+/g, " ").trim();
        if (label) detail[label] = value;
      }
      const idHref = card.querySelector("a[href*='programId=']")?.getAttribute("href") || "";
      const programId = (idHref.match(/programId=(s\d+)/) || [])[1] || detail["プログラムID"] || "";
      const cardText = (card.textContent || "").replace(/\s+/g, " ").trim();
      return {
        programId,
        name: (card.querySelector("h3.pgName")?.textContent || "").replace(/\s+/g, " ").trim(),
        company: (card.querySelector("p.ecName")?.textContent || "").replace(/\s+/g, " ").trim(),
        genre: detail["カテゴリ"] || "",
        // 報酬/確定率/EPC は右側 table.tableVertical にありカード全文に含まれる。値は normalizeProgram で正規表現抽出。
        cardText,
        partnered: /提携中/.test(cardText) || !!card.querySelector(".statusAffiliated"),
      };
    }),
  );
}

/** 報酬テキスト "40000円" / "売上の10%" → { rewardType, rewardYen, rewardRatePct }。 */
function parseReward(text: string): {
  rewardType: "fixed" | "rate" | null;
  rewardYen?: number;
  rewardRatePct?: number;
} {
  if (!text) return { rewardType: null };
  const pct = text.match(/([\d.]+)\s*[%％]/);
  if (pct) return { rewardType: "rate", rewardRatePct: Number(pct[1]) };
  const yen = text.match(/([\d,]+)\s*円/);
  if (yen) return { rewardType: "fixed", rewardYen: Number(yen[1].replace(/,/g, "")) };
  return { rewardType: null };
}

/** 生カード → scoreAndRank に渡す形へ正規化。報酬/確定率/EPC はカード全文から正規表現抽出。 */
function normalizeProgram(raw: any, verticalHint?: string): any {
  const t = raw.cardText || "";
  // 「成果報酬 … (円 or %)」を EPC/確定率/関連 の手前まで切り出す。
  const rewardText = (t.match(/成果報酬(.+?)(?:EPC|確定率|関連キーワード|$)/) || [])[1] || "";
  const confirmRatePct = Number((t.match(/確定率\s*([\d.]+)\s*[%％]/) || [])[1]) || 0;
  const epcYen = Number((t.match(/EPC\s*([\d,]+)/) || ["", "0"])[1].replace(/,/g, "")) || 0;
  // genre に A8 カテゴリ + カテゴリコード由来の vertical ヒント + 案件名を載せ resolveVertical の解像度を上げる。
  const genre = [raw.genre, verticalHint, raw.name].filter(Boolean).join(" ");
  return {
    programId: raw.programId,
    name: raw.name || raw.company,
    genre,
    company: raw.company,
    partnered: raw.partnered,
    confirmRatePct,
    epcYen,
    ...parseReward(rewardText),
  };
}

/** 一覧 URL を全ページ巡回して normalizeProgram 済み配列を返す (list / import-partnered 共用)。
 *  ★ programId で dedupe し、新規 programId を1件も足さないページで打ち切る。
 *    A8 の一部タブ (例: /program/list/applying) は `?pageNo=` が効かず毎回同じ1ページを返すため、
 *    単純な「cards<20 で break」だけだと同じ集合を30回集めて件数が水増しされる (2026-07-20 実機で判明・
 *    申込中が uniq 39 → 39×30=1170 に膨張)。real ページネーション (partnered) では新規が尽きるまで集め続ける。 */
async function collectList(page: Page, listUrl: string, step: string): Promise<any[] | null> {
  const all: any[] = [];
  const seen = new Set<string>();
  for (let pageNo = 1; pageNo <= 30; pageNo++) {
    await page.goto(`${listUrl}?pageNo=${pageNo}`, { waitUntil: "networkidle", timeout: 40000 });
    await page.waitForTimeout(2500);
    if (!(await isLoggedIn(page))) {
      recordSessionExpired(step);
      return null;
    }
    const cards = await scrapeCurrentPage(page);
    if (cards.length === 0) break;
    let fresh = 0;
    for (const c of cards) {
      if (!c.programId || seen.has(c.programId)) continue;
      seen.add(c.programId);
      all.push(normalizeProgram(c));
      fresh++;
    }
    if (fresh === 0) break; // pageNo が進まない/最終ページ超過 = 新規なし → 打ち切り (水増し防止)
    if (cards.length < 20) break; // 最終ページ
    await page.waitForTimeout(1200);
  }
  return all;
}

// ─── サブコマンド: list (申請済み/承認済みの確認) ────
// 申込中(審査待ち) と 参加中(承認済み) を両方読み、doboku の配置済み mat と突合して表示する。
// doboku の主目的「申請済みアフィリエイトの承認状態を確認する」を最短で満たす read 中心コマンド。
async function cmdList(page: Page): Promise<void> {
  // 参加中 (承認済み)
  await page.goto(A8.partneredListUrl, { waitUntil: "networkidle", timeout: 40000 });
  await page.waitForTimeout(2500);
  if (!(await isLoggedIn(page))) return recordSessionExpired("list");

  if (IS_DRY_RUN) {
    const n = await page.locator(A8.card).count();
    await dumpPage(page, "list-dryrun");
    console.log(`🧪 dry-run: 参加中一覧で ${n} カード検出。ダンプ (.local/playwright-a8-debug/) を確認してセレクタを調整。`);
    return;
  }

  const partnered = await collectList(page, A8.partneredListUrl, "list");
  if (partnered === null) return; // session expired
  const applying = await collectList(page, A8.applyingListUrl, "list");
  if (applying === null) return;

  const placed = loadPlacedMats();
  const curated = core.loadCurated();

  console.log(`\n━━━ A8 提携状況 (${nowIso().slice(0, 10)}) ━━━`);
  console.log(`\n■ 申込中 (審査待ち): ${applying.length} 件`);
  for (const p of applying) {
    console.log(`   ⏳ ${p.name}  [${p.programId}]`);
  }
  console.log(`\n■ 参加中 (承認済み): ${partnered.length} 件`);
  for (const p of partnered) {
    const v = core.resolveVertical(p, curated) || "-";
    console.log(`   ✅ ${p.name}  [${p.programId}]  vertical=${v}`);
  }
  console.log(`\n■ 現在サイト配置中の mat (affiliate-mats.json): ${placed.length} 件`);
  for (const m of placed) {
    console.log(`   🔗 ${m.label}  (a8mat=${m.mat})`);
  }
  console.log(
    `\n→ 承認済み ${partnered.length} 件のうち未配置は harvest → affiliate-creatives.ts へ手配置の候補。` +
      `\n  (programId ↔ a8mat の対応は harvest が確定する。Phase 3)\n`,
  );

  // 承認済みを catalog に approved で反映 (状態は巻き戻さない)。申込中は記録のみ (状態機械を汚さない)。
  let cat = loadCatalog();
  const withVertical = partnered.map((p) => ({ ...p, vertical: core.resolveVertical(p, curated) }));
  cat = core.upsertApproved(cat, withVertical, { at: nowIso(), note: "list-partnered" });
  // status は状態機械外の "snapshot" にする (candidate/applied 等に混ぜると apply が偽 programId を叩く)。
  cat.entries.__applying = {
    programId: "__applying",
    status: "snapshot",
    note: "list-snapshot (審査待ち・状態機械外の記録)",
    items: applying.map((p) => ({ programId: p.programId, name: p.name })),
    at: nowIso(),
  };
  saveCatalog(cat);
  console.log(`✅ catalog 反映: 承認済み ${partnered.length} 件を approved / 申込中 ${applying.length} 件を snapshot 記録。`);
}

// ─── サブコマンド: import-partnered ────────────────
// A8 で既に提携中 (承認済み) のプログラムを全ページ巡回して catalog に approved で取り込む。
// 申請フローを経ずに harvest → (手)register へ直行できる (既存資産の活用)。
async function cmdImportPartnered(page: Page): Promise<void> {
  const curated = core.loadCurated();
  const existingAds = loadExistingAds();
  const all = await collectList(page, A8.partneredListUrl, "import-partnered");
  if (all === null) return; // session expired
  for (const p of all) {
    p.vertical = core.resolveVertical(p, curated);
    p.alreadyRegistered = core.isDuplicate(p, existingAds); // 既に配置済みなら harvest で skip 対象
  }
  if (all.length === 0) {
    console.log("既存提携が見つかりません (セレクタ or ページ構造を確認)。");
    return;
  }
  const resolved = all.filter((p) => p.vertical).length;
  const alreadyReg = all.filter((p) => p.alreadyRegistered).length;
  let cat = loadCatalog();
  cat = core.upsertApproved(cat, all, { at: nowIso(), note: "existing-partnership" });
  saveCatalog(cat);
  console.log(
    `✅ 既存提携 ${all.length} 件を approved で取り込み (vertical 解決 ${resolved} / 既配置 ${alreadyReg} / 未解決 ${all.length - resolved})`,
  );
}

// ─── サブコマンド: scout ───────────────────────────
async function cmdScout(page: Page, limit: number): Promise<void> {
  const curated = core.loadCurated();
  const codeMap: Record<string, string> = curated.categoryCodeToVertical || {};
  const codes = Object.keys(codeMap);

  // dry-run: 最初のカテゴリだけダンプしてセレクタ健全性を確認。
  if (IS_DRY_RUN) {
    const code = codes[0] || "09";
    await page.goto(A8.categorySearchUrl(code), { waitUntil: "networkidle", timeout: 40000 });
    await page.waitForTimeout(3500);
    if (!(await isLoggedIn(page))) return recordSessionExpired("scout");
    const n = await page.locator(A8.card).count();
    await dumpPage(page, "scout-dryrun");
    console.log(`🧪 dry-run: カテゴリ ${code} で ${n} カード検出。ダンプを確認。`);
    return;
  }

  // 各 vertical カテゴリを巡回してカードを収集 (partnered は除外 = 既提携)。doboku は 09(仕事) のみ。
  const raw: any[] = [];
  for (const code of codes) {
    await page.goto(A8.categorySearchUrl(code), { waitUntil: "networkidle", timeout: 40000 });
    await page.waitForTimeout(3500);
    if (!(await isLoggedIn(page))) return recordSessionExpired("scout");
    const cards = await scrapeCurrentPage(page);
    for (const c of cards) {
      if (c.partnered || !c.programId) continue; // 既提携・ID 不明はスキップ
      raw.push(normalizeProgram(c, codeMap[code]));
    }
    console.log(`  カテゴリ ${code} (${codeMap[code]}): ${cards.length} カード`);
    await page.waitForTimeout(1500 + (code.charCodeAt(1) % 5) * 300); // randomized wait
  }
  console.log(`🔍 A8 から ${raw.length} 未提携プログラムを収集`);
  if (raw.length === 0) {
    await dumpPage(page, "scout-empty");
    console.log("⚠️  0 件。セレクタ不一致の可能性 (ダンプを確認)。");
    return;
  }

  const coverage = loadCoverage();
  const existingAds = loadExistingAds();
  const { candidates, blocked, duplicates } = core.scoreAndRank(raw, { coverage, existingAds, curated });
  const top = candidates.slice(0, Number.isFinite(limit) ? limit : candidates.length);
  let cat = loadCatalog();
  cat = core.upsertCandidates(cat, top, { at: nowIso() });
  saveCatalog(cat);
  console.log(`✅ candidate ${top.length} 件 upsert (blocked ${blocked.length} / dup ${duplicates.length})`);
}

// ─── サブコマンド: apply ───────────────────────────
async function cmdApply(page: Page, max: number): Promise<void> {
  let cat = loadCatalog();
  const candidates = core.entriesByStatus(cat, "candidate");
  if (candidates.length === 0) {
    console.log("candidate なし。先に scout を実行してください。");
    return;
  }
  // 週次申請上限を機械強制。
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  let budget = applyBudget.applyBudget(cat, today);
  console.log(`申請枠: 今週 ${budget.weekCount}/${budget.max} (残 ${budget.remaining})`);

  const wanted = Math.min(candidates.length, budget.remaining, Number.isFinite(max) ? max : Infinity);
  if (wanted <= 0) {
    console.log("🚫 今週の申請枠なし。skip。");
    return;
  }

  // sent = 実際に申請を送信した数 (= 週上限の対象)。skip (既申込/既提携) は送信していないので数えない。
  // ★ runaway 防止: 送信のたびに sent を増やし wanted で必ず break する (成功判定に依存しない)。
  let sent = 0;
  let skipped = 0;
  for (const entry of candidates) {
    if (sent >= wanted) break;
    budget = applyBudget.applyBudget(loadCatalog(), today);
    if (!budget.ok) {
      console.log("🚫 週上限に到達。残りは翌週。");
      break;
    }
    if (IS_DRY_RUN) {
      console.log(`🧪 dry-run apply: ${entry.name} (score ${entry.score?.toFixed(2)})`);
      sent++;
      continue;
    }
    const result = await applyToProgram(page, entry);
    cat = loadCatalog();
    if (result === "applied") {
      cat.entries[entry.programId] = core.transition(cat.entries[entry.programId], "applied", {
        at: nowIso(),
      });
      sent++;
      console.log(`📨 申請送信: ${entry.name}`);
    } else if (result === "skip") {
      // 申請ボタンが無い = 既に申込中/提携中 (今回送信なし)。applied 扱いにするが at 無し = 週上限に数えない。
      cat.entries[entry.programId] = core.transition(cat.entries[entry.programId], "applied", {
        note: "already-on-a8-no-send",
      });
      skipped++;
      console.log(`⏭  既申込/既提携 (送信なし): ${entry.name}`);
    } else {
      cat.entries[entry.programId] = core.transition(cat.entries[entry.programId], "error", {
        at: nowIso(),
        step: "apply",
        error: "apply-error",
      });
      console.log(`❌ 申請エラー: ${entry.name}`);
    }
    saveCatalog(cat);
    await page.waitForTimeout(2000 + Math.floor((page.viewportSize()?.width ?? 1280) % 1500)); // randomized wait
  }
  console.log(`✅ 送信 ${sent} 件 / 既存 skip ${skipped} 件`);
}

/**
 * 提携申請を送る。A8 新コンソールは「プログラムの提携申請をする」ボタンの
 * **1 クリックで申請が確定・送信される** (規約同意の別画面は無い。stats47 実機確認 2026-07-20)。
 * → ボタンを押せた時点で申請済み。成功文言 (提携を申請しました / 提携申請完了 / 提携完了) で追認する。
 * 戻り値: "applied"(送信成功) / "skip"(ボタン無し=既申込/既提携=送信なし) / "error"。
 */
async function applyToProgram(page: Page, entry: any): Promise<"applied" | "skip" | "error"> {
  await page.goto(A8.detailNotPartneredUrl(entry.programId), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  if (!(await isLoggedIn(page))) {
    recordSessionExpired("apply");
    return "error";
  }
  // ★ 申請サイト assert (誤サイト提携の防止)。detail に <select name="webSiteId"> が在れば
  //   TARGET_SITE (doboku-note) を選んでから申請する。doboku-note を選べないなら申請しない (error)。
  const siteSel = page.locator("select[name=webSiteId]");
  if ((await siteSel.count()) > 0) {
    const opts = (await siteSel.locator("option").allTextContents()).map((o) => o.trim());
    if (!opts.includes(TARGET_SITE)) {
      console.error(`❌ webSiteId に "${TARGET_SITE}" が無い (${JSON.stringify(opts)})。誤サイト防止で申請中止: ${entry.name}`);
      await saveScreenshot(page, `apply-site-missing-${entry.programId}`);
      return "error";
    }
    await siteSel.selectOption({ label: TARGET_SITE });
    await page.waitForTimeout(500);
    const selected = await siteSel
      .evaluate((el: HTMLSelectElement) => el.options[el.selectedIndex]?.textContent?.trim() || "")
      .catch(() => "");
    if (selected !== TARGET_SITE) {
      console.error(`❌ 申請サイトを "${TARGET_SITE}" に確定できない (現: "${selected}")。申請中止: ${entry.name}`);
      await saveScreenshot(page, `apply-site-unset-${entry.programId}`);
      return "error";
    }
    console.log(`  🎯 申請サイト = ${TARGET_SITE}`);
  }
  const applyBtn = await tryFind(page, A8.applyButton);
  if (!applyBtn) {
    // 申請ボタンが無い = 既に申込中/提携中 or 対象外。**送信していない**ので skip (error にしない)。
    await saveScreenshot(page, `apply-btn-missing-${entry.programId}`);
    return "skip";
  }
  // ★このクリックで申請が送信される (webSiteId=doboku-note 選択済み)。以降は「送信済み」として扱う。
  await applyBtn.evaluate((el: HTMLElement) => el.click());
  await page.waitForTimeout(2500);
  const done = await page
    .evaluate(() =>
      /提携を申請しました|提携申請完了|提携完了|申込を受け付け/.test(document.body.innerText),
    )
    .catch(() => false);
  // 送信結果のスクショを常時残す (申請サイト=doboku-note の証跡・偽成功検証)。文言未確認でも
  // ボタンは押せている = 送信された可能性が高いので applied 扱い (check-approval が最終追認)。
  await saveScreenshot(page, `apply-result-${done ? "ok" : "unverified"}-${entry.programId}`);
  return "applied";
}

// ─── サブコマンド: check-approval ──────────────────
async function cmdCheckApproval(page: Page): Promise<void> {
  let cat = loadCatalog();
  const applied = core.entriesByStatus(cat, "applied");
  if (applied.length === 0) {
    console.log("applied なし。");
    return;
  }
  await page.goto(A8.partneredListUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  if (!(await isLoggedIn(page))) return recordSessionExpired("check-approval");

  if (IS_DRY_RUN) {
    await dumpPage(page, "check-approval-dryrun");
    console.log(`🧪 dry-run: 参加中プログラム一覧をダンプ (applied ${applied.length} 件を照合予定)。`);
    return;
  }

  // 参加中 (承認済み) プログラムの programId 集合を href から取得 (名前より確実)。
  const partneredIds = new Set(
    await page.$$eval("a[href*='programId=']", (as) =>
      as.map((a) => (a.getAttribute("href")?.match(/programId=(s\d+)/) || [])[1]).filter(Boolean),
    ),
  );
  let approved = 0;
  for (const entry of applied) {
    cat = loadCatalog();
    if (partneredIds.has(entry.programId)) {
      cat.entries[entry.programId] = core.transition(cat.entries[entry.programId], "approved", {
        at: nowIso(),
      });
      approved++;
      console.log(`✅ 承認: ${entry.name}`);
      saveCatalog(cat);
    }
    // 参加中一覧に無いものは applied のまま (翌週再走査)。rejected の自動判定は A8 の
    // 「却下」表示 UI を確認してから (誤って rejected にしない)。
  }
  console.log(`✅ ${approved}/${applied.length} 件が承認済みに昇格`);
}

// ─── サブコマンド: harvest ─────────────────────────
async function cmdHarvest(page: Page, limit: number): Promise<void> {
  let cat = loadCatalog();
  // approved のうち未 harvest を対象 (doboku は件数が少ないため select 精選は省略)。既 harvested/registered は除外。
  const approved = core
    .entriesByStatus(cat, "approved")
    .filter((e: any) => !e.adDraft)
    .slice(0, Number.isFinite(limit) ? limit : undefined);
  if (approved.length === 0) {
    console.log("harvest 対象 (approved かつ未 harvest) なし。先に list / import-partnered を実行。");
    return;
  }
  // ログイン確認は fetchAdCode が createLink (media-console) 上で毎回行う。

  let harvested = 0;
  for (const entry of approved) {
    if (IS_DRY_RUN) {
      console.log(`🧪 dry-run harvest: ${entry.name}`);
      continue;
    }
    const code = await fetchAdCode(page, entry);
    cat = loadCatalog();
    if (!code) {
      cat.entries[entry.programId] = core.transition(cat.entries[entry.programId], "error", {
        at: nowIso(),
        step: "harvest",
        error: "no-ad-code",
      });
      saveCatalog(cat);
      continue;
    }
    const parsed = codeCore.parseA8Code(code);
    if (!parsed.ok) {
      // non-canonical サイズ等は harvest 失敗として error 記録 (text 素材を別途探すのは将来拡張)。
      cat.entries[entry.programId] = core.transition(cat.entries[entry.programId], "error", {
        at: nowIso(),
        step: "harvest",
        error: parsed.error,
      });
      saveCatalog(cat);
      console.log(`⚠️  parse 失敗 (${parsed.error}): ${entry.name}`);
      continue;
    }
    // doboku creative 候補を entry に添付。vertical 未解決なら pending-vertical、解決済みは harvested。
    const draft = buildCreativeDraft(entry, parsed.fields, parsed.a8mat);
    cat.entries[entry.programId].adDraft = draft;
    const nextStatus = entry.vertical ? "harvested" : "pending-vertical";
    cat.entries[entry.programId] = core.transition(cat.entries[entry.programId], nextStatus, {
      at: nowIso(),
    });
    saveCatalog(cat);
    harvested++;
    console.log(`📥 harvest: ${entry.name} → ${nextStatus}  (a8mat=${parsed.a8mat})`);
  }
  console.log(
    `✅ ${harvested} 件 harvest。affiliate-creatives.ts への確定配置は手判断 (カニバリ/1ページ1ピクセル/vertical セグメント)。`,
  );
}

async function fetchAdCode(page: Page, entry: any): Promise<string | null> {
  // 広告リンク作成ページ → 「広告リンクを表示」→ 広告コード textarea を取得。
  await page.goto(A8.createLinkUrl(entry.programId), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  if (!(await isLoggedIn(page))) {
    recordSessionExpired("harvest");
    return null;
  }
  // 広告コードは「広告リンクを表示」クリックで textarea に出現する。
  await tryClick(page, A8.showAdLinkButton);
  await page.waitForTimeout(2000);
  // 表示された全 textarea の A8 コードを収集し、canonical バナー優先・無ければ text を選ぶ。
  // 多くの A8 案件は canonical 300×250 を提供せず旧規格サイズ + text のみ。
  // 非 canonical バナーで harvest を失敗させないため、parseA8Code が ok になるコードだけ採る。
  const codes: string[] = await page.$$eval("textarea", (tas) =>
    tas.map((t) => (t as HTMLTextAreaElement).value).filter((v) => /px\.a8\.net\/svt\/ejp/.test(v)),
  );
  if (codes.length === 0) {
    await saveScreenshot(page, `ad-code-missing-${entry.programId}`);
    return null;
  }
  let banner: string | null = null;
  let text: string | null = null;
  for (const c of codes) {
    const p = codeCore.parseA8Code(c);
    if (!p.ok) continue; // 非 canonical バナー等はスキップ
    if (p.fields.adType === "banner" && !banner) banner = c;
    else if (p.fields.adType === "text" && !text) text = c;
  }
  return banner ?? text ?? null; // canonical バナー優先、無ければ text
}

/** parsed fields → doboku の creative 候補 (affiliate-creatives.ts SidebarAdCreative 形 + mats 追記案)。 */
function buildCreativeDraft(entry: any, fields: any, a8mat: string | null): any {
  const nameSlug = String(entry.name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const slug = nameSlug || String(entry.programId || "prog").replace(/[^a-z0-9]/gi, "");
  return {
    a8mat,
    vertical: entry.vertical ?? null,
    adType: fields.adType,
    // affiliate-creatives.ts の SidebarAdCreative 形 (手で貼る用)。
    creative: {
      href: fields.htmlContent, // px.a8.net/svt/ejp?a8mat=...
      imageSrc: fields.imageUrl, // www*.a8.net/svt/bgt?...  (banner のみ)
      pixelSrc: fields.trackingPixelUrl, // www*.a8.net/0.gif?a8mat=...
      alt: entry.name,
      width: fields.width,
      height: fields.height,
    },
    // affiliate-mats.json allowlist 追記案。
    matEntry: {
      mat: a8mat,
      program: slug,
      label: entry.name,
      surfaces: ["sidebar"],
      definedIn: "src/config/affiliate-creatives.ts",
      expiresAt: null,
    },
  };
}

// ─── メイン ────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  IS_DRY_RUN = args.includes("--dry-run");
  const numAfter = (flag: string, def: number) => {
    const i = args.indexOf(flag);
    return i >= 0 ? Number(args[i + 1]) : def;
  };
  const limit = numAfter("--limit", Infinity);
  const max = numAfter("--max", Infinity);

  if (!["list", "scout", "apply", "check-approval", "harvest", "import-partnered"].includes(cmd)) {
    console.error(
      "使い方: npx tsx a8-browser.ts <list|import-partnered|scout|apply|check-approval|harvest> [--dry-run] [--headed] [--limit N] [--max N]",
    );
    process.exit(1);
  }
  if (IS_DRY_RUN) console.log("🧪 DRY RUN モード");

  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const context: BrowserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: !args.includes("--headed"),
    viewport: { width: 1280, height: 900 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = context.pages()[0] || (await context.newPage());
  await restoreSession(context);

  try {
    if (cmd === "list") await cmdList(page);
    else if (cmd === "import-partnered") await cmdImportPartnered(page);
    else if (cmd === "scout") await cmdScout(page, limit);
    else if (cmd === "apply") await cmdApply(page, max);
    else if (cmd === "check-approval") await cmdCheckApproval(page);
    else if (cmd === "harvest") await cmdHarvest(page, limit);
  } catch (e) {
    console.error("エラー:", e);
    await saveScreenshot(page, `error-${cmd}`);
  } finally {
    await page.waitForTimeout(2000);
    await context.close();
  }
}

main().catch(console.error);
