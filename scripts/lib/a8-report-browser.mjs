/**
 * a8-report-browser.mjs — A8.net メディア管理画面のブラウザ操作（レポート CSV 取得用）
 * ---------------------------------------------------------------------------
 * 汎用のブラウザ基盤（persistent context / download 捕捉 / debug dump / 一意セレクタ）は
 * google-console-browser.mjs が cfg 駆動の汎用関数として実装済みなので **import して再利用** する
 * （コピーしない）。そのため本設定の `browser` ブロックは google-console-automation.json と
 * 同じキー名にしてある。
 *
 * ここで新規に書くのは A8 固有の 4 点だけ:
 *   - loadA8Config      : 設定読み込み
 *   - restoreA8Session  : storageState の Cookie 再注入（A8 の認証実体）
 *   - isLoggedInA8      : ログイン判定
 *   - waitForHumanLoginA8 : 人間のログインを待つ（何も自動クリックしない）
 *   - assertDobokuSite  : サイト帰属の fail-closed assert（stats47 混入の防止）
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import {
  launchContext,
  profileDir,
  debugRoot,
  downloadTo,
  dumpFailure,
  findUniqueByLabels,
  makeRunId,
  sha256File,
  sha256Buf,
  maskSecrets,
  startStatusTicker,
} from "./google-console-browser.mjs";

export {
  launchContext,
  profileDir,
  debugRoot,
  downloadTo,
  dumpFailure,
  findUniqueByLabels,
  makeRunId,
  sha256File,
  sha256Buf,
  maskSecrets,
  startStatusTicker,
};

export const A8_CONFIG_PATH = ".claude/config/a8-report-automation.json";

export function loadA8Config() {
  const cfg = JSON.parse(readFileSync(A8_CONFIG_PATH, "utf-8"));
  if (!cfg?.a8?.targetSite) throw new Error("a8.targetSite が config にありません");
  return cfg;
}

/**
 * プロファイルと同じ「本体チェックアウト固定」root を返す。
 * profileDir(cfg) = <root>/<cfg.browser.profileDir> なので、末尾の既知サフィックス分を削る
 * （Mac 実在→cwd フォールバックの解決ロジックを google-console-browser 側に一元化したまま使う）。
 */
export function checkoutRoot(cfg) {
  const pdir = profileDir(cfg);
  const suffixLen = cfg.browser.profileDir.length;
  return pdir.slice(0, pdir.length - suffixLen);
}

/** レポート種別の URL。path が無ければ home（メニュー操作にフォールバック）。 */
export function reportUrl(cfg, reportKey) {
  const r = cfg.a8.reports[reportKey];
  if (!r) throw new Error(`未知の reportKey: ${reportKey}`);
  return r.path ? `${cfg.a8.baseUrl}${r.path}` : `${cfg.a8.baseUrl}${cfg.a8.homePath}`;
}

/**
 * storageState の Cookie を context に戻す。
 * A8 の認証セッション Cookie は永続プロファイルに残らないため、これが認証の実体
 * （a8-browser.ts restoreSession と同方式）。プロファイル本体と同じ root 解決を使う。
 */
export async function restoreA8Session(context, cfg) {
  const statePath = join(checkoutRoot(cfg), cfg.browser.stateFile);
  if (!existsSync(statePath)) {
    return { ok: false, statePath, reason: "state-missing" };
  }
  try {
    const state = JSON.parse(readFileSync(statePath, "utf-8"));
    if (Array.isArray(state.cookies) && state.cookies.length > 0) {
      await context.addCookies(state.cookies);
      return { ok: true, statePath, cookies: state.cookies.length };
    }
    return { ok: false, statePath, reason: "no-cookies" };
  } catch (e) {
    return { ok: false, statePath, reason: `parse-error: ${String(e.message).slice(0, 80)}` };
  }
}

/** 再認証/ログインへ飛ばされておらず、media-console 上でパスワード欄が無ければログイン済み。 */
export async function isLoggedInA8(page, cfg) {
  const url = page.url();
  if (new RegExp(cfg.a8.reAuthPattern, "i").test(url)) return false;
  if (!/media-console\.a8\.net/.test(url)) return false;
  const hasPw = await page
    .evaluate(() => document.querySelectorAll("input[type=password]").length > 0)
    .catch(() => true);
  return !hasPw;
}

/**
 * 人間のログインを待つ（自動入力・自動クリックは一切しない）。
 * 収益アカウントのため CAPTCHA/2FA も人間が処理する。成功 true / タイムアウト false。
 */
export async function waitForHumanLoginA8(page, cfg, { pollMs = 3000 } = {}) {
  const maxWait = cfg.browser.loginMaxWaitMs || 900000;
  const stop = startStatusTicker(
    "A8 ログインを待機（ブラウザでログインしてください）",
    cfg.browser.statusIntervalMs || 120000,
  );
  const deadline = Date.now() + maxWait;
  try {
    while (Date.now() < deadline) {
      if (await isLoggedInA8(page, cfg).catch(() => false)) return true;
      await page.waitForTimeout(pollMs);
    }
    return false;
  } finally {
    stop();
  }
}

/** ヘッダー等に見えているサイト名テキストを返す（判定材料の生テキスト）。 */
export async function readVisibleSiteContext(page) {
  const body = await page.locator("body").innerText().catch(() => "");
  return body.slice(0, 4000);
}

/**
 * サイト帰属の assert（本機能の安全弁の核）。
 * doboku-note が可視 かつ 禁止テキスト（stats47 系）が不可視 のときだけ ok:true。
 * 判定できない場合は ok:false を返し、呼び出し側は **ダウンロードしない**。
 */
export async function assertDobokuSite(page, cfg) {
  const text = await readVisibleSiteContext(page);
  const target = cfg.a8.targetSite;
  const forbidden = (cfg.a8.forbiddenSiteText || []).filter((f) => text.includes(f));
  const hasTarget = text.includes(target);
  if (hasTarget && forbidden.length === 0) return { ok: true, target, forbidden: [] };
  return {
    ok: false,
    target,
    forbidden,
    hasTarget,
    reason: !hasTarget
      ? `画面に "${target}" が見当たらない`
      : `禁止サイト文字列を検出: ${forbidden.join(", ")}`,
  };
}

/**
 * サイトスイッチャで doboku-note を選ぶ（select / ボタン両対応・best-effort）。
 * 切替できたかどうかは呼び出し側が assertDobokuSite で検証する（ここでは成否を返すだけ）。
 */
export async function switchToDobokuSite(page, cfg) {
  const target = cfg.a8.targetSite;
  // 1) <select> 形式
  const selects = page.locator("select");
  const n = await selects.count().catch(() => 0);
  for (let i = 0; i < n; i++) {
    const sel = selects.nth(i);
    const opts = await sel.locator("option").allTextContents().catch(() => []);
    if (opts.some((o) => o.includes(target))) {
      const label = opts.find((o) => o.includes(target));
      await sel.selectOption({ label }).catch(() => {});
      await page.waitForTimeout(1500);
      return { attempted: true, via: "select" };
    }
  }
  // 2) リンク/ボタン形式（一意なときだけ押す）
  const { locator } = await findUniqueByLabels(page, [target], { roles: ["button", "link", "option"] });
  if (locator) {
    await locator.click().catch(() => {});
    await page.waitForTimeout(1500);
    return { attempted: true, via: "click" };
  }
  return { attempted: false, via: null };
}
