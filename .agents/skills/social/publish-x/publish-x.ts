/**
 * X (Twitter) 投稿スクリプト（doboku-note 版）— Playwright 永続プロファイル
 *
 * 使い方:
 *   npx tsx .claude/skills/social/publish-x/publish-x.ts <draft> [<date>...] [options]
 *
 * 例:
 *   # 初回 dry-run（必須）
 *   npx tsx ... 004 --tweet 1 2026-05-09T08:00 --dry-run
 *
 *   # 即時投稿（特定ツイート）
 *   npx tsx ... 004 --tweet 1 --immediate
 *
 *   # 5 連続予約投稿（全ツイート順に日時を並べる）
 *   npx tsx ... 004 2026-05-09T08:00 2026-05-10T08:00 2026-05-11T08:00 2026-05-12T08:00 2026-05-13T08:00
 *
 * 引数:
 *   <draft>       docs/sns/x/draft/ 配下のディレクトリ名。先頭番号のみ ("004") でも可
 *   [<date>...]   予約日時 JST (YYYY-MM-DDTHH:MM)。対象ツイート数と一致させる
 *   --tweet N     特定ツイートのみ投稿（1-based。省略時は全ツイート）
 *   --immediate   予約ではなく即時投稿（--tweet と組み合わせ推奨）
 *   --dry-run     実投稿せずセレクタ検出まで確認（初回・セレクタ変更後は必須）
 *
 * ⚠️  初回 / 1 週間以上空いた場合は必ず --dry-run で事前検証すること。
 *      予約モード未確認のまま投稿ボタンを押すと即時投稿が発火する（2026-04-18 事故実績）。
 */
import { chromium, type BrowserContext, type Page } from "playwright";
import * as path from "path";
import * as fs from "fs";

// ─── 設定 ─────────────────────────────────────────────
const PROJECT_ROOT = path.resolve(__dirname, "../../../..");
const DRAFTS_DIR = path.join(PROJECT_ROOT, "docs/sns/x/draft");
// ログインプロファイルはメインチェックアウト固定で共有する（worktree から実行しても再ログイン
// 不要にするため。debug/drafts は worktree ローカルのまま）。.claude/knowledge/reference/playwright-auth-profiles.md
const PROFILE_ROOT = "/Users/minamidaisuke/doboku-note";
const PROFILE_DIR = path.join(PROFILE_ROOT, ".local/playwright-x-profile");
const DEBUG_DIR = path.join(PROJECT_ROOT, ".local/playwright-x-debug");

let IS_DRY_RUN = false;

// ─── screenshot ────────────────────────────────────────
async function saveScreenshot(page: Page, label: string): Promise<void> {
  if (!fs.existsSync(DEBUG_DIR)) fs.mkdirSync(DEBUG_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const filepath = path.join(DEBUG_DIR, `${ts}_${label}.png`);
  try {
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 screenshot: ${filepath}`);
  } catch (e) {
    console.error(`screenshot 失敗: ${e}`);
  }
}

// ─── x.md パーサー ─────────────────────────────────────
interface TweetBlock {
  number: number;    // 1-based
  title: string;     // "定義編" など
  text: string;      // 投稿テキスト（ヘッダ行除く、trim済み）＝スレッド時はヘッド（1本目）
  imagePath: string | null;
  threadParts: string[]; // [thread] マーカー時のみ: "--- リプライ ---" 区切りの2本目以降。
                         // X ネイティブ予約はスレッド非対応（2026-07-14 実機プローブ:
                         // tweetTextarea_1 追加で scheduleOption が aria-disabled=true）。
                         // → 即時投稿は composer で全部組んで一括投稿、予約はヘッドのみ予約し
                         //   リプライは scripts/x-thread-replies.mjs が予約時刻経過後にぶら下げる。
}

function parseTweetMd(draftDir: string): TweetBlock[] {
  const mdPath = path.join(draftDir, "tweets.md");
  if (!fs.existsSync(mdPath)) throw new Error(`tweets.md が見つかりません: ${mdPath}`);

  const raw = fs.readFileSync(mdPath, "utf-8");
  // "## Tweet 01: タイトル" を区切りとして分割
  const blocks = raw.split(/^(?=## Tweet \d+:)/m).filter((b) => b.trim());

  const results: TweetBlock[] = [];
  const imgDir = path.join(draftDir, "img");

  for (const block of blocks) {
    const headMatch = block.match(/^## Tweet (\d+):\s*(.+)/);
    if (!headMatch) continue;

    const num = parseInt(headMatch[1], 10);
    const title = headMatch[2].trim();
    const isThread = /\[thread\]/i.test(headMatch[2]);

    // ヘッダ行を除いた残り。HTML コメント（投稿予定注記等）・末尾 "---" は除去
    const rawBody = block
      .replace(/^## Tweet \d+:.+\n/, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\n---\s*$/, "")
      .replace(/^\n+/, "")
      .trim();

    // [thread] マーカー時: "--- リプライ ---" 区切りでヘッド＋リプライ部に分割。
    // マーカーなしの場合は従来どおりリプライ部を捨てる（レガシー注記互換）。
    let body: string;
    let threadParts: string[] = [];
    if (isThread) {
      const parts = rawBody.split(/^--- リプライ ---$/m).map((p) => p.trim()).filter(Boolean);
      body = parts[0] ?? "";
      threadParts = parts.slice(1);
    } else {
      body = rawBody.replace(/\n--- リプライ ---[\s\S]*/, "").trim();
    }

    // 画像: tweet-{NN}-{*.png} を探す（svg より png 優先）
    let imagePath: string | null = null;
    if (fs.existsSync(imgDir)) {
      const nn = String(num).padStart(2, "0");
      const pngFiles = fs
        .readdirSync(imgDir)
        .filter((f) => f.startsWith(`tweet-${nn}-`) && f.endsWith(".png"))
        .sort();
      if (pngFiles.length > 0) {
        imagePath = path.join(imgDir, pngFiles[0]);
      }
    }

    results.push({ number: num, title, text: body, imagePath, threadParts });
  }

  if (results.length === 0) throw new Error(`ツイートブロックが見つかりません (## Tweet N: 形式を確認): ${mdPath}`);
  return results;
}

// ─── X 文字数カウント（重み付き）─────────────────────────
// X (Twitter) の文字数算出ルール（無料プランの 280 文字制限に対する判定）:
//   - URL: 一律 23 文字（t.co 短縮を仮定）
//   - 日本語等の非 ASCII（U+0080 以降）: 1 文字 = 2 文字としてカウント
//   - ASCII（U+0000-U+007F）: 1 文字 = 1 文字
// 注: 2026-05-25 に Tweet 01 を 315 char で投稿しようとして X UI が silent reject、
//     publish-x.ts は無効ボタンをクリックして false success を返していたため guard 追加
function countXWeighted(text: string): number {
  const urlPattern = /https?:\/\/\S+/g;
  const t = text.replace(urlPattern, "_".repeat(23));
  let weighted = 0;
  for (const ch of t) {
    const code = ch.codePointAt(0)!;
    weighted += code <= 0x7f ? 1 : 2;
  }
  return weighted;
}
const X_FREE_LIMIT = 280;

// ─── draft ディレクトリ解決 ─────────────────────────────
function resolveDraftDir(draftArg: string): string {
  // 完全名 or 数字プレフィックスで検索
  if (fs.existsSync(path.join(DRAFTS_DIR, draftArg))) {
    return path.join(DRAFTS_DIR, draftArg);
  }
  // 先頭の数字部分だけ渡された場合（例: "004"）
  const entries = fs.readdirSync(DRAFTS_DIR);
  const matched = entries.find((e) => e.startsWith(draftArg + "-") || e === draftArg);
  if (matched) return path.join(DRAFTS_DIR, matched);
  throw new Error(`draft が見つかりません: ${draftArg}\n利用可能: ${entries.join(", ")}`);
}

// ─── status.json 更新 ─────────────────────────────────
interface TweetStatus {
  title: string;
  status: "pending" | "scheduled" | "posted";
  scheduled_at?: string | null;
  posted_at?: string | null;
  text?: string; // x-schedule-guard の near-dup 判定用（ビルダー生成分に存在）
  thread?: {
    parts: string[];               // ヘッドにぶら下げるリプライ本文（順番どおり）
    replies_posted_at: string | null; // null = 未投稿（x-thread-replies.mjs の対象）
  };
}

interface StatusJson {
  updated_at: string;
  tweets: Record<string, TweetStatus>;
}

function updateStatus(
  draftDir: string,
  tweets: TweetBlock[],
  tweetNum: number,
  scheduledDate: Date | null
): void {
  const statusPath = path.join(draftDir, "status.json");

  // 既存 status を読むか、全件 pending で初期化
  let data: StatusJson;
  if (fs.existsSync(statusPath)) {
    data = JSON.parse(fs.readFileSync(statusPath, "utf-8")) as StatusJson;
  } else {
    const entries: Record<string, TweetStatus> = {};
    for (const t of tweets) {
      entries[String(t.number)] = { title: t.title, status: "pending", scheduled_at: null, posted_at: null };
    }
    data = { updated_at: "", tweets: entries };
  }

  const nowJst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace("Z", "+09:00");
  const key = String(tweetNum);

  if (scheduledDate) {
    const scheduledJst = new Date(scheduledDate.getTime() + 9 * 60 * 60 * 1000)
      .toISOString()
      .replace("Z", "+09:00");
    data.tweets[key] = { ...data.tweets[key], status: "scheduled", scheduled_at: scheduledJst, posted_at: null };
  } else {
    data.tweets[key] = { ...data.tweets[key], status: "posted", posted_at: nowJst };
  }

  // スレッド記録: 予約＝リプライ未投稿（x-thread-replies.mjs が拾う）/ 即時＝一括投稿済み
  const tb = tweets.find((t) => t.number === tweetNum);
  if (tb && tb.threadParts.length > 0) {
    data.tweets[key].thread = {
      parts: tb.threadParts,
      replies_posted_at: scheduledDate ? null : nowJst,
    };
  }

  data.updated_at = nowJst;
  fs.writeFileSync(statusPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`📝 status.json 更新: Tweet ${tweetNum} → ${scheduledDate ? "scheduled" : "posted"}`);
}

// ─── 引数パース ────────────────────────────────────────
interface PostJob {
  tweet: TweetBlock;
  draftDir: string;
  allTweets: TweetBlock[];
  scheduledDate: Date | null;
}

function parseArgs(): PostJob[] {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0].startsWith("-")) {
    console.error("使い方: npx tsx publish-x.ts <draft> [<date>...] [--tweet N] [--immediate] [--dry-run]");
    process.exit(1);
  }

  const draftArg = args[0];
  let tweetFilter: number | null = null;
  let tweetRange: { from: number; to: number } | null = null;
  let immediate = false;
  const dates: string[] = [];

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--dry-run") {
      IS_DRY_RUN = true;
      console.log("🧪 DRY RUN モード: 実投稿はせず、セレクタ検出まで確認");
    } else if (args[i] === "--immediate") {
      immediate = true;
    } else if (args[i] === "--tweet") {
      tweetFilter = parseInt(args[++i], 10);
    } else if (args[i] === "--tweets") {
      const spec = args[++i];
      const m = spec.match(/^(\d+)-(\d+)$/);
      if (!m) throw new Error(`--tweets は N-M 形式で指定: ${spec}`);
      tweetRange = { from: parseInt(m[1], 10), to: parseInt(m[2], 10) };
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(args[i])) {
      dates.push(args[i]);
    }
  }

  const draftDir = resolveDraftDir(draftArg);
  const allTweets = parseTweetMd(draftDir);
  let tweets = allTweets;
  if (tweetFilter) {
    tweets = allTweets.filter((t) => t.number === tweetFilter);
  } else if (tweetRange) {
    tweets = allTweets.filter(
      (t) => t.number >= tweetRange!.from && t.number <= tweetRange!.to
    );
  }

  if (tweets.length === 0) {
    throw new Error(`指定されたツイートがありません`);
  }

  if (!immediate && dates.length > 0 && dates.length !== tweets.length) {
    throw new Error(
      `日時の数 (${dates.length}) とツイート数 (${tweets.length}) が一致しません`
    );
  }

  return tweets.map((tweet, i) => ({
    tweet,
    draftDir,
    allTweets,
    scheduledDate: immediate || dates.length === 0 ? null : new Date(dates[i] + "+09:00"),
  }));
}

// ─── ログイン確認 ──────────────────────────────────────
async function ensureLogin(page: Page): Promise<void> {
  console.log("X.com にアクセスしています...");
  await page.goto("https://x.com/home", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const url = page.url();
  if (url.includes("/login") || url.includes("/i/flow/login")) {
    console.log("\n⚠️  X.com にログインが必要です。ブラウザでログインしてください。");
    console.log("   ログイン完了後、自動的に続行します...\n");
    await page.waitForURL("**/home", { timeout: 300_000 });
    console.log("✅ ログイン完了！");
    await page.waitForTimeout(2000);
  } else {
    console.log("✅ ログイン済み");
  }
}

// ─── 1ツイート投稿 ────────────────────────────────────
async function publishTweet(page: Page, job: PostJob, index: number, total: number): Promise<boolean> {
  const { tweet, scheduledDate } = job;
  const label = `Tweet ${String(tweet.number).padStart(2, "0")}（${tweet.title}）`;

  console.log(`\n━━━ ${index + 1}/${total}: ${label} ━━━`);
  if (scheduledDate) {
    console.log(`予約日時: ${scheduledDate.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`);
  } else {
    console.log("即時投稿");
  }
  if (tweet.imagePath) console.log(`画像: ${path.basename(tweet.imagePath)}`);
  console.log(`テキスト:\n${tweet.text.substring(0, 80)}...`);

  // 文字数 guard: 280 超なら X UI が投稿ボタンを disable し silent reject になる
  const weighted = countXWeighted(tweet.text);
  console.log(`文字数: ${weighted}/${X_FREE_LIMIT}（重み付き）`);
  if (weighted > X_FREE_LIMIT) {
    console.error(`🚨 文字数オーバー: ${weighted} > ${X_FREE_LIMIT}（${weighted - X_FREE_LIMIT} 文字超過）`);
    console.error(`   X 無料プランの 280 文字制限を超えているため、投稿は中止します`);
    console.error(`   X Premium 利用中なら本 guard をスキップする実装に変更してください`);
    return false;
  }
  for (let p = 0; p < tweet.threadParts.length; p++) {
    const w = countXWeighted(tweet.threadParts[p]);
    console.log(`スレッド${p + 2}本目 文字数: ${w}/${X_FREE_LIMIT}（重み付き）`);
    if (w > X_FREE_LIMIT) {
      console.error(`🚨 スレッド${p + 2}本目が文字数オーバー: ${w} > ${X_FREE_LIMIT} — 投稿を中止します`);
      return false;
    }
  }

  await page.goto("https://x.com/compose/post", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const textbox = page.getByRole("textbox").first();
  await textbox.waitFor({ state: "visible", timeout: 15000 });

  // 画像アップロード（テキスト入力より先に実行）
  if (tweet.imagePath) {
    const fileInput = page.locator('input[data-testid="fileInput"]').first();
    await fileInput.setInputFiles(tweet.imagePath);
    console.log("📷 画像アップロード中...");
    try {
      await page.locator('[data-testid="attachments"]').waitFor({ state: "visible", timeout: 10000 });
      console.log("📷 画像プレビュー確認OK");
    } catch {
      console.log("⚠️  画像プレビューが検出できませんでした（投稿は継続）");
    }
    await page.waitForTimeout(2000);
  }

  // テキスト入力（clipboard 経由で日本語対応）
  await textbox.click();
  await page.waitForTimeout(500);
  await page.evaluate(async (text: string) => {
    const item = new ClipboardItem({
      "text/plain": new Blob([text], { type: "text/plain" }),
    });
    await navigator.clipboard.write([item]);
  }, tweet.text);
  // Windows: Control+V / macOS: Meta+V を Playwright の ControlOrMeta で OS 自動判定
  // 注: 旧実装の "Meta+v" は Windows では Win+V（クリップボードマネージャ起動）になり
  // ペーストされず、textbox 空のまま投稿ボタンが disabled → 投稿失敗していた（2026-05-25 修正）
  await page.keyboard.press("ControlOrMeta+v");
  await page.waitForTimeout(1500);

  // ★ 入力検証 ★ — 2026-05-29 事故再発防止
  // clipboard paste が不発（権限・フォーカス喪失等）だと contenteditable が空のままになり、
  // 予約ボタンが disabled → クリックしても何も起きないのに success を返す「偽成功」が発生する
  // （実際に 9 件が空振り予約ゼロ）。空なら keyboard.insertText で再入力し、
  // それでも空なら投稿を中止する（偽成功を物理的に出さない）。
  const readBackLen = async (): Promise<number> =>
    (await textbox.innerText().catch(() => "")).replace(/\s+/g, "").length;
  if ((await readBackLen()) === 0) {
    console.log("⚠️  clipboard paste 不発、keyboard.insertText で再入力します");
    await textbox.click();
    await page.waitForTimeout(300);
    await page.keyboard.insertText(tweet.text);
    await page.waitForTimeout(1500);
  }
  const typedLen = await readBackLen();
  if (typedLen === 0) {
    console.error(`🚨 本文入力失敗（textbox が空）: ${label} — 投稿を中止します`);
    await saveScreenshot(page, `${label}-empty-textbox`);
    return false;
  }
  console.log(`⌨️  本文入力確認OK（${typedLen} 文字）`);
  await page.waitForTimeout(500);

  // ─── スレッド組成（[thread] 時）───
  // X ネイティブ予約はスレッド非対応（2026-07-14 プローブ: textarea_1 追加で scheduleOption が
  // aria-disabled）。予約時はヘッドのみ予約し、リプライは x-thread-replies.mjs に委ねる。
  // 即時投稿時のみ composer で全部組んで一括投稿する（プローブで textarea_1 追加成功を確認済み）。
  if (tweet.threadParts.length > 0) {
    if (scheduledDate) {
      console.log(`🧵 スレッド ${tweet.threadParts.length} 本のリプライは X 予約非対応のためヘッドのみ予約します`);
      console.log(`   予約時刻の経過後に: node scripts/x-thread-replies.mjs --run`);
    } else {
      for (let p = 0; p < tweet.threadParts.length; p++) {
        const part = tweet.threadParts[p];
        // trusted click 必須（DOM .click() では React onClick 不発 = textarea_1 が出ない。プローブ実証）
        const addBtn = page.locator('[data-testid="addButton"]').first();
        await addBtn.click({ timeout: 10000 });
        const nextBox = page.locator(`[data-testid="tweetTextarea_${p + 1}"]`);
        try {
          await nextBox.waitFor({ state: "visible", timeout: 10000 });
        } catch {
          console.error(`🚨 スレッド ${p + 2} 本目の textarea が出現しません（UI 変更の可能性）— 投稿を中止します`);
          await saveScreenshot(page, `${label}-thread-textarea-${p + 1}-missing`);
          await page.keyboard.press("Escape").catch(() => {});
          return false;
        }
        await nextBox.click();
        await page.waitForTimeout(300);
        await page.keyboard.insertText(part);
        await page.waitForTimeout(800);
        const len = (await nextBox.innerText().catch(() => "")).replace(/\s+/g, "").length;
        if (len === 0) {
          console.error(`🚨 スレッド ${p + 2} 本目の入力失敗（textarea が空）— 投稿を中止します`);
          await saveScreenshot(page, `${label}-thread-part-${p + 2}-empty`);
          await page.keyboard.press("Escape").catch(() => {});
          return false;
        }
        console.log(`🧵 スレッド ${p + 2}/${tweet.threadParts.length + 1} 本目入力OK（${len} 文字）`);
      }
      // 一括投稿前にフォーカスをヘッドへ戻す（Ctrl+Enter は「すべてポスト」）
      await page.locator('[data-testid="tweetTextarea_0"]').click();
      await page.waitForTimeout(300);
    }
  }

  // 予約設定
  if (scheduledDate) {
    const d = scheduledDate;
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear();
    const hour = d.getHours();
    const minute = d.getMinutes();

    // modal dialog 内の scheduleOption に scope（inline composer の誤クリック回避）
    // 画像添付時に pointer event intercept が起きるため DOM レベル .click() を使用
    const dialogScheduleBtn = page.locator('[role="dialog"] [data-testid="scheduleOption"]');
    const fallbackScheduleBtn = page.locator('[data-testid="scheduleOption"]').first();
    const scheduleBtn = (await dialogScheduleBtn.count()) > 0 ? dialogScheduleBtn.first() : fallbackScheduleBtn;
    await scheduleBtn.waitFor({ state: "visible", timeout: 10000 });
    await scheduleBtn.evaluate((el: HTMLElement) => el.click());
    await page.waitForTimeout(2500);

    // date select のロール判定（X UI の options 内容から推定、インデックス順不問）
    const dialogSelects = page.locator('[role="dialog"] select');
    const allSelects = (await dialogSelects.count()) > 0 ? dialogSelects : page.locator("select");
    const selectCount = await allSelects.count();
    if (selectCount < 5) {
      console.error(`🚨 日時セレクトが想定(5)未満: ${selectCount} — UI 変更の可能性`);
      await saveScreenshot(page, `${label}-date-selects-missing`);
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
    const missing = Object.entries(idx).filter(([, v]) => v < 0).map(([k]) => k);
    if (missing.length > 0) {
      console.error(`🚨 日時セレクトのロール判定失敗 (${missing.join(",")}):`);
      console.error("   selectMeta:", JSON.stringify(selectMeta));
      await saveScreenshot(page, `${label}-date-select-role-unknown`);
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

    const confirmBtn = page.getByTestId("scheduledConfirmationPrimaryAction");
    if ((await confirmBtn.count()) === 0) {
      console.error("🚨 予約確認ボタンが見つかりません");
      await saveScreenshot(page, `${label}-confirm-btn-missing`);
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(1000);
      await page.keyboard.press("Escape").catch(() => {});
      return false;
    }
    await confirmBtn.click();
    await page.waitForTimeout(3000);

    // ★★★ FAIL-SAFE: 予約モード検出 ★★★
    // 2026-04-18 事故再発防止: 予約モード未確認なら Escape で中止（即時投稿を絶対に発火させない）
    const isScheduledMode = async (): Promise<boolean> => {
      const indicators = [
        page.locator('[data-testid="tweetButton"]:has-text("予約設定")'),
        page.locator('[data-testid="tweetButton"]:has-text("Schedule")'),
        page.locator('[data-testid="tweetButton"] span:text-is("予約設定")'),
        page.locator('[data-testid="tweetButton"] span:text-is("Schedule")'),
      ];
      for (const ind of indicators) {
        try { if ((await ind.count()) > 0) return true; } catch { /* ignore */ }
      }
      return false;
    };

    let scheduledModeConfirmed = false;
    const start = Date.now();
    while (Date.now() - start < 8000) {
      if (await isScheduledMode()) { scheduledModeConfirmed = true; break; }
      await page.waitForTimeout(500);
    }

    if (!scheduledModeConfirmed) {
      console.error("🚨 予約モード未確認、投稿中止（即時投稿を回避）");
      console.error("   X の UI が変更された可能性。screenshot を確認してセレクタを更新してください。");
      await saveScreenshot(page, `${label}-schedule-mode-not-confirmed`);
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(1000);
      await page.keyboard.press("Escape").catch(() => {});
      return false;
    }

    console.log("📅 予約モード確認OK");

    if (IS_DRY_RUN) {
      console.log(`🧪 dry-run: 予約モードまで到達、投稿はスキップ`);
      await saveScreenshot(page, `${label}-dry-run-scheduled-mode`);
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(1000);
      await page.keyboard.press("Escape").catch(() => {});
      return true;
    }

    // 予約確定 — 2026-05-29 事故再発防止
    // tweetButton.click() は X の React onClick が不発で compose が閉じず、保存されないのに
    // success を返していた（予約モード確認OK でも実際にはキューに入らない）。即時投稿側と同様に
    // Ctrl+Enter（予約モードでは「予約設定」が primary action）で確定し、compose が閉じたことを
    // 必ず検証する。閉じなければ保存失敗とみなして中止（偽成功を物理的に出さない）。
    const composeClosed = async (): Promise<boolean> => {
      const open = await page.evaluate(
        () => document.querySelector('[data-testid="tweetTextarea_0"]') !== null
      );
      return !open || !page.url().startsWith("https://x.com/compose/post");
    };
    await textbox.focus();
    await page.waitForTimeout(300);
    await page.keyboard.press("ControlOrMeta+Enter");
    let scheduled = false;
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(500);
      if (await composeClosed()) { scheduled = true; break; }
    }
    if (!scheduled) {
      console.log("  Ctrl+Enter 不発、予約設定ボタンの DOM クリックを試行...");
      const postBtn = page.getByTestId("tweetButton").first();
      if ((await postBtn.count()) > 0) {
        await postBtn.evaluate((el: HTMLElement) => el.click());
        for (let i = 0; i < 8; i++) {
          await page.waitForTimeout(500);
          if (await composeClosed()) { scheduled = true; break; }
        }
      }
    }
    if (!scheduled) {
      console.error(`🚨 予約確定失敗（compose が閉じない＝キューに保存されず）: ${label}`);
      await saveScreenshot(page, `${label}-schedule-not-saved`);
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(800);
      await page.keyboard.press("Escape").catch(() => {});
      return false;
    }
    console.log(`✅ 予約投稿完了: ${label}`);
    await page.waitForTimeout(3000);
    return true;
  }

  // 即時投稿
  if (IS_DRY_RUN) {
    console.log("🧪 dry-run: 即時投稿モード、投稿はスキップ");
    await saveScreenshot(page, `${label}-dry-run-immediate-mode`);
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(1000);
    return true;
  }

  // 投稿実行: Ctrl+Enter（X 標準ショートカット）
  // 注: 2026-05-25 — tweetButton.click() は click タイムアウト or onClick 不発で投稿失敗。
  //     Ctrl+Enter が最確実（X 公式ショートカット）。
  await textbox.focus();
  await page.waitForTimeout(300);
  await page.keyboard.press("ControlOrMeta+Enter");

  // 投稿成功判定: 以下のいずれかで成功とみなす（最大 8 秒待機）
  //   1. URL が /compose/post から離れた（/home などに navigate）
  //   2. compose dialog の textbox が DOM から消えた
  // 旧実装の問題: 2 秒の固定待機後に textbox 有無だけで判定していたが、X の
  // 投稿後の DOM クリーンアップに時間がかかり偽陽性「compose 残存」を出していた。
  const composedAt = "https://x.com/compose/post";
  let posted = false;
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(500);
    const url = page.url();
    const composeOpen = await page.evaluate(() =>
      document.querySelector('[data-testid="tweetTextarea_0"]') !== null
    );
    if (!url.startsWith(composedAt) || !composeOpen) {
      posted = true;
      break;
    }
  }

  if (!posted) {
    // 8 秒待っても compose が閉じない → button click を最後のフォールバックとして試す
    console.log("  Ctrl+Enter 不発、button click を試行...");
    const postBtn = page.getByTestId("tweetButton").first();
    if ((await postBtn.count()) > 0) {
      await postBtn.evaluate((el: HTMLElement) => el.click());
      await page.waitForTimeout(3000);
    }
    // 再判定
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(500);
      const url = page.url();
      const composeOpen = await page.evaluate(() =>
        document.querySelector('[data-testid="tweetTextarea_0"]') !== null
      );
      if (!url.startsWith(composedAt) || !composeOpen) {
        posted = true;
        break;
      }
    }
  }

  if (!posted) {
    console.error(`🚨 投稿失敗（compose dialog が 11 秒経っても残存）: ${label}`);
    await saveScreenshot(page, `${label}-post-failed`);
    return false;
  }

  console.log(`✅ 即時投稿完了: ${label}`);
  await page.waitForTimeout(2000);
  return true;
}

// ─── メイン ────────────────────────────────────────────
async function main() {
  const jobs = parseArgs();
  const hasSchedule = jobs.some((j) => j.scheduledDate !== null);

  console.log(`🚀 X ${hasSchedule ? "予約" : "即時"}投稿スクリプトを開始します`);
  console.log(`   対象: ${jobs.length} ツイート\n`);

  if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true });

  const context: BrowserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    channel: "chrome",
    viewport: { width: 1280, height: 900 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = context.pages()[0] || (await context.newPage());

  try {
    await ensureLogin(page);

    const results: { label: string; success: boolean }[] = [];
    for (let i = 0; i < jobs.length; i++) {
      const label = `Tweet ${String(jobs[i].tweet.number).padStart(2, "0")}（${jobs[i].tweet.title}）`;
      const success = await publishTweet(page, jobs[i], i, jobs.length);
      results.push({ label, success });
      if (success && !IS_DRY_RUN) {
        updateStatus(jobs[i].draftDir, jobs[i].allTweets, jobs[i].tweet.number, jobs[i].scheduledDate);
      }
      if (i < jobs.length - 1) await page.waitForTimeout(2000);
    }

    console.log("\n━━━ 結果サマリー ━━━");
    for (const r of results) {
      console.log(`${r.success ? "✅" : "❌"} ${r.label}`);
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
