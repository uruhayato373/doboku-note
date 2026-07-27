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
  isLoggedInA8,
  waitForHumanLoginA8,
  assertDobokuSite,
  switchToDobokuSite,
  readVisibleSiteContext,
  dumpFailure,
  downloadTo,
  findUniqueByLabels,
  makeRunId,
} from "./lib/a8-report-browser.mjs";
import { decodeCsvBuffer } from "./lib/a8-report-csv.mjs";
import { parseCsv } from "./lib/google-console-csv.mjs";

const STATE_DIR = ".claude/state/metrics/affiliate/a8-ui";

function parseArgs() {
  const a = process.argv.slice(2);
  const opts = { dryRun: false, headed: false, reports: "all", probeIsolation: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--dry-run") opts.dryRun = true;
    else if (a[i] === "--headed") opts.headed = true;
    else if (a[i] === "--probe-isolation") opts.probeIsolation = true;
    else if (a[i] === "--reports") opts.reports = a[++i];
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
    isolationMode: manifest.isolationMode,
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
 * A8 のプログラム一覧は webSiteId フィルタが効かない先例があるため（a8-browser.ts L371）、
 * レポートでも「サイト切替で数値が変わるか」を経験的に確かめる。
 * 判定材料を返すだけで、config は書き換えない（人間が決める）。
 */
async function probeIsolation(page, cfg) {
  const key = Object.keys(cfg.a8.reports)[0];
  await openReport(page, cfg, key);
  const before = await readVisibleSiteContext(page);
  const hasSiteColumn = (cfg.a8.siteColumnHeaders || []).some((h) => before.includes(h));
  return {
    probedReport: key,
    siteColumnHeaderVisible: hasSiteColumn,
    hint: hasSiteColumn
      ? "レポートにサイト列がある可能性 → isolationMode: 'site-column' を検討"
      : "サイト列は見当たらない → isolationMode: 'site-switch' のままサイト切替 assert で運用",
  };
}

/** 1 レポート分の取得。dry-run は検出のみ。 */
async function processReport(page, cfg, runId, runDir, { reportKey, dryRun }) {
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
    status: "pending",
    error: null,
  };

  unit.reportUrl = await openReport(page, cfg, reportKey);

  // レポート画面に到達しているか（ラベルの可視で判定）
  const body = await readVisibleSiteContext(page);
  const reachable = spec.menuLabels.some((l) => body.includes(l)) || body.includes(spec.label);
  if (!reachable) {
    await dumpFailure(page, cfg, runId, {
      step: "reach-report",
      expected: spec.menuLabels,
      message: `レポート「${spec.label}」に到達できない（URL/ラベルの UI 変更の可能性）`,
    });
    unit.status = "report-unreachable";
    unit.error = "レポート画面に到達できず";
    return unit;
  }

  // ★ ダウンロード直前にもサイト帰属を再確認（画面遷移でコンテキストが戻る事故を防ぐ）
  const site = await assertDobokuSite(page, cfg);
  if (!site.ok) {
    await dumpFailure(page, cfg, runId, {
      step: "assert-site-before-download",
      expected: [cfg.a8.targetSite],
      message: `サイト帰属を確定できない: ${site.reason}`,
    });
    unit.status = "site-mismatch";
    unit.error = site.reason;
    return unit;
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
    isolationMode: cfg.a8.isolationMode,
    mode: opts.dryRun ? "dry-run" : "fetch",
    browserHeadless: !opts.headed && cfg.browser.headless,
    scriptVersion: gitCommit(),
    units: [],
    dryRun: opts.dryRun ? { loggedIn: false, siteAsserted: false, isolation: null } : undefined,
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
          message: "ログイン待ちがタイムアウト。`npx tsx .claude/skills/ads/scout-asp/scripts/login.mjs` で再ログインしてください。",
        });
        console.error("未ログインのため停止しました。");
        manifest.status = "not-signed-in";
        finalize(manifest, runDir);
        process.exit(3);
      }
    }
    if (manifest.dryRun) manifest.dryRun.loggedIn = true;

    // ★ サイト帰属 assert（fail-closed）。まず切替を試み、確定できなければ全体停止。
    let site = await assertDobokuSite(page, cfg);
    if (!site.ok) {
      const sw = await switchToDobokuSite(page, cfg);
      if (sw.attempted) site = await assertDobokuSite(page, cfg);
    }
    if (!site.ok) {
      await dumpFailure(page, cfg, runId, {
        step: "assert-site",
        expected: [cfg.a8.targetSite],
        message: `サイト帰属を確定できない: ${site.reason}。stats47 のデータを取り込まないため停止。`,
      });
      console.error(`サイト不一致で停止: ${site.reason}`);
      console.error("→ .local/playwright-a8-debug/ の visible-text.txt を見て config の siteSwitcherLabels / isolationMode を調整してください。");
      manifest.status = "site-mismatch";
      finalize(manifest, runDir);
      process.exit(5);
    }
    if (manifest.dryRun) manifest.dryRun.siteAsserted = true;
    console.log(`サイト assert OK: ${cfg.a8.targetSite}`);

    if (opts.probeIsolation) {
      const probe = await probeIsolation(page, cfg);
      if (manifest.dryRun) manifest.dryRun.isolation = probe;
      manifest.isolationProbe = probe;
      console.log(`[probe] ${probe.hint}`);
    }

    for (const reportKey of reportKeys) {
      if (!cfg.a8.reports[reportKey]) {
        console.warn(`[warn] 未知の reportKey: ${reportKey}（config に無し・スキップ）`);
        continue;
      }
      const unit = await processReport(page, cfg, runId, runDir, { reportKey, dryRun: opts.dryRun });
      manifest.units.push(unit);
      console.log(`  ${reportKey}: ${unit.status}${unit.csvRows != null ? ` (${unit.csvRows} 行)` : ""}`);
    }

    manifest.status = "ok";
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
  console.log(`manifest: ${join(runDir, "manifest.json")}`);
}

main().catch((e) => {
  console.error("Fatal:", e?.message || e);
  process.exit(1);
});
