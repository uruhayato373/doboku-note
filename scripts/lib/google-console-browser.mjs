/**
 * google-console-browser.mjs — GSC/GA4 Playwright 共通ヘルパー（ローカル専用）
 * ---------------------------------------------------------------------------
 * 永続 Chrome プロファイルの起動・対象プロパティ assert・ダウンロード・
 * UI 変更時の debug artifact 保存（認証情報マスク付き）・人間ログイン待ちを束ねる。
 *
 * 安全弁:
 *   - chromium.launchPersistentContext + channel:"chrome"（システム Chrome）
 *   - プロファイルは本体固定パス（worktree でも同一ログインを共有／auth-profiles.md 準拠）
 *   - Cookie / storageState を標準出力・ファイルへ書き出さない
 *   - debug 保存前に email / Bearer トークンをマスク
 *   - CI では使わない（サービスアカウント API 経路のみ）
 */
import { chromium } from "playwright";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";

// playwright-auth-profiles.md 準拠: プロファイルは本体チェックアウト固定（worktree 分裂でも共有）。
//
// 2026-07-30 修正: 旧実装は Mac の絶対パス（/Users/<name>/doboku-note）をハードコードしており、
// Windows では存在しないため `process.cwd()` にフォールバックしていた。その結果 worktree から
// 実行すると **プロファイルが worktree 内に作られ、worktree を捨てると同時にログインが消える**
// （実際このマシンには .local/playwright-google-profile が存在せず、GSC UI 取得は Mac 専用に
// なっていた）。`~/doboku-note` は Mac も Windows も本体チェックアウトを指すので、
// ユーザー名をハードコードせずに両機で同じ場所へ解決できる。
const PROFILE_ROOT_CANDIDATES = [
  process.env.DOBOKU_PROFILE_ROOT || null,
  join(homedir(), "doboku-note"),
  "/Users/minamidaisuke/doboku-note", // 旧実装の互換（チェックアウトが ~ 直下でない場合）
].filter(Boolean);
export const CONFIG_PATH = ".claude/config/google-console-automation.json";

export function loadConfig() {
  const raw = readFileSync(CONFIG_PATH, "utf-8");
  return JSON.parse(raw);
}

/**
 * 永続プロファイルの置き場。**本体チェックアウト固定**（worktree から実行しても同じログインを共有）。
 * 解決できる候補が 1 つも無ければ cwd にフォールバックする（従来挙動）。
 */
export function profileDir(cfg) {
  const base = PROFILE_ROOT_CANDIDATES.find((p) => existsSync(p)) ?? process.cwd();
  return join(base, cfg.browser.profileDir);
}

/**
 * プロファイルが**初期化済み**か（＝一度でも Chrome が起動してディレクトリを作ったか）。
 *
 * **これは「Google にログイン済み」を意味しない。** Cookies DB はログインしていなくても作られる
 * （実際 2026-07-30 の not-signed-in run がこのディレクトリを作った）。ログイン有無を確定できるのは
 * 実際にページを開いて `isSignedInToGsc` で見たときだけなので、この関数は
 * 「プロファイルが未作成＝確実に要ログイン」の**早期案内**にしか使わない。
 * 真偽を反転して「true ならログイン済み」と読むのは誤り。
 */
export function profileInitialized(cfg) {
  const dir = profileDir(cfg);
  if (!existsSync(dir)) return false;
  return existsSync(join(dir, "Default", "Cookies")) || existsSync(join(dir, "Default", "Network", "Cookies"));
}

export function debugRoot(cfg) {
  return join(process.cwd(), cfg.browser.debugDir);
}

/** ISO 由来の run-id（ファイル名安全）。呼び出し側で 1 回生成し使い回す。 */
export function makeRunId() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19) + "Z";
}

/** email / Bearer トークンを伏せる。debug 保存前に必ず通す。 */
export function maskSecrets(text) {
  return String(text ?? "")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email-redacted]")
    .replace(/(Bearer|Authorization:?)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 [redacted]")
    .replace(/"access_token"\s*:\s*"[^"]+"/gi, '"access_token":"[redacted]"');
}

export function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function sha256Buf(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * 永続コンテキストを起動。acceptDownloads:true で download イベントを使える。
 *
 * Google のログイン画面は Playwright 既定の自動化シグナル（`--enable-automation` /
 * `navigator.webdriver=true` / 自動化 infobar）を検知して「このブラウザまたはアプリは安全で
 * ない可能性があります」で正当な**本人ログインまで**弾く。ユーザー自身のアカウントで自分の
 * Search Console データへアクセスする first-party 用途なので、既定の自動化フラグを外し通常
 * ブラウザ挙動に揃える（`ignoreDefaultArgs`＋`AutomationControlled` 無効化）。ボット偽装や
 * CAPTCHA/2FA の自動突破はしない（人間が完了する）。
 */
export async function launchContext(cfg, { headless } = {}) {
  const dir = profileDir(cfg);
  mkdirSync(dir, { recursive: true });
  const ctx = await chromium.launchPersistentContext(dir, {
    channel: cfg.browser.channel || "chrome",
    headless: headless ?? cfg.browser.headless ?? false,
    acceptDownloads: true,
    viewport: null,
    // Playwright 既定の自動化フラグを外す（Google の「安全でないブラウザ」誤検知の回避）
    ignoreDefaultArgs: ["--enable-automation"],
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });
  // navigator.webdriver を undefined に（自動化検知の主シグナルを無効化）
  await ctx.addInitScript(() => {
    try {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    } catch {}
  });
  ctx.setDefaultTimeout(cfg.browser.timeoutMs || 30000);
  return ctx;
}

/** 120 秒ごとに状態を表示するティッカー（無限待機を可視化）。stop() で止める。 */
export function startStatusTicker(label, intervalMs = 120000) {
  const started = Date.now();
  const timer = setInterval(() => {
    const sec = Math.round((Date.now() - started) / 1000);
    console.log(`[待機中] ${label}（経過 ${sec}s）— 人間の操作が必要な場合はブラウザで完了してください`);
  }, intervalMs);
  if (timer.unref) timer.unref();
  return () => clearInterval(timer);
}

/**
 * Google ログイン画面を検知したら「失敗」ではなく「人間待ち」として扱い、
 * GSC のアプリ本体（検索パフォーマンス等）が見えるまで待つ。上限は loginMaxWaitMs。
 * 成功時 true、タイムアウト時 false。認証情報は一切出力しない。
 */
export async function waitForHumanLogin(page, cfg, { pollMs = 3000 } = {}) {
  const maxWait = cfg.browser.loginMaxWaitMs || 900000;
  const stopTicker = startStatusTicker("Google ログイン/2FA/CAPTCHA を待機", cfg.browser.statusIntervalMs || 120000);
  const deadline = Date.now() + maxWait;
  try {
    while (Date.now() < deadline) {
      const signedIn = await isSignedInToGsc(page).catch(() => false);
      if (signedIn) return true;
      const onLogin = await isGoogleLoginPage(page).catch(() => false);
      if (onLogin) {
        // 人間の操作待ち。何も自動でクリックしない。
        await page.waitForTimeout(pollMs);
        continue;
      }
      await page.waitForTimeout(pollMs);
    }
    return false;
  } finally {
    stopTicker();
  }
}

/** Google のログイン/アカウント選択ページか（URL ベース・保守的）。 */
export async function isGoogleLoginPage(page) {
  const url = page.url();
  return /accounts\.google\.com|ServiceLogin|signin|\/InteractiveLogin/i.test(url);
}

/** GSC アプリ本体にサインイン済みか（可視の主要 UI で判定）。 */
export async function isSignedInToGsc(page) {
  const url = page.url();
  if (!/search\.google\.com\/search-console/i.test(url)) return false;
  // 検索パフォーマンス / Search results / サマリー等の主要ラベルが可視か
  const markers = [
    "検索パフォーマンス",
    "Search results",
    "Performance",
    "ページのインデックス登録",
    "Page indexing",
    "サマリー",
    "Summary",
  ];
  for (const m of markers) {
    const loc = page.getByText(m, { exact: false }).first();
    if (await loc.isVisible().catch(() => false)) return true;
  }
  return false;
}

/**
 * 対象 GSC プロパティが選択されているかを可視テキストで assert。
 * 一致しなければ throw（呼び出し側が debug dump→停止）。
 * property は "sc-domain:doboku-note.com" 形式。可視表示は "doboku-note.com" で照合。
 */
export async function assertGscProperty(page, cfg) {
  const property = cfg.gsc.property; // sc-domain:doboku-note.com
  const host = property.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const bodyText = await page.locator("body").innerText().catch(() => "");
  if (!bodyText.includes(host)) {
    const err = new Error(`対象プロパティ (${host}) が画面に見当たりません。プロパティ切替が必要です。`);
    err.code = "PROPERTY_MISMATCH";
    throw err;
  }
  return true;
}

/**
 * download イベントで確実にファイルを保存する。suggestedFilename は信用しない。
 * @returns {Promise<{path:string, sha256:string, bytes:number, suggested:string}>}
 */
export async function downloadTo(page, triggerFn, destPath, { timeout } = {}) {
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: timeout || 60000 }),
    Promise.resolve().then(triggerFn),
  ]);
  await download.saveAs(destPath);
  const buf = readFileSync(destPath);
  return {
    path: destPath,
    sha256: sha256Buf(buf),
    bytes: buf.length,
    suggested: download.suggestedFilename(),
  };
}

/**
 * UI 変更・想定外時の debug artifact を保存して停止判断を助ける。
 * screenshot.png / page.html / url.txt / visible-text.txt / failure.json。
 * HTML と visible-text は maskSecrets を通す（email/token を保存しない）。
 */
export async function dumpFailure(page, cfg, runId, failure = {}) {
  const dir = join(debugRoot(cfg), runId);
  mkdirSync(dir, { recursive: true });
  const url = page.url();
  let html = "";
  let visible = "";
  try {
    html = await page.content();
  } catch {}
  try {
    visible = await page.locator("body").innerText();
  } catch {}
  const shotPath = join(dir, "screenshot.png");
  try {
    await page.screenshot({ path: shotPath, fullPage: true });
  } catch {}
  writeFileSync(join(dir, "page.html"), maskSecrets(html), "utf-8");
  writeFileSync(join(dir, "url.txt"), url + "\n", "utf-8");
  writeFileSync(join(dir, "visible-text.txt"), maskSecrets(visible), "utf-8");
  const failureJson = {
    step: failure.step ?? null,
    expected: failure.expected ?? null,
    actual: failure.actual ?? null,
    url,
    message: maskSecrets(failure.message ?? ""),
    timestamp: new Date().toISOString(),
    candidateCount: failure.candidateCount ?? null,
    screenshotPath: shotPath,
    htmlPath: join(dir, "page.html"),
  };
  writeFileSync(join(dir, "failure.json"), JSON.stringify(failureJson, null, 2), "utf-8");
  console.error(`[debug] artifact 保存: ${dir}`);
  return dir;
}

/**
 * ラベル候補（ja/en 配列）のいずれかにマッチする role=button/link を一意に取得。
 * 0 件 or 複数件なら null を返す（呼び出し側は推測クリックせず dump→停止）。
 */
export async function findUniqueByLabels(page, labels, { roles = ["button", "link"] } = {}) {
  const found = [];
  for (const role of roles) {
    for (const label of labels) {
      const loc = page.getByRole(role, { name: label, exact: false });
      const count = await loc.count().catch(() => 0);
      for (let i = 0; i < count; i++) found.push(loc.nth(i));
    }
  }
  // getByText フォールバック（role で拾えない Angular Material 系メニュー項目）
  if (found.length === 0) {
    for (const label of labels) {
      const loc = page.getByText(label, { exact: false });
      const count = await loc.count().catch(() => 0);
      for (let i = 0; i < count; i++) found.push(loc.nth(i));
    }
  }
  if (found.length === 1) return { locator: found[0], count: 1 };
  return { locator: null, count: found.length };
}
