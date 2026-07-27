/**
 * asp-browser.mjs — 3 ASP（A8 / もしも / afb）共通のブラウザ操作層
 * ---------------------------------------------------------------------------
 * 汎用部（persistent context / download 捕捉 / debug dump / 一意セレクタ）は
 * `google-console-browser.mjs` が cfg 駆動の汎用関数として実装済みなので **import して再利用**する
 * （`a8-report-browser.mjs` で実証済み・コピーしない）。
 *
 * ここに足すのは ASP 共通の 3 点だけ:
 *   - loadAspConfig / aspBrowserCfg : 設定の読み出しと browser ブロックの正規化
 *   - openAsp                       : 起動 → セッション復元 → ログイン待ち（人間）→ 保存
 *   - ensureTargetSite              : **サイト帰属の確定。失敗は例外**（asp-site-guard に判定を委譲）
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
  maskSecrets,
  startStatusTicker,
} from "./google-console-browser.mjs";
import { assertSiteOrThrow, extractSiteId, SiteAttributionError } from "./asp-site-guard.mjs";

export {
  launchContext,
  profileDir,
  debugRoot,
  downloadTo,
  dumpFailure,
  findUniqueByLabels,
  makeRunId,
  sha256File,
  maskSecrets,
  startStatusTicker,
  SiteAttributionError,
};

export const ASP_CONFIG_PATH = ".claude/config/affiliate-asp.json";

export function loadAspConfig() {
  const cfg = JSON.parse(readFileSync(ASP_CONFIG_PATH, "utf-8"));
  if (!cfg?.asps) throw new Error(`${ASP_CONFIG_PATH}: asps がありません`);
  return cfg;
}

/** ASP 設定を取り出す。未知の名前は落とす（typo を黙って通さない）。 */
export function getAsp(cfg, name) {
  const a = cfg.asps[name];
  if (!a) throw new Error(`未知の ASP: ${name}（${Object.keys(cfg.asps).join(" / ")}）`);
  return a;
}

/**
 * google-console-browser の汎用関数は `cfg.browser.*` を見るので、その形に合わせた
 * 薄いアダプタを返す（各 ASP の browser ブロックをそのまま使えるようにする）。
 */
export function aspBrowserCfg(asp) {
  return { browser: asp.browser };
}

/** プロファイルと同じ root（Mac 実在→cwd フォールバック）を返す。 */
export function checkoutRoot(asp) {
  const bcfg = aspBrowserCfg(asp);
  const pdir = profileDir(bcfg);
  return pdir.slice(0, pdir.length - asp.browser.profileDir.length);
}

const statePath = (asp) => join(checkoutRoot(asp), asp.browser.stateFile);

async function restoreSession(ctx, asp) {
  const p = statePath(asp);
  if (!existsSync(p)) return { ok: false, reason: "state-missing" };
  try {
    const st = JSON.parse(readFileSync(p, "utf-8"));
    if (Array.isArray(st.cookies) && st.cookies.length > 0) {
      await ctx.addCookies(st.cookies);
      return { ok: true, cookies: st.cookies.length };
    }
    return { ok: false, reason: "no-cookies" };
  } catch (e) {
    return { ok: false, reason: `parse-error: ${String(e.message).slice(0, 80)}` };
  }
}

/**
 * ASP を開き、ログイン済みの page を返す。ログインは人間（自動入力しない）。
 *
 * `asp.browser.sessionPersistsAcrossProcesses === false`（afb）の場合、保存した storageState は
 * 別プロセスで復元できないため **毎回ログインを待つ前提**になる。呼び出し側は
 * 「ログイン → 目的の作業完了」を 1 プロセスで終わらせること。
 *
 * @param {object} opts
 * @param {(page)=>Promise<boolean>} opts.isReady  管理画面に到達したかの判定。
 *   **可視テキストの部分一致で判定しない**こと（読み込み途中のページを通してしまい、
 *   以降の処理が全部空振りする事故が実際に起きた）。固有 DOM の実在で判定する。
 */
export async function openAsp(asp, { isReady, label = "ASP" } = {}) {
  const bcfg = aspBrowserCfg(asp);
  const ctx = await launchContext(bcfg, { headless: asp.browser.headless });
  const session = await restoreSession(ctx, asp);
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  await page
    .goto(asp.baseUrl + asp.homePath, { waitUntil: "domcontentloaded", timeout: asp.browser.timeoutMs })
    .catch(() => {});
  await page.waitForTimeout(3000);

  const ready = isReady ?? (async (p) => !new RegExp(asp.reAuthPattern, "i").test(p.url()));
  if (!(await ready(page).catch(() => false))) {
    console.log(`\n■ ブラウザで ${asp.label} にログインしてください（自動入力しません）\n`);
    const stop = startStatusTicker(`${label} ログイン待ち`, 60000);
    const deadline = Date.now() + (asp.browser.loginMaxWaitMs || 600000);
    try {
      while (Date.now() < deadline) {
        if (await ready(page).catch(() => false)) break;
        await page.waitForTimeout(3000);
      }
    } finally {
      stop();
    }
    if (!(await ready(page).catch(() => false))) {
      await ctx.close();
      throw new Error(`${asp.label}: ログインを検知できずタイムアウト`);
    }
    await ctx.storageState({ path: statePath(asp) }).catch(() => {});
  }
  return { ctx, page, session };
}

/** 画面の可視テキスト（判定材料）。長すぎると比較が重いので先頭のみ。 */
export async function visibleText(page, limit = 8000) {
  return (await page.locator("body").innerText().catch(() => "")).replace(/ /g, " ").slice(0, limit);
}

/**
 * **サイト帰属を確定する。失敗は例外**（asp-site-guard に判定を委譲）。
 *
 * siteSeparation ごとに「切り替え方」だけが違い、「確認して落とす」部分は共通。
 *   none          … 切替なし（A8）。口座 ID と禁止文字列で判定
 *   url-param     … URL に site パラメータ（もしも）
 *   chosen-widget … Chosen の実 UI クリック（afb）。URL も JS の change も効かない
 *
 * @throws {SiteAttributionError} 想定サイトを確定できないとき
 */
export async function ensureTargetSite(page, asp, rootCfg, { navigateTo = null } = {}) {
  const targetName = rootCfg.targetSiteName;
  const forbidden = rootCfg.forbiddenSiteText || [];
  const expectedSiteId = asp.sites ? asp.sites[targetName] : null;

  if (asp.siteSeparation === "url-param" && navigateTo) {
    const u = new URL(navigateTo, asp.baseUrl);
    u.searchParams.set(asp.siteParam, expectedSiteId);
    await page.goto(u.href, { waitUntil: "domcontentloaded", timeout: asp.browser.timeoutMs }).catch(() => {});
    await page.waitForTimeout(2500);
  } else if (navigateTo) {
    await page
      .goto(new URL(navigateTo, asp.baseUrl).href, { waitUntil: "domcontentloaded", timeout: asp.browser.timeoutMs })
      .catch(() => {});
    await page.waitForTimeout(2500);
  }

  if (asp.siteSeparation === "chosen-widget") {
    const cont = page.locator(asp.chosenContainer).first();
    if (await cont.count().catch(() => 0)) {
      await cont.click().catch(() => {});
      await page.waitForTimeout(1200);
      const opt = page.locator(asp.chosenOption, { hasText: targetName }).first();
      if (await opt.count().catch(() => 0)) {
        await opt.click().catch(() => {});
        await page.waitForTimeout(4000);
      }
    }
  }

  const text = await visibleText(page);
  const actualSiteId =
    asp.siteSeparation === "url-param"
      ? new URL(page.url()).searchParams.get(asp.siteParam)
      : asp.siteIdPattern
        ? extractSiteId(text, asp.siteIdPattern)
        : asp.accountIdPattern
          ? extractSiteId(text, asp.accountIdPattern)
          : null;

  // A8 は「サイト」ではなく口座 ID を assert する（サイト切替が存在しないため）
  const expected = asp.siteSeparation === "none" ? asp.accountId : expectedSiteId;

  return assertSiteOrThrow({
    actualSiteId,
    expectedSiteId: expected,
    visibleText: text,
    // A8 のヘッダーは常に stats47 名を出すので、口座 assert では禁止文字列を使わない
    forbiddenText: asp.siteSeparation === "none" ? [] : forbidden,
    expectedSiteName: expected ? null : targetName,
  });
}
