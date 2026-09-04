/**
 * x-repost-discover — X 検索で「技術士総監 / 1級・2級土木施工管理」の高エンゲージ
 * ツイートを収集し、リポスト候補 JSON を出力する（LLM 不使用・純 Playwright）。
 *
 * publish-x.ts と同じ永続プロファイル / システム Chrome を使う（X のボット判定回避）。
 *
 * 使い方:
 *   npx tsx .claude/skills/social/x-repost/x-repost-discover.ts            # 候補収集
 *   npx tsx .claude/skills/social/x-repost/x-repost-discover.ts --interactive  # 初回ログイン込み
 *   npx tsx .claude/skills/social/x-repost/x-repost-discover.ts --headed   # ブラウザ表示
 *
 * 出力: .claude/state/x-repost/candidates.json
 *
 * 前提:
 *   1. システム Chrome がインストール済み（publish-x と同条件）
 *   2. 初回ログイン済み（共通 auth resolver が返す X 専用プロファイルを使用）
 *   3. config.json の ownHandle が設定済み
 */
import { chromium, type BrowserContext, type Page } from "playwright";
import * as path from "path";
import * as fs from "fs";
import { resolveProfileDir } from "../../../../scripts/lib/playwright-auth-profile.mjs";

const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
const PROFILE_DIR = resolveProfileDir("x", { cwd: PROJECT_ROOT, repoRoot: PROJECT_ROOT });
const DEBUG_DIR = path.join(PROJECT_ROOT, ".local/playwright-x-debug");
const STATE_DIR = path.join(PROJECT_ROOT, ".claude/state/x-repost");
const CONFIG_PATH = path.join(STATE_DIR, "config.json");
const LOG_PATH = path.join(STATE_DIR, "reposted-log.json");
const OUT_PATH = path.join(STATE_DIR, "candidates.json");

const INTERACTIVE = process.argv.includes("--interactive");
const HEADED = process.argv.includes("--headed") || INTERACTIVE;

interface Candidate {
  id: string;
  url: string;
  handle: string;
  text: string;
  likes: number;
  retweets: number;
  replies: number;
  exam: string;
  query: string;
  postedAt: string | null;
  scrapedAt: string;
}

function loadJson<T>(p: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")) as T; } catch { return fallback; }
}

async function saveScreenshot(page: Page, label: string): Promise<void> {
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  try { await page.screenshot({ path: path.join(DEBUG_DIR, `${ts}_${label}.png`), fullPage: true }); } catch { /* ignore */ }
}

/** "1,234 件のいいね" / "1.2K likes" 等から数値を抽出 */
function parseCount(s: string | null): number {
  if (!s) return 0;
  const m = s.replace(/,/g, "").match(/([\d.]+)\s*([KMkm万千]?)/);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  const u = m[2].toUpperCase();
  if (u === "K" || u === "千") n *= 1000;
  else if (u === "M") n *= 1_000_000;
  else if (u === "万") n *= 10_000;
  return Math.round(n);
}

async function ensureLogin(page: Page): Promise<boolean> {
  await page.goto("https://x.com/home", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const url = page.url();
  if (url.includes("/login") || url.includes("/i/flow/login")) {
    if (!INTERACTIVE) {
      console.error("🚨 X セッション切れ。`npx tsx .tmp/x-login.ts` で再ログインするか --interactive を付けて実行してください。");
      return false;
    }
    console.log("⚠️  ログインしてください。完了後自動継続します...");
    await page.waitForURL("**/home", { timeout: 300_000 });
    console.log("✅ ログイン完了");
    await page.waitForTimeout(2000);
  } else {
    console.log("✅ ログイン済み");
  }
  return true;
}

/** 1 クエリ分の検索 → 候補スクレイプ */
async function searchQuery(
  page: Page,
  exam: string,
  q: string,
  minFaves: number,
  ownHandle: string,
  blockHandles: Set<string>,
  bannedKeywords: string[],
  seenIds: Set<string>,
  cooledHandles: Set<string>,
  perQueryLimit: number
): Promise<Candidate[]> {
  const fullQ = `${q} min_faves:${minFaves} -filter:replies -filter:nativeretweets lang:ja`;
  const searchUrl = `https://x.com/search?q=${encodeURIComponent(fullQ)}&src=typed_query&f=live`;
  console.log(`\n🔍 検索: ${fullQ}`);
  await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);

  try {
    await page.locator('article[data-testid="tweet"]').first().waitFor({ state: "visible", timeout: 12000 });
  } catch {
    console.log("  （該当ツイートなし or 読み込み失敗）");
    await saveScreenshot(page, `search-empty-${exam}`);
    return [];
  }

  const found: Candidate[] = [];
  const localSeen = new Set<string>();
  const scrapedAt = new Date().toISOString();

  for (let scroll = 0; scroll < 6 && found.length < perQueryLimit; scroll++) {
    const articles = page.locator('article[data-testid="tweet"]');
    const count = await articles.count();
    for (let i = 0; i < count && found.length < perQueryLimit; i++) {
      const art = articles.nth(i);
      try {
        // status URL → id / handle
        const href = await art.locator('a[href*="/status/"]').first().getAttribute("href").catch(() => null);
        if (!href) continue;
        const m = href.match(/^\/([A-Za-z0-9_]+)\/status\/(\d+)/);
        if (!m) continue;
        const handle = m[1];
        const id = m[2];
        if (localSeen.has(id) || seenIds.has(id)) continue;
        localSeen.add(id);

        if (handle.toLowerCase() === ownHandle.toLowerCase()) continue;        // 自投稿除外
        if (blockHandles.has(handle.toLowerCase())) continue;                  // blocklist 除外
        if (cooledHandles.has(handle.toLowerCase())) continue;                 // ハンドルクールダウン除外

        const text = (await art.locator('[data-testid="tweetText"]').first().innerText().catch(() => "")).trim();
        if (!text || text.length < 10) continue;
        if (bannedKeywords.some((kw) => text.includes(kw))) continue;          // 禁止語除外

        const likeLabel = await art.locator('[data-testid="like"]').first().getAttribute("aria-label").catch(() => null);
        const rtLabel = await art.locator('[data-testid="retweet"]').first().getAttribute("aria-label").catch(() => null);
        const replyLabel = await art.locator('[data-testid="reply"]').first().getAttribute("aria-label").catch(() => null);
        const postedAt = await art.locator("time").first().getAttribute("datetime").catch(() => null);

        found.push({
          id,
          url: `https://x.com/${handle}/status/${id}`,
          handle,
          text,
          likes: parseCount(likeLabel),
          retweets: parseCount(rtLabel),
          replies: parseCount(replyLabel),
          exam,
          query: q,
          postedAt,
          scrapedAt,
        });
      } catch { /* スキップ */ }
    }
    await page.mouse.wheel(0, 2400);
    await page.waitForTimeout(2000);
  }

  console.log(`  → ${found.length} 件収集`);
  return found;
}

async function main() {
  const config = loadJson<any>(CONFIG_PATH, null);
  if (!config) { console.error(`🚨 config.json が読めません: ${CONFIG_PATH}`); process.exit(1); }
  const ownHandle: string = (config.ownHandle || "").replace(/^@/, "");
  if (!ownHandle) {
    console.error("🚨 config.json の ownHandle が未設定です。自投稿リポストを防ぐため必須。@抜きハンドルを設定してください。");
    process.exit(1);
  }

  const log = loadJson<{ reposted: { id: string; url?: string; repostedAt?: string }[] }>(LOG_PATH, { reposted: [] });
  const seenIds = new Set<string>(log.reposted.map((r) => r.id));
  const blockHandles = new Set<string>((config.blocklist?.handles || []).map((h: string) => h.replace(/^@/, "").toLowerCase()));
  const bannedKeywords: string[] = config.blocklist?.bannedKeywords || [];
  const maxCandidates: number = config.maxCandidates || 40;
  const perQueryLimit = Math.max(5, Math.ceil(maxCandidates / Math.max(1, config.queries.length)));

  // ハンドルクールダウン: 直近 N 日にリポストした相手は候補から除外
  const handleCooldownDays: number = config.handleCooldownDays ?? 14;
  const cooldownMs = handleCooldownDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const cooledHandles = new Set<string>();
  for (const r of log.reposted) {
    if (!r.repostedAt || !r.url) continue;
    if (now - new Date(r.repostedAt).getTime() < cooldownMs) {
      const m = r.url.match(/x\.com\/([A-Za-z0-9_]+)\/status\//);
      if (m) cooledHandles.add(m[1].toLowerCase());
    }
  }

  console.log(`🚀 x-repost discover 開始（own=@${ownHandle}, 既リポスト ${seenIds.size} 件除外, ハンドルCD ${cooledHandles.size} 件除外）`);

  if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true });
  const context: BrowserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: !HEADED,
    channel: "chrome",
    viewport: { width: 1280, height: 900 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = context.pages()[0] || (await context.newPage());

  const all: Candidate[] = [];
  try {
    if (!(await ensureLogin(page))) { await context.close(); process.exit(2); }

    const globalSeen = new Set<string>(seenIds);
    for (const { exam, q, minFaves } of config.queries) {
      const got = await searchQuery(page, exam, q, minFaves ?? 8, ownHandle, blockHandles, bannedKeywords, globalSeen, cooledHandles, perQueryLimit);
      for (const c of got) { if (!globalSeen.has(c.id)) { globalSeen.add(c.id); all.push(c); } }
      await page.waitForTimeout(1500 + Math.floor(Math.random() * 2000));
    }
  } catch (e) {
    console.error("エラー:", e);
    await saveScreenshot(page, "discover-error");
  } finally {
    await context.close();
  }

  // エンゲージメント順（likes 優先、tie は retweets）
  all.sort((a, b) => b.likes - a.likes || b.retweets - a.retweets);
  const out = all.slice(0, maxCandidates);

  fs.writeFileSync(
    OUT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), count: out.length, candidates: out }, null, 2) + "\n",
    "utf-8"
  );
  console.log(`\n✅ ${out.length} 件を ${path.relative(PROJECT_ROOT, OUT_PATH)} に出力`);
  if (out.length === 0) console.log("   候補ゼロ。minFaves を下げるか queries を見直してください。");
}

main().catch((e) => { console.error(e); process.exit(1); });
