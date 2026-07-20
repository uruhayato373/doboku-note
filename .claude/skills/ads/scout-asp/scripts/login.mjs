/**
 * login.mjs — A8.net メディア管理画面 (media-console.a8.net) に手動ログインして
 * 永続プロファイルに保存する使い捨てスクリプト。
 *
 * A8 の会員 ID / パスワードは env にも保存しない (publish-x と同じ永続プロファイル方式)。
 * 新コンソール (media-console.a8.net) のログインページを直接開き、人間が手動ログイン →
 * /home に到達したら自動検知して graceful に保存 (ctx.close で Cookie flush) → 以降 headless 再利用。
 *
 * ★ A8 は 2024 以降メディア管理画面を media-console.a8.net に刷新済み (旧 pub.a8.net/a8v2 は廃止)。
 *
 * 使い方 (本体リポジトリ ~/doboku-note で実行。worktree 不可 — プロファイルは .local/ で gitignore):
 *   node .claude/skills/ads/scout-asp/scripts/login.mjs
 *
 * 参照: docs/reference/playwright-auth-profiles.md / docs/reference/a8-affiliate-pipeline.md
 */
import { chromium } from "playwright";

const PROFILE_ROOT = "/Users/minamidaisuke/doboku-note";
const PROFILE_DIR = `${PROFILE_ROOT}/.local/playwright-a8-profile`;
// ★A8 の認証はセッション Cookie (揮発性) で、永続プロファイルには保存されない。
//   storageState (セッション Cookie を含む JSON) に捕獲し、a8-browser が起動時に再注入する。
const STATE_PATH = `${PROFILE_ROOT}/.local/playwright-a8-state.json`;
// 会員ページ。未ログインなら A8 が /common/re-authentication (ログインフォーム) にリダイレクトする。
const HOME_URL = "https://media-console.a8.net/home";
const TIMEOUT_MS = 12 * 60 * 1000;

const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false,
  viewport: { width: 1280, height: 900 },
  locale: "ja-JP",
  timezoneId: "Asia/Tokyo",
  args: ["--disable-blink-features=AutomationControlled"],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto(HOME_URL, { waitUntil: "domcontentloaded" });

/** ログイン済み = /home 系に居て re-authentication でない & パスワード欄が無い。 */
async function isLoggedIn() {
  const url = page.url();
  if (/re-authentication|login/i.test(url)) return false;
  if (!/media-console\.a8\.net/.test(url)) return false;
  const hasPw = await page
    .evaluate(() => document.querySelectorAll("input[type=password]").length > 0)
    .catch(() => true);
  return !hasPw;
}

let manualDone = false;
process.stdin.on("data", () => (manualDone = true));

console.log(
  "\nA8.net メディア管理画面 (media-console.a8.net) のログインページを開きました。\n" +
    "会員 ID + パスワードでログインしてください。/home に到達したら自動保存します (最大 12 分)。\n" +
    "先に閉じたい場合はこのターミナルで Enter を押してください。\n",
);

const start = Date.now();
let saved = false;
while (Date.now() - start < TIMEOUT_MS) {
  if (manualDone || (await isLoggedIn())) {
    await page.waitForTimeout(2000); // Cookie 書き込みの猶予
    saved = true;
    break;
  }
  await page.waitForTimeout(2500);
}

// ★ close 前に storageState (セッション Cookie 含む) を JSON に捕獲する。
//   永続プロファイルは session cookie を保存しないため、これが認証再利用の実体。
if (saved) {
  try {
    await ctx.storageState({ path: STATE_PATH });
  } catch (e) {
    console.error("storageState 保存に失敗:", String(e).slice(0, 120));
    saved = false;
  }
}
await ctx.close();
if (saved) {
  console.log("✅ セッションを保存しました:", STATE_PATH);
  process.exit(0);
} else {
  console.error("⏱ タイムアウト。ログインを検知できませんでした。再実行してください。");
  process.exit(1);
}
