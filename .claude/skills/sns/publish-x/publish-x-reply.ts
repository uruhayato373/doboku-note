/**
 * X リプライ自動投稿（自分の最新ツイートに返信）
 *
 * 使い方:
 *   npx tsx .claude/skills/sns/publish-x/publish-x-reply.ts tweet-01-eco [--dry-run]
 *
 * 設計:
 *   1. /home → SideNav から自分のハンドル取得
 *   2. /<handle> → 固定ツイートを除く最新の original tweet を特定
 *   3. tweet 内の reply ボタンを click → compose ダイアログが開く
 *   4. answer-NN-mgmt.png + reply caption を載せて即時投稿
 *
 * 注意:
 *   - 親 tweet は予約投稿の親が posted されている前提（事前に posted を確認）
 *   - 「自分の最新 = 今日の親」が成立しないと誤爆する。fail-safe で post 直前にキャプション照合
 *
 * 入力:
 *   docs/x-posts/<draft-id>/x/captions/<key>-reply.txt
 *   docs/x-posts/<draft-id>/x/img/answer-<NN>-<mgmt>.png
 */
import { chromium, type BrowserContext, type Page } from "playwright";
import * as path from "path";
import * as fs from "fs";

const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
const PROFILE_DIR = path.join(PROJECT_ROOT, ".tmp/playwright-x-profile");
const DEBUG_DIR = path.join(PROJECT_ROOT, ".tmp/playwright-x-debug");
const LOG_PATH = path.join(PROJECT_ROOT, ".claude/state/sns/x-reply-log.csv");
const DEFAULT_DRAFT = "001-択一1問1答-20問";

let IS_DRY_RUN = false;

async function saveScreenshot(page: Page, key: string, label: string): Promise<void> {
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filepath = path.join(DEBUG_DIR, `${ts}_${key}_${label}.png`);
  try {
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 screenshot: ${filepath}`);
  } catch (e) {
    console.error(`screenshot 失敗: ${e}`);
  }
}

interface ReplyConfig {
  key: string; // tweet-NN-mgmt
  draft: string;
  replyCaptionPath: string;
  answerImagePath: string;
  // 親照合用: main caption の冒頭抜粋（例: "【総監択一クイズ #01】"）
  parentMatch: string;
}

function parseArgs(): ReplyConfig[] {
  const args = process.argv.slice(2);
  let draft = DEFAULT_DRAFT;
  const keys: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--draft") draft = args[++i];
    else if (args[i] === "--dry-run") {
      IS_DRY_RUN = true;
      console.log("🧪 DRY RUN モード: 実投稿せずセレクタ検出まで");
    } else keys.push(args[i]);
  }
  if (keys.length === 0) {
    console.error("使い方: npx tsx publish-x-reply.ts <key> [<key> ...] [--draft <id>] [--dry-run]");
    process.exit(1);
  }
  return keys.map((key) => {
    const baseDir = path.join(PROJECT_ROOT, `docs/x-posts/${draft}/x`);
    const replyCaptionPath = path.join(baseDir, `captions/${key}-reply.txt`);
    const mainCaptionPath = path.join(baseDir, `captions/${key}-main.txt`);
    // answer image: tweet-01-eco → answer-01-eco
    const m = key.match(/^tweet-(\d{2})-(.+)$/);
    if (!m) {
      console.error(`key 形式が不正: ${key}（期待: tweet-NN-mgmt）`);
      process.exit(1);
    }
    const answerImagePath = path.join(baseDir, `img/answer-${m[1]}-${m[2]}.png`);
    if (!fs.existsSync(replyCaptionPath)) {
      console.error(`reply caption が見つかりません: ${replyCaptionPath}`);
      process.exit(1);
    }
    if (!fs.existsSync(answerImagePath)) {
      console.error(`answer 画像が見つかりません: ${answerImagePath}`);
      process.exit(1);
    }
    // parent 照合用に main caption の最初の行（クイズ番号タイトル）を抜く
    const mainFirstLine = fs.existsSync(mainCaptionPath)
      ? fs.readFileSync(mainCaptionPath, "utf-8").split("\n")[0].trim()
      : "";
    return {
      key,
      draft,
      replyCaptionPath,
      answerImagePath,
      parentMatch: mainFirstLine,
    };
  });
}

async function ensureLogin(page: Page): Promise<string> {
  console.log("X.com にアクセスしています...");
  await page.goto("https://x.com/home", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const isLoggedIn = async () => {
    const ind = page.locator('[data-testid="SideNav_AccountSwitcher_Button"]');
    return (await ind.count()) > 0;
  };
  if (!(await isLoggedIn())) {
    console.log("\n⚠️  X.com にログインしてください（最大 5 分）...\n");
    const start = Date.now();
    while (Date.now() - start < 300_000) {
      await page.waitForTimeout(2000);
      if (await isLoggedIn()) break;
    }
    if (!(await isLoggedIn())) throw new Error("ログイン待機タイムアウト");
  }
  console.log("✅ ログイン済み");

  // ハンドル取得: SideNav の Profile Link は /<handle> へ遷移する
  const profileLink = page.locator('[data-testid="AppTabBar_Profile_Link"]');
  await profileLink.waitFor({ state: "visible", timeout: 10000 });
  const href = await profileLink.getAttribute("href");
  if (!href || !href.startsWith("/")) {
    throw new Error(`プロフィール URL を取得できません: ${href}`);
  }
  const handle = href.slice(1); // "uruhayato373"
  console.log(`👤 ハンドル: @${handle}`);
  return handle;
}

async function findLatestOriginalTweet(page: Page, handle: string): Promise<{ url: string; index: number }> {
  await page.goto(`https://x.com/${handle}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);

  // タイムラインの article (data-testid="tweet") を順に走査
  // 固定 = socialContext に "固定" を含む / Retweet = socialContext に "リツイート"/"リポスト"
  const tweets = page.locator('article[data-testid="tweet"]');
  await tweets.first().waitFor({ state: "visible", timeout: 15000 });
  const count = await tweets.count();
  console.log(`📋 timeline tweet 数: ${count}`);

  for (let i = 0; i < Math.min(count, 10); i++) {
    const t = tweets.nth(i);
    const socialCtx = await t.locator('[data-testid="socialContext"]').first().textContent().catch(() => "");
    if (socialCtx && /固定|ピン|リツイート|リポスト|Pinned|Reposted/i.test(socialCtx)) {
      console.log(`  [${i}] skip: ${socialCtx.trim()}`);
      continue;
    }
    // tweet permalink を取得
    const link = await t.locator('a[href*="/status/"]').first().getAttribute("href");
    if (!link) continue;
    const url = link.startsWith("http") ? link : `https://x.com${link}`;
    console.log(`  [${i}] candidate: ${url}`);
    return { url, index: i };
  }
  throw new Error("最新の original tweet が見つかりません");
}

async function publishReply(page: Page, cfg: ReplyConfig, parentUrl: string): Promise<boolean> {
  const replyCaption = fs.readFileSync(cfg.replyCaptionPath, "utf-8").trim();
  console.log(`\n━━━ ${cfg.key} → ${parentUrl} ━━━`);
  console.log(`reply: ${replyCaption.substring(0, 60)}...`);

  await page.goto(parentUrl, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  // 親 tweet テキストを取得して照合（誤爆防止）
  const parentArticle = page.locator('article[data-testid="tweet"]').first();
  const parentText = await parentArticle.locator('[data-testid="tweetText"]').first().textContent().catch(() => "");
  if (cfg.parentMatch && parentText && !parentText.includes(cfg.parentMatch.substring(0, 20))) {
    console.error(`🚨 親 tweet の照合に失敗`);
    console.error(`   期待: ${cfg.parentMatch.substring(0, 50)}`);
    console.error(`   実際: ${(parentText || "").substring(0, 50)}`);
    await saveScreenshot(page, cfg.key, "parent-mismatch");
    return false;
  }
  console.log("✅ 親 tweet 照合 OK");

  // reply icon クリック → inline composer または dialog が開く
  const replyBtn = parentArticle.locator('[data-testid="reply"]').first();
  await replyBtn.waitFor({ state: "visible", timeout: 10000 });
  await replyBtn.click();
  await page.waitForTimeout(2500);

  // textbox 表示待ち（dialog 優先）
  const dialogTextbox = page.locator('[role="dialog"] [role="textbox"]').first();
  const fallbackTextbox = page.getByRole("textbox").first();
  const textbox = (await dialogTextbox.count()) > 0 ? dialogTextbox : fallbackTextbox;
  await textbox.waitFor({ state: "visible", timeout: 10000 });

  // 画像アップロード
  const fileInputCandidates = [
    'input[data-testid="fileInput"]',
    'input[type="file"][accept*="image"]',
    'input[type="file"]',
  ];
  let fileInput = null;
  for (const sel of fileInputCandidates) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) > 0) {
      fileInput = loc;
      break;
    }
  }
  if (!fileInput) {
    console.error("🚨 file input なし");
    await saveScreenshot(page, cfg.key, "file-input-missing");
    return false;
  }
  await fileInput.setInputFiles([cfg.answerImagePath]);
  console.log("📷 answer 画像アップロード中...");
  try {
    await page.locator('[data-testid="attachments"]').waitFor({ state: "visible", timeout: 10000 });
  } catch {
    console.log("⚠️  attachments 検出失敗（投稿は継続）");
  }
  await page.waitForTimeout(2000);

  // テキスト貼り付け
  await textbox.click();
  await page.waitForTimeout(500);
  await page.evaluate(async (text: string) => {
    const item = new ClipboardItem({
      "text/plain": new Blob([text], { type: "text/plain" }),
    });
    await navigator.clipboard.write([item]);
  }, replyCaption);
  await page.keyboard.press("Meta+v");
  await page.waitForTimeout(2000);

  if (IS_DRY_RUN) {
    console.log(`🧪 dry-run: 投稿はスキップ`);
    await saveScreenshot(page, cfg.key, "dry-run-reply");
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(1000);
    await page.keyboard.press("Escape").catch(() => {});
    return true;
  }

  // 投稿（reply は予約せず即時 — tweetButton or tweetButtonInline）
  const postCandidates = [
    page.locator('[data-testid="tweetButtonInline"]'),
    page.locator('[data-testid="tweetButton"]'),
  ];
  let posted = false;
  for (const btn of postCandidates) {
    if ((await btn.count()) > 0) {
      await btn.first().click({ force: true });
      console.log(`✅ reply 投稿: ${cfg.key}`);
      posted = true;
      break;
    }
  }
  if (!posted) {
    console.error("🚨 reply 投稿ボタンなし");
    await saveScreenshot(page, cfg.key, "reply-btn-missing");
    return false;
  }
  await page.waitForTimeout(3000);
  return true;
}

function appendLog(cfg: ReplyConfig, parentUrl: string, success: boolean): void {
  if (IS_DRY_RUN) return;
  const ts = new Date().toISOString();
  const line = `${ts},${cfg.key},${parentUrl},${success ? "posted" : "failed"}\n`;
  if (!fs.existsSync(LOG_PATH)) {
    fs.writeFileSync(LOG_PATH, "logged_at,key,parent_url,status\n");
  }
  fs.appendFileSync(LOG_PATH, line);
}

async function main() {
  const configs = parseArgs();
  console.log(`🚀 X reply スクリプト開始（${configs.length} 件）\n`);

  if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true });

  const context: BrowserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 900 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const page = context.pages()[0] || (await context.newPage());

  try {
    const handle = await ensureLogin(page);
    // 全件で同じ「最新 original」を親と仮定。複数件処理は順次同じ親に reply ではなく、
    // configs.length === 1 が想定。ループでも各 reply 後に最新が更新される
    const results: { key: string; success: boolean }[] = [];
    for (const cfg of configs) {
      const { url } = await findLatestOriginalTweet(page, handle);
      const ok = await publishReply(page, cfg, url);
      results.push({ key: cfg.key, success: ok });
      appendLog(cfg, url, ok);
      await page.waitForTimeout(2000);
    }
    console.log("\n━━━ 結果 ━━━");
    for (const r of results) console.log(`${r.success ? "✅" : "❌"} ${r.key}`);
  } catch (e) {
    console.error("エラー:", e);
  } finally {
    await page.waitForTimeout(5000);
    await context.close();
  }
}

main().catch(console.error);
