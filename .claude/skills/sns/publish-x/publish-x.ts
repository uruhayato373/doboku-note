/**
 * X (Twitter) 予約投稿スクリプト — Playwright 版（doboku-note 移植版）
 *
 * 使い方:
 *   npx tsx .claude/skills/sns/publish-x/publish-x.ts \
 *     tweet-01-eco 2026-04-30T07:00 \
 *     tweet-02-eco 2026-05-01T07:00
 *
 *   --draft <draft-id>  ドラフト ID（デフォルト: 001-択一1問1答-20問）
 *   --immediate         予約ではなく即時投稿（明示指定）
 *   --dry-run           実投稿せずセレクタ検出まで確認（初回必須）
 *
 * 入力ファイル（draft-id 配下）:
 *   docs/x-posts/<draft-id>/x/captions/<key>-main.txt
 *   docs/x-posts/<draft-id>/x/img/<key>.png
 *
 * 出力ログ:
 *   .claude/state/sns/x-publish-log.csv (timestamp,key,scheduled_at,status)
 *
 * 事故履歴（stats47 2026-04-18）:
 *   Sprint 1 Day 2-5 を予約投稿したつもりが 4 件全て即時投稿された。
 *   原因: 予約モード検出に失敗しても「投稿は継続」のフォールバックで
 *         tweetButton を押下 → X UI 的には即時投稿ボタンが作動。
 *   対策: fail-safe 化（予約モード未確認なら Escape で投稿中止）+
 *         dry-run モード追加 + 失敗時 screenshot 保存。
 */
import { chromium, type BrowserContext, type Page } from "playwright";
import * as path from "path";
import * as fs from "fs";

// ─── 設定 ──────────────────────────────────────────
const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
// .local/ は doboku-note では git-tracked（.local/r2/posts/）。Playwright プロファイルは .tmp/ に置く
const PROFILE_DIR = path.join(PROJECT_ROOT, ".tmp/playwright-x-profile");
const DEBUG_DIR = path.join(PROJECT_ROOT, ".tmp/playwright-x-debug");
const LOG_PATH = path.join(PROJECT_ROOT, ".claude/state/sns/x-publish-log.csv");
const DEFAULT_DRAFT = "001-択一1問1答-20問";

let IS_DRY_RUN = false;

async function saveScreenshot(
  page: Page,
  contentKey: string,
  label: string
): Promise<void> {
  if (!fs.existsSync(DEBUG_DIR)) {
    fs.mkdirSync(DEBUG_DIR, { recursive: true });
  }
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filepath = path.join(DEBUG_DIR, `${ts}_${contentKey}_${label}.png`);
  try {
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 screenshot: ${filepath}`);
  } catch (e) {
    console.error(`screenshot 失敗: ${e}`);
  }
}

interface PostConfig {
  contentKey: string;
  draft: string;
  captionPath: string;
  imagePaths: string[];
  scheduledDate: Date | null;
}

// ─── 引数パース ────────────────────────────────────
function parseArgs(): { posts: PostConfig[]; immediate: boolean } {
  const args = process.argv.slice(2);
  let draft = DEFAULT_DRAFT;
  let immediate = false;
  const pairs: { key: string; date: string | null }[] = [];

  let i = 0;
  while (i < args.length) {
    if (args[i] === "--draft") {
      draft = args[++i];
    } else if (args[i] === "--immediate") {
      immediate = true;
    } else if (args[i] === "--dry-run") {
      IS_DRY_RUN = true;
      console.log("🧪 DRY RUN モード: 実投稿はせず、セレクタ検出まで確認");
    } else {
      const key = args[i];
      const dateStr = !immediate && i + 1 < args.length && !args[i + 1].startsWith("-")
        ? args[++i]
        : null;
      pairs.push({ key, date: dateStr });
    }
    i++;
  }

  if (pairs.length === 0) {
    console.error(
      "使い方: npx tsx publish-x.ts <key> <YYYY-MM-DDTHH:MM> [<key> <date> ...] [--draft <draft-id>] [--dry-run]"
    );
    process.exit(1);
  }

  const posts: PostConfig[] = pairs.map(({ key, date }) => {
    const baseDir = path.join(PROJECT_ROOT, `docs/x-posts/${draft}/x`);
    const captionPath = path.join(baseDir, `captions/${key}-main.txt`);
    const imagePath = path.join(baseDir, `img/${key}.png`);

    if (!fs.existsSync(captionPath)) {
      console.error(`caption が見つかりません: ${captionPath}`);
      process.exit(1);
    }
    const imagePaths: string[] = fs.existsSync(imagePath) ? [imagePath] : [];

    return {
      contentKey: key,
      draft,
      captionPath,
      imagePaths,
      scheduledDate: date ? new Date(date + "+09:00") : null,
    };
  });

  return { posts, immediate };
}

// ─── ログイン確認 ──────────────────────────────────
async function ensureLogin(page: Page): Promise<void> {
  console.log("X.com にアクセスしています...");
  await page.goto("https://x.com/home", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // 認証済みの証拠 = SideNav の AccountSwitcher が見える
  // 未認証の場合は URL は /home でも login modal が被さるため URL 判定では不十分
  const isLoggedIn = async (): Promise<boolean> => {
    const indicators = [
      page.locator('[data-testid="SideNav_AccountSwitcher_Button"]'),
      page.locator('[data-testid="AppTabBar_Profile_Link"]'),
      page.locator('[data-testid="SideNav_NewTweet_Button"]'),
    ];
    for (const ind of indicators) {
      try {
        if ((await ind.count()) > 0) return true;
      } catch {
        // ignore
      }
    }
    return false;
  };

  if (await isLoggedIn()) {
    console.log("✅ ログイン済み");
    return;
  }

  console.log(
    "\n⚠️  X.com にログインが必要です。ブラウザでログインしてください。"
  );
  console.log("   ログイン完了後、自動的に続行します（最大 5 分待ちます）...\n");

  const start = Date.now();
  while (Date.now() - start < 300_000) {
    await page.waitForTimeout(2000);
    if (await isLoggedIn()) {
      console.log("✅ ログイン完了！");
      await page.waitForTimeout(2000);
      return;
    }
  }
  throw new Error("ログイン待機タイムアウト（5 分）");
}

// ─── 予約投稿 ──────────────────────────────────────
async function publishPost(
  page: Page,
  post: PostConfig,
  index: number,
  total: number
): Promise<boolean> {
  const caption = fs.readFileSync(post.captionPath, "utf-8").trim();

  console.log(`\n━━━ 投稿 ${index + 1}/${total}: ${post.contentKey} ━━━`);
  if (post.scheduledDate) {
    console.log(
      `予約日時: ${post.scheduledDate.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`
    );
  } else {
    console.log("即時投稿");
  }
  console.log(`テキスト: ${caption.substring(0, 60)}...`);

  await page.goto("https://x.com/compose/post", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(3000);

  const textbox = page.getByRole("textbox").first();
  await textbox.waitFor({ state: "visible", timeout: 15000 });

  // ── 画像アップロード（テキストより先に実行）──
  if (post.imagePaths.length > 0) {
    // file input は hidden で multiple selectors を持つ。複数候補を試す
    const fileInputCandidates = [
      'input[data-testid="fileInput"]',
      'input[type="file"][accept*="image"]',
      'input[type="file"]',
    ];
    let fileInput = null;
    for (const sel of fileInputCandidates) {
      const loc = page.locator(sel).first();
      if (await loc.count() > 0) {
        fileInput = loc;
        console.log(`📷 file input セレクタ: ${sel}`);
        break;
      }
    }
    if (!fileInput) {
      console.error("🚨 file input が見つかりません");
      await saveScreenshot(page, post.contentKey, "file-input-missing");
      return false;
    }
    await fileInput.setInputFiles(post.imagePaths);
    console.log(`📷 画像 ${post.imagePaths.length} 枚をアップロード中...`);
    try {
      await page.locator('[data-testid="attachments"]').waitFor({ state: "visible", timeout: 10000 });
      console.log("📷 画像プレビュー表示確認OK");
    } catch {
      console.log("⚠️  画像プレビューが検出できませんでした（投稿は継続）");
    }
    await page.waitForTimeout(2000);
  }

  // ── テキスト入力（clipboard 経由で日本語対応）──
  await textbox.click();
  await page.waitForTimeout(500);

  await page.evaluate(async (text: string) => {
    const item = new ClipboardItem({
      "text/plain": new Blob([text], { type: "text/plain" }),
    });
    await navigator.clipboard.write([item]);
  }, caption);
  await page.keyboard.press("Meta+v");
  await page.waitForTimeout(2000);

  // ── 予約設定 or 即時投稿 ──
  if (post.scheduledDate) {
    const d = post.scheduledDate;
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear();
    const hour = d.getHours();
    const minute = d.getMinutes();

    // 予約ボタンクリック（dialog scope, DOM-level click）
    const dialogScheduleBtn = page.locator(
      '[role="dialog"] [data-testid="scheduleOption"]'
    );
    const fallbackScheduleBtn = page
      .locator('[data-testid="scheduleOption"]')
      .first();
    const scheduleBtn =
      (await dialogScheduleBtn.count()) > 0
        ? dialogScheduleBtn.first()
        : fallbackScheduleBtn;
    await scheduleBtn.waitFor({ state: "visible", timeout: 10000 });
    await scheduleBtn.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(2500);

    // 日時セレクト設定（role 判定で堅牢化）
    const dialogSelects = page.locator('[role="dialog"] select');
    const allSelects =
      (await dialogSelects.count()) > 0 ? dialogSelects : page.locator("select");
    const selectCount = await allSelects.count();
    if (selectCount < 5) {
      console.error(
        `🚨 日時セレクトが想定(5)未満: ${selectCount} — UI 変更の可能性 (${post.contentKey})`
      );
      await saveScreenshot(page, post.contentKey, "date-selects-missing");
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(1000);
      await page.keyboard.press("Escape").catch(() => {});
      return false;
    }

    type SelectRole = "month" | "day" | "year" | "hour" | "minute";
    const selectMeta: { i: number; role: SelectRole | null }[] = [];
    for (let i = 0; i < selectCount; i++) {
      const opts = await allSelects.nth(i).evaluate((el: HTMLSelectElement) =>
        Array.from(el.options).map((o) => ({ value: o.value, text: o.text }))
      );
      const texts = opts.map((o) => o.text);
      const values = opts.map((o) => o.value).filter((v) => v !== "");
      const maxVal = Math.max(...values.map((v) => Number(v)).filter((n) => !isNaN(n)), 0);
      let role: SelectRole | null = null;
      if (texts.some((t) => t.includes("月")) && maxVal === 12) role = "month";
      else if (texts.some((t) => /^20\d{2}$/.test(t))) role = "year";
      else if (maxVal >= 28 && maxVal <= 31) role = "day";
      else if (maxVal === 23) role = "hour";
      else if (maxVal === 59) role = "minute";
      selectMeta.push({ i, role });
    }

    const findByRole = (role: SelectRole): number => {
      const hit = selectMeta.find((m) => m.role === role);
      return hit ? hit.i : -1;
    };
    const idx = {
      month: findByRole("month"),
      day: findByRole("day"),
      year: findByRole("year"),
      hour: findByRole("hour"),
      minute: findByRole("minute"),
    };
    const missing = Object.entries(idx)
      .filter(([, v]) => v < 0)
      .map(([k]) => k);
    if (missing.length > 0) {
      console.error(
        `🚨 日時セレクトのロール判定失敗 (${missing.join(",")}): ${post.contentKey}`
      );
      console.error("   selectMeta:", JSON.stringify(selectMeta));
      await saveScreenshot(page, post.contentKey, "date-select-role-unknown");
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(1000);
      await page.keyboard.press("Escape").catch(() => {});
      return false;
    }

    await allSelects.nth(idx.month).selectOption({ value: String(month) });
    await page.waitForTimeout(200);
    await allSelects.nth(idx.day).selectOption({ value: String(day) });
    await page.waitForTimeout(200);
    await allSelects.nth(idx.year).selectOption({ value: String(year) });
    await page.waitForTimeout(200);
    await allSelects.nth(idx.hour).selectOption({ value: String(hour) });
    await page.waitForTimeout(200);
    await allSelects.nth(idx.minute).selectOption({ value: String(minute) });
    await page.waitForTimeout(300);

    // 確認ボタン
    const confirmBtn = page.getByTestId("scheduledConfirmationPrimaryAction");
    if ((await confirmBtn.count()) === 0) {
      console.error(`🚨 予約確認ボタンが見つかりません: ${post.contentKey}`);
      await saveScreenshot(page, post.contentKey, "confirm-btn-missing");
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(1000);
      await page.keyboard.press("Escape").catch(() => {});
      return false;
    }
    await confirmBtn.click();
    await page.waitForTimeout(3000);

    // ★★★ FAIL-SAFE: 予約モード検出（即時投稿事故の再発防止）★★★
    const isScheduledMode = async (): Promise<boolean> => {
      const indicators = [
        page.locator('[data-testid="tweetButton"]:has-text("予約設定")'),
        page.locator('[data-testid="tweetButton"]:has-text("Schedule")'),
        page.locator('[data-testid="tweetButton"] span:text-is("予約設定")'),
        page.locator('[data-testid="tweetButton"] span:text-is("Schedule")'),
      ];
      for (const ind of indicators) {
        try {
          if ((await ind.count()) > 0) return true;
        } catch {
          // ignore
        }
      }
      return false;
    };

    let scheduledModeConfirmed = false;
    const confirmStart = Date.now();
    while (Date.now() - confirmStart < 8000) {
      if (await isScheduledMode()) {
        scheduledModeConfirmed = true;
        break;
      }
      await page.waitForTimeout(500);
    }

    if (!scheduledModeConfirmed) {
      console.error(
        `🚨 予約モード未確認、投稿中止（即時投稿を回避）: ${post.contentKey}`
      );
      await saveScreenshot(page, post.contentKey, "schedule-mode-not-confirmed");
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(1000);
      await page.keyboard.press("Escape").catch(() => {});
      return false;
    }

    console.log("📅 予約モード確認OK");

    if (IS_DRY_RUN) {
      console.log(
        `🧪 dry-run: 予約モードまで到達、投稿はスキップ: ${post.contentKey}`
      );
      await saveScreenshot(page, post.contentKey, "dry-run-scheduled-mode");
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(1000);
      await page.keyboard.press("Escape").catch(() => {});
      return true;
    }

    // 予約投稿ボタン
    const postBtn = page.getByTestId("tweetButton").first();
    try {
      await postBtn.click({ timeout: 5000 });
    } catch {
      await postBtn.click({ force: true });
    }
    console.log(`✅ 予約投稿完了: ${post.contentKey}`);
    await page.waitForTimeout(3000);
    return true;
  }

  // ── 即時投稿 ──
  if (IS_DRY_RUN) {
    console.log(
      `🧪 dry-run: 即時投稿モード、投稿はスキップ: ${post.contentKey}`
    );
    await saveScreenshot(page, post.contentKey, "dry-run-immediate-mode");
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(1000);
    return true;
  }
  const postBtn = page.getByTestId("tweetButton").first();
  if ((await postBtn.count()) > 0) {
    await postBtn.click({ force: true });
    console.log(`✅ 即時投稿完了: ${post.contentKey}`);
    await page.waitForTimeout(3000);
    return true;
  }

  console.log("⚠️  投稿ボタンが見つかりません");
  await saveScreenshot(page, post.contentKey, "post-btn-missing");
  return false;
}

// ─── ログ追記 ──────────────────────────────────────
function appendLog(post: PostConfig, success: boolean): void {
  if (IS_DRY_RUN) return;
  const ts = new Date().toISOString();
  const sched = post.scheduledDate
    ? post.scheduledDate.toISOString()
    : "immediate";
  const status = success ? "posted" : "failed";
  const line = `${ts},${post.contentKey},${sched},${status}\n`;
  if (!fs.existsSync(LOG_PATH)) {
    fs.writeFileSync(LOG_PATH, "logged_at,key,scheduled_at,status\n");
  }
  fs.appendFileSync(LOG_PATH, line);
}

// ─── メイン ────────────────────────────────────────
async function main() {
  const { posts, immediate } = parseArgs();

  console.log(`🚀 X ${immediate ? "即時" : "予約"}投稿スクリプトを開始します`);
  console.log(`   対象: ${posts.length} 件\n`);

  if (!fs.existsSync(PROFILE_DIR)) {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  }

  const context: BrowserContext = await chromium.launchPersistentContext(
    PROFILE_DIR,
    {
      headless: false,
      viewport: { width: 1280, height: 900 },
      locale: "ja-JP",
      timezoneId: "Asia/Tokyo",
      args: ["--disable-blink-features=AutomationControlled"],
    }
  );

  const page = context.pages()[0] || (await context.newPage());

  try {
    await ensureLogin(page);

    const results: { key: string; success: boolean }[] = [];
    for (let i = 0; i < posts.length; i++) {
      const success = await publishPost(page, posts[i], i, posts.length);
      results.push({ key: posts[i].contentKey, success });
      appendLog(posts[i], success);
      if (i < posts.length - 1) await page.waitForTimeout(2000);
    }

    console.log("\n━━━ 結果サマリー ━━━");
    for (const r of results) {
      console.log(`${r.success ? "✅" : "❌"} ${r.key}`);
    }
    const ok = results.filter((r) => r.success).length;
    console.log(`\n合計: ${ok}/${results.length} 件完了`);
  } catch (error) {
    console.error("エラー:", error);
  } finally {
    await page.waitForTimeout(5000);
    await context.close();
  }
}

main().catch(console.error);
