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
 *   - assertA8Account   : 口座（メディアID）の fail-closed assert（誤アカウント操作の防止）
 *   - assertTargetSiteRow : サイト別レポートに doboku-note 行があるかの確認
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

/**
 * 現在のセッション Cookie を storageState として保存する（次回以降の再利用の実体）。
 * A8 のセッション Cookie は永続プロファイルに残らないため、人間のログイン直後にこれを呼ぶ。
 * scout-asp の login.mjs と同じファイルを共有する（あちらは Mac パス固定なのでこちらが portable 版）。
 */
export async function saveA8Session(context, cfg) {
  const statePath = join(checkoutRoot(cfg), cfg.browser.stateFile);
  try {
    await context.storageState({ path: statePath });
    return { ok: true, statePath };
  } catch (e) {
    return { ok: false, statePath, reason: String(e.message).slice(0, 120) };
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
 * 口座（メディアID）の assert — 誤アカウント操作の防止。
 *
 * ★A8 の管理画面に**サイト切替は無い**（2026-07-27 実機確認）。ヘッダーの「サイト名」は口座の
 * 代表サイト（stats47）が常に出るだけなので、ここで doboku-note を探しても永久に見つからない。
 * よってログイン直後に検証すべきは「正しい口座か」＝ mediaId。doboku-note の分離は
 * レポート単位（siteScope）で行う。
 */
export async function assertA8Account(page, cfg) {
  const text = await readVisibleSiteContext(page);
  const mediaId = cfg.a8.mediaId;
  if (!mediaId) return { ok: false, reason: "config に a8.mediaId が無い" };
  if (text.includes(mediaId)) return { ok: true, mediaId };
  return { ok: false, mediaId, reason: `画面にメディアID "${mediaId}" が見当たらない（別口座でログインしている可能性）` };
}

/**
 * サイト別レポートに targetSite の行があるか（site-rows レポート専用の帰属確認）。
 * 無ければ「doboku-note の実績を取れていない」ので、呼び出し側は取り込みを中止する。
 */
export async function assertTargetSiteRow(page, cfg) {
  const text = await readVisibleSiteContext(page);
  const target = cfg.a8.targetSite;
  if (text.includes(target)) return { ok: true, target };
  return { ok: false, target, reason: `サイト別レポートに "${target}" の行が見当たらない` };
}

/** `2026-06` → `2026年06月`（A8 の月フォームの表記。2026-07-28 実測）。 */
export function formatA8Month(month) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(month ?? ""));
  if (!m) throw new Error(`--month は YYYY-MM 形式で指定してください（受領: ${month}）`);
  const mm = Number(m[2]);
  if (mm < 1 || mm > 12) throw new Error(`月が範囲外です: ${month}`);
  return `${m[1]}年${m[2]}月`;
}

/**
 * 期間フォームを「単月」に設定する（開始月＝終了月＝month）。
 *
 * なぜ必要か: A8 は期間を URL で制御できず既定が累計（年初〜当月）なので、そのままでは
 * `parsePeriodFromFilename` の singleMonth が埋まらず a8-results.json（月次キー）へ写せない
 * ＝ EPC の分母が供給されない。
 *
 * 設計: セレクタは config の `a8.periodForm`（実機観察で確定した値）駆動。**name では選べない**
 * （start/end は月レンジと日レンジで重複するため）ので placeholder で一意化し、
 * 一意に定まらなければ推測操作せず失敗を返す（fail-closed）。実際に何の期間が取れたかは
 * CSV のファイル名でしか分からないので、成否の最終判定は呼び出し側が DL 後に行う。
 */
export async function setPeriodMonth(page, cfg, { month }) {
  const pf = cfg.a8?.periodForm;
  if (!pf) return { ok: false, reason: "config に a8.periodForm が無い（--probe-period で実機を観察して確定する）" };

  const value = formatA8Month(month);
  const [targetYear, targetMonth] = month.split("-").map(Number);

  // レポートを続けて処理すると前ページのピッカーが残っていて入力欄が二重に見えることがある
  // （site-summary → program-detail の連続実行で実測）。開いていれば閉じて描画を落ち着かせる。
  if ((await page.locator(`${pf.pickerRoot}:visible`).count().catch(() => 0)) > 0) {
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.waitForLoadState("networkidle", { timeout: cfg.browser.timeoutMs }).catch(() => {});
  // 期間フォームの描画を明示的に待つ。program-detail は要素数が多く、遷移直後は
  // 入力欄が 0 件のことがある（連続実行で「全 0 件」を実測）。networkidle だけでは足りない。
  await page
    .locator(`input[placeholder="${pf.startPlaceholder}"]`)
    .first()
    .waitFor({ state: "visible", timeout: cfg.browser.timeoutMs })
    .catch(() => {});

  // 月指定タブがあり、月フォームが隠れているときだけ切り替える（既定は月指定＝通常は不要）
  const startLoc = page.locator(`input[placeholder="${pf.startPlaceholder}"]`);
  if ((await startLoc.count().catch(() => 0)) > 0 && !(await startLoc.first().isVisible().catch(() => false))) {
    if (pf.monthTabLabel) {
      const tab = page.getByRole("button", { name: pf.monthTabLabel, exact: false });
      if ((await tab.count().catch(() => 0)) === 1) {
        await tab.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }
  }

  // "1月" が "11月" に部分一致しないよう完全一致で絞る。disabled はセル自身のクラスなので
  // CSS の :not() で除く（filter({hasNot}) は「子孫に持たない」の意味で、ここでは効かない）。
  const cellRe = new RegExp(`^${targetMonth}月$`);
  const cellSelector = `${pf.pickerRoot}:visible ${pf.monthCell}:not(.${pf.disabledCellClass})`;

  // 開始・終了それぞれ、自分の入力欄をクリックしてピッカーを開いてから月セルを選ぶ。
  // **input へ直接 fill してはいけない**（vanillajs-datepicker は DOM の value を書き換えても
  // 内部の選択状態が変わらず、「適用」しても既定期間のまま CSV が出る＝2026-07-28 実測）。
  // また開始を選ぶとピッカーが閉じるので、終了は開き直す必要がある（同上）。
  for (const [which, placeholder] of [
    ["開始", pf.startPlaceholder],
    ["終了", pf.endPlaceholder],
  ]) {
    const input = page.locator(`input[placeholder="${placeholder}"]:visible`);
    const inputCount = await input.count().catch(() => 0);
    if (inputCount !== 1) {
      const all = await page.locator(`input[placeholder="${placeholder}"]`).count().catch(() => 0);
      return {
        ok: false,
        reason: `${which}月の入力欄（placeholder="${placeholder}"）が一意に定まらない（visible ${inputCount} 件 / 全 ${all} 件）`,
      };
    }
    await input.first().click();
    await page.waitForTimeout(700);

    const picker = page.locator(`${pf.pickerRoot}:visible`).first();
    if ((await picker.count().catch(() => 0)) === 0) {
      return { ok: false, reason: `${which}月のピッカー（${pf.pickerRoot}）が開かない` };
    }

    // 表示年を目標年に合わせる（« / » を必要回数。上限つきで無限ループを防ぐ）
    const readYear = async () => {
      const t = await picker
        .locator(pf.yearSwitch.split(" ").pop())
        .first()
        .innerText()
        .catch(() => "");
      const m = /(\d{4})/.exec(t || "");
      return m ? Number(m[1]) : null;
    };
    for (let guard = 0; guard < 12; guard++) {
      const shown = await readYear();
      if (shown == null || shown === targetYear) break;
      const label = shown > targetYear ? pf.prevYearLabel : pf.nextYearLabel;
      const nav = picker.getByText(label, { exact: true }).first();
      if ((await nav.count().catch(() => 0)) === 0) {
        return { ok: false, reason: `年移動ボタン "${label}" が見つからない（表示 ${shown} / 目標 ${targetYear}）` };
      }
      await nav.click();
      await page.waitForTimeout(350);
    }
    const shownYear = await readYear();
    if (shownYear != null && shownYear !== targetYear) {
      return { ok: false, reason: `表示年を ${targetYear} に合わせられない（現在 ${shownYear}）` };
    }

    const cell = page.locator(cellSelector).filter({ hasText: cellRe });
    if ((await cell.count().catch(() => 0)) === 0) {
      return { ok: false, reason: `${which}の月セル "${targetMonth}月" が選べない（未来月は disabled）` };
    }
    await cell.first().click();
    await page.waitForTimeout(600);
  }

  const apply = page.getByRole("button", { name: pf.applyButtonLabel, exact: false });
  const applyCount = await apply.count().catch(() => 0);
  if (applyCount !== 1) {
    return { ok: false, reason: `「${pf.applyButtonLabel}」ボタンが一意に定まらない（候補 ${applyCount} 件）` };
  }
  await apply.click();
  await page.waitForLoadState("networkidle", { timeout: cfg.browser.timeoutMs }).catch(() => {});
  await page.waitForTimeout(1500);

  // 反映確認。ここが要求値でも CSV が同じ期間とは限らないので、最終判定は
  // 呼び出し側が DL 後にファイル名で行う（fail-closed）。
  const appliedStart = await page
    .locator(`input[placeholder="${pf.startPlaceholder}"]:visible`)
    .first()
    .inputValue()
    .catch(() => null);
  const appliedEnd = await page
    .locator(`input[placeholder="${pf.endPlaceholder}"]:visible`)
    .first()
    .inputValue()
    .catch(() => null);
  if (appliedStart !== value || appliedEnd !== value) {
    return { ok: false, reason: `期間が単月 ${value} にならない（開始 ${appliedStart} / 終了 ${appliedEnd}）` };
  }
  return { ok: true, requestedMonth: month, value, appliedStart, appliedEnd };
}
