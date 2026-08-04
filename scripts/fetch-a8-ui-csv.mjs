#!/usr/bin/env node
/**
 * fetch-a8-ui-csv.mjs — A8.net メディア管理画面からレポート CSV を取得（ローカル専用）
 * ---------------------------------------------------------------------------
 * A8 は公開 API が無いため、ログイン済みブラウザでレポート画面を開き download イベントで
 * CSV を保存する。GSC/GA4 の UI-CSV 収集（fetch-gsc-ui-csv.mjs）と同じ骨格。
 *
 * CLI:
 *   node scripts/fetch-a8-ui-csv.mjs --dry-run
 *   node scripts/fetch-a8-ui-csv.mjs --dry-run --probe-isolation
 *   node scripts/fetch-a8-ui-csv.mjs --dry-run --probe-period   # 期間フォームの実機観察
 *   node scripts/fetch-a8-ui-csv.mjs --month 2026-06 --reports site-summary,program-detail  # 単月取得
 *   node scripts/fetch-a8-ui-csv.mjs --reports program-detail
 *   node scripts/fetch-a8-ui-csv.mjs --reports all --headed
 *
 * 安全弁:
 *   - **サイト帰属 assert**: doboku-note を確定できなければ 1 バイトも DL しない（exit 5）。
 *     この口座は stats47（統計で見る都道府県）と共用のため、混入は SSOT 汚染に直結する。
 *   - selector は role/label/text 優先。候補が 0 or 複数なら推測クリックせず debug dump。
 *   - ダウンロードは必ず page.waitForEvent("download")（suggestedFilename を信用しない）。
 *   - ログイン・CAPTCHA は人間。スクリプトは待つだけで何も自動入力しない。
 *   - --dry-run は DOM 検出のみ（download しない）。
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

import {
  loadA8Config,
  reportUrl,
  launchContext,
  restoreA8Session,
  saveA8Session,
  isLoggedInA8,
  waitForHumanLoginA8,
  assertA8Account,
  assertTargetSiteRow,
  setPeriodMonth,
  readVisibleSiteContext,
  dumpFailure,
  downloadTo,
  findUniqueByLabels,
  makeRunId,
} from "./lib/a8-report-browser.mjs";
import { decodeCsvBuffer, parsePeriodFromFilename } from "./lib/a8-report-csv.mjs";
import { parseCsv } from "./lib/google-console-csv.mjs";

const STATE_DIR = ".claude/state/metrics/affiliate/a8-ui";

function parseArgs() {
  const a = process.argv.slice(2);
  const opts = { dryRun: false, headed: false, reports: "all", probeIsolation: false, probePeriod: false, month: null };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--dry-run") opts.dryRun = true;
    else if (a[i] === "--headed") opts.headed = true;
    else if (a[i] === "--probe-isolation") opts.probeIsolation = true;
    else if (a[i] === "--probe-period") opts.probePeriod = true;
    else if (a[i] === "--reports") opts.reports = a[++i];
    else if (a[i] === "--month") opts.month = a[++i];
  }
  return opts;
}

function gitCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

function finalize(manifest, runDir) {
  writeFileSync(join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
}

/** 最新取得マーカー（run 生データは gitignore・これだけ commit する）。 */
function writeLastRunMarker(manifest) {
  const marker = {
    lastRun: manifest.runId,
    collectedAt: manifest.collectedAt,
    site: manifest.site,
    mediaId: manifest.mediaId,
    downloadedUnits: manifest.units.filter((u) => u.status === "downloaded").length,
    totalUnits: manifest.units.length,
    status: manifest.status,
    note: "A8 レポート CSV 取得の最新実行マーカー（成果の生データは含めない）。",
  };
  try {
    writeFileSync(join(STATE_DIR, "last-run.json"), JSON.stringify(marker, null, 2), "utf-8");
  } catch {
    /* マーカー失敗は取得本体を妨げない */
  }
}

/** レポート画面へ移動して描画を待つ。 */
async function openReport(page, cfg, reportKey) {
  const url = reportUrl(cfg, reportKey);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: cfg.browser.timeoutMs }).catch(() => {});
  await page.waitForTimeout(2000);
  return url;
}

/**
 * サイト分離の実機確認（--probe-isolation）。
 * config の siteScope 宣言が実機と合っているかを、各レポートの可視テキストで照合する。
 * 判定材料を返すだけで config は書き換えない（人間が決める）。
 */
async function probeIsolation(page, cfg) {
  const out = [];
  for (const key of Object.keys(cfg.a8.reports)) {
    await openReport(page, cfg, key);
    const text = await readVisibleSiteContext(page);
    const declared = cfg.a8.reports[key].siteScope || "account-wide";
    const targetVisible = text.includes(cfg.a8.targetSite);
    out.push({
      reportKey: key,
      declaredSiteScope: declared,
      targetSiteVisible: targetVisible,
      consistent: declared === "site-rows" ? targetVisible : true,
      hint:
        declared === "site-rows" && !targetVisible
          ? `site-rows 宣言だが "${cfg.a8.targetSite}" が見えない → siteScope の見直しが必要`
          : declared === "account-wide" && targetVisible
            ? "account-wide 宣言だがサイト名が見える → site-rows にできるか確認の価値あり"
            : "宣言どおり",
    });
  }
  return out;
}

/**
 * 期間フォームの実機観察（--probe-period）。read-only＝入力もクリックもしない。
 *
 * なぜ必要か: 期間は URL クエリで制御できず（`_periodNote` の実測）、画面のフォームを
 * 操作するしかない。しかし `input name=start / end` は**月レンジと日レンジの 2 組**あり、
 * どちらを操作すべきかは実機を見ないと確定しない。ここで値を観察して config の
 * `a8.periodForm` を人間が確定する（スクリプトが推測で選ばない）。
 *
 * 単月取得（`--month`）が入れば site-summary を月ごとに取れて、a8-results.json の
 * 月次 records ＝ EPC の分母が埋まる（現在は累計期間しか取れず records が空）。
 */
async function probePeriodForm(page, cfg, reportKey = "site-summary") {
  await openReport(page, cfg, reportKey);
  const fields = await page.evaluate(() => {
    const describe = (el) => {
      const r = el.getBoundingClientRect();
      let ctx = "";
      let p = el.parentElement;
      for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
        const t = (p.innerText || "").replace(/\s+/g, " ").trim();
        if (t && t.length < 160) ctx = t;
      }
      return {
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type"),
        name: el.getAttribute("name"),
        id: el.getAttribute("id"),
        value: (el.value ?? "").slice(0, 40),
        placeholder: el.getAttribute("placeholder"),
        visible: r.width > 0 && r.height > 0,
        top: Math.round(r.top),
        options: el.tagName === "SELECT" ? [...el.options].slice(0, 14).map((o) => `${o.value}:${o.text}`) : null,
        ctx: ctx.slice(0, 120),
      };
    };
    return [...document.querySelectorAll("input, select")].map(describe);
  });
  const buttons = await page.evaluate(() =>
    [...document.querySelectorAll("button, input[type=submit], a[role=button]")]
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          text: (el.innerText || el.value || "").replace(/\s+/g, " ").trim().slice(0, 40),
          type: el.getAttribute("type"),
          visible: r.width > 0 && r.height > 0,
          top: Math.round(r.top),
        };
      })
      .filter((b) => b.text),
  );
  return { reportKey, url: page.url(), fields, buttons };
}

/** 1 レポート分の取得。dry-run は検出のみ。 */
async function processReport(page, cfg, runId, runDir, { reportKey, dryRun, month = null }) {
  const spec = cfg.a8.reports[reportKey];
  const unit = {
    reportKey,
    reportLabel: spec.label,
    reportUrl: null,
    csvRows: null,
    csvHeaders: null,
    encoding: null,
    rawFile: null,
    sha256: null,
    exportButtonUnique: null,
    siteScope: spec.siteScope || "account-wide",
    period: null,
    requestedMonth: month,
    status: "pending",
    error: null,
  };

  unit.reportUrl = await openReport(page, cfg, reportKey);

  // レポート画面に到達しているか。
  //
  // 以前は config の `label`（例「プログラム別（詳細）」）が**可視テキストに出ること**を条件に
  // していたが、これは実機と合っていなかった（2026-08-04 実測）。program-detail の画面では
  // 可視の見出しは「プログラム別レポート」＋タブ「詳細」で、`label` は HTML には在るが
  // innerText には現れない。結果、正しく開けているのに `report-unreachable` で落ちた。
  //
  // 到達の権威は **URL**（ログインへ飛ばされていれば変わる）に置き、
  // 「レポートとして機能しているか」は **可視のエクスポート操作**の実在で見る。
  // 表示文言の言い回しに依存しない＝A8 の文言変更で誤検知しない。
  const landedUrl = page.url();
  const expectedPath = new URL(unit.reportUrl).pathname;
  const onReportUrl = landedUrl.includes(expectedPath);
  const exportLabels = cfg.a8.exportButtonLabels ?? ["CSV"];
  let exportVisible = 0;
  for (const label of exportLabels) {
    exportVisible += await page
      .getByText(label, { exact: true })
      .filter({ visible: true })
      .count()
      .catch(() => 0);
  }
  if (!onReportUrl || exportVisible === 0) {
    await dumpFailure(page, cfg, runId, {
      step: "reach-report",
      expected: [expectedPath, ...exportLabels],
      message:
        `レポート「${spec.label}」に到達できない（URL 一致=${onReportUrl} / 可視エクスポート操作 ${exportVisible} 件）` +
        `。ログインへ飛ばされたか、UI が変わった可能性`,
    });
    unit.status = "report-unreachable";
    unit.error = `レポート画面に到達できず（url=${landedUrl} / export 候補 ${exportVisible} 件）`;
    return unit;
  }

  // ★ site-rows レポートは「doboku-note の行が実在すること」を DL 前に確認する。
  //   account-wide はサイト分離できない前提なので、ここでは確認せず normalize 側の
  //   allowlist 抽出＋site-summary 突合で担保する（A8 にサイト切替は無い＝2026-07-27 実機確認）。
  if (unit.siteScope === "site-rows") {
    const site = await assertTargetSiteRow(page, cfg);
    if (!site.ok) {
      await dumpFailure(page, cfg, runId, {
        step: "assert-target-site-row",
        expected: [cfg.a8.targetSite],
        message: `サイト帰属を確定できない: ${site.reason}`,
      });
      unit.status = "site-mismatch";
      unit.error = site.reason;
      return unit;
    }
  }

  // ★ 単月指定（--month）。既定は A8 の累計期間なので、指定が無ければ何もしない。
  //   期間を変えると表が再描画されるので、export ボタンを掴む前に済ませる。
  if (month) {
    const set = await setPeriodMonth(page, cfg, { month });
    unit.periodSet = set;
    if (!set.ok) {
      await dumpFailure(page, cfg, runId, {
        step: "set-period-month",
        expected: [cfg.a8?.periodForm?.startPlaceholder, cfg.a8?.periodForm?.endPlaceholder].filter(Boolean),
        message: `期間フォームを単月に設定できない: ${set.reason}`,
      });
      unit.status = "period-set-failed";
      unit.error = set.reason;
      return unit;
    }
  }

  // エクスポートボタン
  const { locator, count } = await findUniqueByLabels(page, cfg.a8.exportButtonLabels, {
    roles: ["button", "link"],
  });
  unit.exportButtonUnique = count === 1;
  if (!locator) {
    await dumpFailure(page, cfg, runId, {
      step: "find-export-button",
      expected: cfg.a8.exportButtonLabels,
      message: `CSV ダウンロードボタンが一意に定まらない（候補 ${count} 件）。推測クリックしない。`,
      candidateCount: count,
    });
    unit.status = count === 0 ? "export-button-not-found" : "export-button-ambiguous";
    unit.error = `候補数 ${count}`;
    return unit;
  }

  if (dryRun) {
    unit.status = "dry-run-ok";
    return unit;
  }

  const dest = join(runDir, `${reportKey}--${runId}.csv`);
  try {
    const dl = await downloadTo(page, () => locator.click(), dest, { timeout: cfg.browser.timeoutMs });
    unit.rawFile = dest;
    unit.sha256 = dl.sha256;
    // A8 はファイル名に対象期間を入れる（例 site_202601-202607_20260727105756.csv）。
    // 期間は URL で制御できないため、実際に何の期間を取れたかはここでしか分からない。
    unit.suggestedFilename = dl.suggested ?? null;
    unit.period = parsePeriodFromFilename(dl.suggested);
    // ★ 期間の fail-closed 検証。ファイル名が実際に取れた期間の唯一の証拠なので、
    //   要求した単月と一致しない CSV は normalize に流さない（誤った月へ upsert すると
    //   EPC の分母が静かに壊れる）。
    if (month && unit.period?.singleMonth !== month) {
      unit.status = "period-mismatch";
      unit.error = `要求 ${month} に対し取得できた期間は ${unit.period?.raw ?? "不明"}（singleMonth=${unit.period?.singleMonth ?? "null"}）`;
      return unit;
    }
    const decoded = decodeCsvBuffer(readFileSync(dest), cfg.a8.csvEncoding);
    unit.encoding = decoded.encoding;
    const { headers, rows } = parseCsv(decoded.text);
    unit.csvHeaders = headers;
    unit.csvRows = rows.length;
    unit.status = rows.length > 0 ? "downloaded" : "empty-download";
    if (rows.length === 0) unit.error = "CSV は取得できたが行が 0";
  } catch (e) {
    await dumpFailure(page, cfg, runId, { step: "download", message: e?.message || String(e) });
    unit.status = "download-failed";
    unit.error = String(e?.message || e).slice(0, 200);
  }
  return unit;
}

async function main() {
  const opts = parseArgs();
  const cfg = loadA8Config();
  const runId = makeRunId();
  const runDir = join(STATE_DIR, runId);
  mkdirSync(runDir, { recursive: true });

  const reportKeys =
    opts.reports === "all"
      ? Object.keys(cfg.a8.reports)
      : opts.reports.split(",").map((s) => s.trim()).filter(Boolean);

  const manifest = {
    schemaVersion: 1,
    runId,
    collectedAt: new Date().toISOString(),
    site: cfg.a8.targetSite,
    mediaId: cfg.a8.mediaId,
    mode: opts.dryRun ? "dry-run" : "fetch",
    // 要求した単月（null = A8 既定の累計期間）。normalize 側はこれと unit.period の
    // 突き合わせで、誤った月への upsert を拒否できる。
    requestedMonth: opts.month ?? null,
    browserHeadless: !opts.headed && cfg.browser.headless,
    scriptVersion: gitCommit(),
    units: [],
    dryRun: opts.dryRun ? { loggedIn: false, accountAsserted: false, isolation: null } : undefined,
  };

  console.log(`A8 レポート CSV 取得 [${manifest.mode}] reports=${reportKeys.join(",")}`);
  const ctx = await launchContext(cfg, { headless: opts.headed ? false : cfg.browser.headless });

  try {
    const session = await restoreA8Session(ctx, cfg);
    if (!session.ok) console.warn(`[warn] セッション未復元（${session.reason}）— ログイン待ちになります`);

    const page = ctx.pages()[0] ?? (await ctx.newPage());
    await page.goto(`${cfg.a8.baseUrl}${cfg.a8.homePath}`, {
      waitUntil: "domcontentloaded",
      timeout: cfg.browser.timeoutMs,
    });
    await page.waitForTimeout(2000);

    if (!(await isLoggedInA8(page, cfg).catch(() => false))) {
      console.log("未ログインです。ブラウザで A8 にログインしてください（自動入力はしません）。");
      const ok = await waitForHumanLoginA8(page, cfg);
      if (!ok) {
        await dumpFailure(page, cfg, runId, {
          step: "login",
          message: "ログイン待ちがタイムアウト。ブラウザでログインを完了してから再実行してください。",
        });
        console.error("未ログインのため停止しました。");
        manifest.status = "not-signed-in";
        finalize(manifest, runDir);
        process.exit(3);
      }
      // A8 のセッション Cookie は永続プロファイルに残らないため、ログイン直後に storageState を保存する
      // （これをしないと毎回ログインが必要になる）。
      const saved = await saveA8Session(ctx, cfg);
      console.log(saved.ok ? `セッションを保存しました: ${saved.statePath}` : `[warn] セッション保存に失敗: ${saved.reason}`);
    }
    if (manifest.dryRun) manifest.dryRun.loggedIn = true;

    // ★ 口座 assert（fail-closed）。A8 にサイト切替は無いので、ここで確認するのは
    //   「正しい口座（メディアID）か」。doboku-note の分離はレポート単位で行う。
    const account = await assertA8Account(page, cfg);
    if (!account.ok) {
      await dumpFailure(page, cfg, runId, {
        step: "assert-account",
        expected: [cfg.a8.mediaId],
        message: `口座を確定できない: ${account.reason}。別口座のデータを取り込まないため停止。`,
      });
      console.error(`口座不一致で停止: ${account.reason}`);
      console.error("→ .local/playwright-a8-debug/ の visible-text.txt を見て config の a8.mediaId を確認してください。");
      manifest.status = "account-mismatch";
      finalize(manifest, runDir);
      process.exit(5);
    }
    if (manifest.dryRun) manifest.dryRun.accountAsserted = true;
    console.log(`口座 assert OK: メディアID ${cfg.a8.mediaId}（対象サイト ${cfg.a8.targetSite}）`);

    if (opts.probeIsolation) {
      const probe = await probeIsolation(page, cfg);
      if (manifest.dryRun) manifest.dryRun.isolation = probe;
      manifest.isolationProbe = probe;
      for (const p of probe) console.log(`[probe] ${p.reportKey}: ${p.declaredSiteScope} — ${p.hint}`);
    }

    if (opts.probePeriod) {
      manifest.periodFormProbe = [];
      for (const key of reportKeys) {
        const pp = await probePeriodForm(page, cfg, key);
        manifest.periodFormProbe.push(pp);
        // _csrf は同値が複数出るだけのノイズなので落とす
        const named = pp.fields.filter((f) => (f.name || f.options) && f.name !== "_csrf");
        console.log(`[probe-period] ${pp.reportKey} ${pp.url}`);
        console.log(`  input/select ${pp.fields.length} 件（うち意味のあるもの ${named.length} 件）:`);
        for (const f of named) console.log(`    ${JSON.stringify(f)}`);
        console.log("  button(visible):");
        for (const b of pp.buttons.filter((b) => b.visible)) console.log(`    ${JSON.stringify(b)}`);
      }
      console.log("  → この出力を見て .claude/config/a8-report-automation.json の a8.periodForm を確定する");
      console.log("     （レポートにより期間フォームの粒度が異なる。どれを操作するかは推測しない）");
    }

    for (const reportKey of reportKeys) {
      if (!cfg.a8.reports[reportKey]) {
        console.warn(`[warn] 未知の reportKey: ${reportKey}（config に無し・スキップ）`);
        continue;
      }
      const unit = await processReport(page, cfg, runId, runDir, {
        reportKey,
        dryRun: opts.dryRun,
        month: opts.month,
      });
      manifest.units.push(unit);
      console.log(`  ${reportKey}: ${unit.status}${unit.csvRows != null ? ` (${unit.csvRows} 行)` : ""}`);
    }

    // 「例外が出なかった」と「全部取れた」は違う。1 本でも落ちていれば partial にする。
    // 以前は無条件に "ok" を入れており、program-detail が report-unreachable でも
    // status=ok / exit 0 で終わっていた（2026-08-04 実測）。緑を見て「取れた」と読ませない。
    const failedUnits = manifest.units.filter(
      (u) => u.status !== "downloaded" && u.status !== "dry-run-ok" && u.status !== "skipped",
    );
    manifest.status = failedUnits.length === 0 ? "ok" : "partial";
    if (failedUnits.length > 0) {
      manifest.failed = failedUnits.map((u) => ({ reportKey: u.reportKey, status: u.status, error: u.error }));
    }
  } catch (e) {
    const page = ctx.pages()[0];
    if (page) await dumpFailure(page, cfg, runId, { step: "unexpected", message: e?.message || String(e) });
    manifest.status = "error";
    manifest.error = String(e?.message || e).slice(0, 300);
  } finally {
    await ctx.close();
  }

  finalize(manifest, runDir);
  if (!opts.dryRun) writeLastRunMarker(manifest);
  const ok = manifest.units.filter((u) => u.status === "downloaded").length;
  console.log(`\n完了: status=${manifest.status} / download 成功 ${ok}/${manifest.units.length}`);
  if (manifest.failed?.length) {
    console.log(`⚠ 取得できなかったレポート ${manifest.failed.length} 件:`);
    for (const f of manifest.failed) console.log(`  ${f.reportKey}: ${f.status}${f.error ? ` — ${f.error}` : ""}`);
  }
  console.log(`manifest: ${join(runDir, "manifest.json")}`);
  // 部分取得を 0 で終わらせない（後段の normalize が「全部揃った」前提で走るのを防ぐ）。
  if (manifest.status !== "ok") process.exit(2);
}

main().catch((e) => {
  console.error("Fatal:", e?.message || e);
  process.exit(1);
});
