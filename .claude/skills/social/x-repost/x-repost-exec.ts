/**
 * x-repost-exec — approved.json の引用リポスト（Quote）を Playwright で実行する。
 *
 * publish-x.ts の入力検証・偽成功ガード・システム Chrome 永続プロファイルを踏襲。
 * ★ X の引用RP セレクタは UI 変更で壊れやすい。初回 / セレクタ更新後は必ず --dry-run で検証する。★
 *
 * 使い方:
 *   npx tsx .claude/skills/social/x-repost/x-repost-exec.ts --dry-run   # 初回必須（投稿せず引用composerまで確認）
 *   npx tsx .claude/skills/social/x-repost/x-repost-exec.ts             # 本番（approved.json を引用RP）
 *
 * 入力: .claude/state/x-repost/approved.json
 *   { "approved": [ { "id": "...", "url": "https://x.com/.../status/...", "comment": "引用コメント本文" }, ... ] }
 * 出力: 成功分を .claude/state/x-repost/reposted-log.json に追記
 *
 * キルスイッチ: .claude/state/x-repost/PAUSED が存在すると即時中止。
 */
import { chromium, type BrowserContext, type Page } from "playwright";
import * as path from "path";
import * as fs from "fs";

const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
// ログインプロファイルはメインチェックアウト固定で共有する（worktree 実行時の再ログイン防止）。
// docs/reference/playwright-auth-profiles.md
const PROFILE_ROOT = "/Users/minamidaisuke/doboku-note";
const PROFILE_DIR = path.join(PROFILE_ROOT, ".local/playwright-x-profile");
const DEBUG_DIR = path.join(PROJECT_ROOT, ".local/playwright-x-debug");
const STATE_DIR = path.join(PROJECT_ROOT, ".claude/state/x-repost");
const CONFIG_PATH = path.join(STATE_DIR, "config.json");
const LOG_PATH = path.join(STATE_DIR, "reposted-log.json");
const APPROVED_PATH = path.join(STATE_DIR, "approved.json");
const PAUSED_PATH = path.join(STATE_DIR, "PAUSED");

const DRY_RUN = process.argv.includes("--dry-run");
const HEADED = process.argv.includes("--headed") || DRY_RUN;

interface Approved { id: string; url: string; comment: string; exam?: string; reason?: string; }

function loadJson<T>(p: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")) as T; } catch { return fallback; }
}

async function saveScreenshot(page: Page, label: string): Promise<void> {
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  try { await page.screenshot({ path: path.join(DEBUG_DIR, `${ts}_${label}.png`), fullPage: true }); } catch { /* ignore */ }
}

// X 重み付き文字数（publish-x と同ロジック）。引用RP は引用カード分 ~23 を別途消費するため余裕を持たせる。
function countXWeighted(text: string): number {
  const t = text.replace(/https?:\/\/\S+/g, "_".repeat(23));
  let w = 0;
  for (const ch of t) w += (ch.codePointAt(0)! <= 0x7f ? 1 : 2);
  return w;
}
const COMMENT_LIMIT = 250; // 280 - 引用カード(~23) - 余白

function appendLog(entry: Approved & { repostedAt: string }): void {
  const log = loadJson<{ reposted: any[]; _comment?: string }>(LOG_PATH, { reposted: [] });
  const handleMatch = entry.url.match(/x\.com\/([A-Za-z0-9_]+)\/status\//);
  const handle = handleMatch ? handleMatch[1] : undefined;
  log.reposted.push({ ...entry, handle });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2) + "\n", "utf-8");
}

async function ensureLogin(page: Page): Promise<boolean> {
  await page.goto("https://x.com/home", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  if (page.url().includes("/login") || page.url().includes("/i/flow/login")) {
    console.error("🚨 X セッション切れ。`npx tsx .tmp/x-login.ts` で再ログインしてください。");
    return false;
  }
  console.log("✅ ログイン済み");
  return true;
}

/** 1 件の引用リポスト */
async function quoteRepost(page: Page, item: Approved, idx: number, total: number): Promise<boolean> {
  console.log(`\n━━━ ${idx + 1}/${total}: ${item.url} ━━━`);
  console.log(`コメント: ${item.comment}`);

  const weighted = countXWeighted(item.comment);
  console.log(`コメント文字数: ${weighted}/${COMMENT_LIMIT}（重み付き・引用カード別枠）`);
  if (weighted > COMMENT_LIMIT) {
    console.error(`🚨 コメント長超過: ${weighted} > ${COMMENT_LIMIT} — スキップ`);
    return false;
  }
  if (weighted === 0) { console.error("🚨 コメント空 — スキップ"); return false; }

  // 元ツイートを開く
  await page.goto(item.url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // 先頭 article（対象ツイート本体）の repost ボタン
  const mainTweet = page.locator('article[data-testid="tweet"]').first();
  try { await mainTweet.waitFor({ state: "visible", timeout: 12000 }); }
  catch { console.error("🚨 元ツイートが表示されません（削除/非公開の可能性）"); await saveScreenshot(page, `tweet-not-found-${item.id}`); return false; }

  const repostBtn = mainTweet.locator('[data-testid="retweet"]').first();
  if ((await repostBtn.count()) === 0) { console.error("🚨 repost ボタンなし"); await saveScreenshot(page, `no-repost-btn-${item.id}`); return false; }
  await repostBtn.click();
  await page.waitForTimeout(1500);

  // ドロップダウンメニューから「引用」を選択
  // ★要 dry-run 検証セレクタ★ — 引用項目は menuitem のテキスト（引用 / Quote）で特定
  const quoteItem = page.locator(
    '[role="menu"] [role="menuitem"]:has-text("引用"), [role="menu"] [role="menuitem"]:has-text("Quote"), [data-testid="quoteTweet"], a[href="/compose/post"]'
  ).first();
  try { await quoteItem.waitFor({ state: "visible", timeout: 6000 }); }
  catch {
    console.error("🚨 引用メニュー項目が見つかりません（UI 変更の可能性）。セレクタ更新が必要。");
    await saveScreenshot(page, `no-quote-item-${item.id}`);
    await page.keyboard.press("Escape").catch(() => {});
    return false;
  }
  await quoteItem.click();
  await page.waitForTimeout(2500);

  // composer の textbox
  const textbox = page.getByRole("textbox").first();
  try { await textbox.waitFor({ state: "visible", timeout: 10000 }); }
  catch { console.error("🚨 引用 composer が開きません"); await saveScreenshot(page, `no-composer-${item.id}`); await page.keyboard.press("Escape").catch(() => {}); return false; }

  // コメント入力（clipboard 経由 → read-back 検証 → fallback。publish-x の偽成功ガード踏襲）
  await textbox.click();
  await page.waitForTimeout(500);
  await page.evaluate(async (text: string) => {
    const item = new ClipboardItem({ "text/plain": new Blob([text], { type: "text/plain" }) });
    await navigator.clipboard.write([item]);
  }, item.comment);
  await page.keyboard.press("ControlOrMeta+v");
  await page.waitForTimeout(1200);

  const readBackLen = async (): Promise<number> => (await textbox.innerText().catch(() => "")).replace(/\s+/g, "").length;
  if ((await readBackLen()) === 0) {
    console.log("⚠️  paste 不発、insertText で再入力");
    await textbox.click(); await page.waitForTimeout(300);
    await page.keyboard.insertText(item.comment);
    await page.waitForTimeout(1200);
  }
  if ((await readBackLen()) === 0) {
    console.error("🚨 コメント入力失敗（textbox 空）— 中止");
    await saveScreenshot(page, `empty-textbox-${item.id}`);
    await page.keyboard.press("Escape").catch(() => {});
    return false;
  }
  console.log("⌨️  コメント入力確認OK");
  await page.waitForTimeout(500);

  if (DRY_RUN) {
    console.log("🧪 dry-run: 引用 composer まで到達、投稿はスキップ");
    await saveScreenshot(page, `dry-run-quote-${item.id}`);
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(800);
    await page.keyboard.press("Escape").catch(() => {});
    return true;
  }

  // 投稿確定（Ctrl+Enter）→ compose クローズ検証（偽成功防止）
  const composeClosed = async (): Promise<boolean> =>
    !(await page.evaluate(() => document.querySelector('[data-testid="tweetTextarea_0"]') !== null)) ||
    !page.url().includes("/compose");
  await textbox.focus();
  await page.waitForTimeout(300);
  await page.keyboard.press("ControlOrMeta+Enter");
  let posted = false;
  for (let i = 0; i < 16; i++) { await page.waitForTimeout(500); if (await composeClosed()) { posted = true; break; } }
  if (!posted) {
    console.log("  Ctrl+Enter 不発、tweetButton DOM クリックを試行");
    const btn = page.getByTestId("tweetButton").first();
    if ((await btn.count()) > 0) {
      await btn.evaluate((el: HTMLElement) => el.click());
      for (let i = 0; i < 8; i++) { await page.waitForTimeout(500); if (await composeClosed()) { posted = true; break; } }
    }
  }
  if (!posted) {
    console.error("🚨 引用RP 失敗（compose が閉じない＝投稿されず）");
    await saveScreenshot(page, `quote-not-posted-${item.id}`);
    return false;
  }

  console.log("✅ 引用リポスト完了");
  appendLog({ ...item, repostedAt: new Date().toISOString() });
  await page.waitForTimeout(2500);
  return true;
}

async function main() {
  if (fs.existsSync(PAUSED_PATH)) {
    console.error("⏸  PAUSED ファイルが存在するため中止（キルスイッチ）。再開するには削除してください。");
    process.exit(3);
  }

  const config = loadJson<any>(CONFIG_PATH, {});
  const maxPerRun: number = config.maxPerRun || 3;
  const minDelay: number = (config.minDelaySec || 45) * 1000;
  const maxDelay: number = (config.maxDelaySec || 210) * 1000;

  const approvedData = loadJson<{ approved: Approved[] }>(APPROVED_PATH, { approved: [] });
  const log = loadJson<{ reposted: { id: string }[] }>(LOG_PATH, { reposted: [] });
  const done = new Set<string>(log.reposted.map((r) => r.id));

  let items = (approvedData.approved || []).filter((a) => a.id && a.url && a.comment && !done.has(a.id));
  if (items.length === 0) { console.log("承認済み候補なし（approved.json が空 or 全て処理済み）。"); return; }
  items = items.slice(0, maxPerRun);
  console.log(`🚀 x-repost exec 開始（${items.length} 件 / ${DRY_RUN ? "DRY-RUN" : "本番"}）`);

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

  const results: { url: string; ok: boolean }[] = [];
  try {
    if (!(await ensureLogin(page))) { await context.close(); process.exit(2); }
    for (let i = 0; i < items.length; i++) {
      // キルスイッチを毎回確認（実行中に止められる）
      if (fs.existsSync(PAUSED_PATH)) { console.error("⏸  PAUSED 検出、以降を中止"); break; }
      const ok = await quoteRepost(page, items[i], i, items.length);
      results.push({ url: items[i].url, ok });
      if (!DRY_RUN && i < items.length - 1) {
        const wait = minDelay + Math.floor(Math.random() * (maxDelay - minDelay));
        console.log(`⏳ 次まで ${Math.round(wait / 1000)} 秒待機（人間的間隔）`);
        await page.waitForTimeout(wait);
      }
    }
  } catch (e) {
    console.error("エラー:", e);
    await saveScreenshot(page, "exec-error");
  } finally {
    await page.waitForTimeout(3000);
    await context.close();
  }

  console.log("\n━━━ 結果 ━━━");
  for (const r of results) console.log(`${r.ok ? "✅" : "❌"} ${r.url}`);
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} 件完了`);
}

main().catch((e) => { console.error(e); process.exit(1); });
