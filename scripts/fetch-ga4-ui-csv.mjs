#!/usr/bin/env node
/**
 * fetch-ga4-ui-csv.mjs — GA4 標準レポートの UI CSV を取得（ローカル専用・バックアップ経路）
 * ---------------------------------------------------------------------------
 * GA4 の一次経路は Data API（`npm run fetch-ga4-data`）。本スクリプトは API で再現できない
 * 探索レポートや UI 表示との照合、管理画面設定確認のための**限定的な**バックアップ。
 *
 * 取得対象（config.ga4.reports）:
 *   - Reports > Acquisition > Traffic acquisition
 *   - Reports > Engagement > Landing page
 *   - Reports > Engagement > Events
 *
 * CLI:
 *   node scripts/fetch-ga4-ui-csv.mjs --dry-run
 *   node scripts/fetch-ga4-ui-csv.mjs --reports trafficAcquisition,landingPage
 *   node scripts/fetch-ga4-ui-csv.mjs --headed
 *
 * 安全弁:
 *   - property は URL の p{propertyId} で決定的に指定し、可視でも assert。
 *   - 28 日窓・Asia/Tokyo をレポートの meta に記録。
 *   - download は page.waitForEvent("download")。
 *   - 設定変更ボタンは押さない（閲覧・エクスポートのみ）。
 *   - 候補が一意でなければ dump→停止。API を優先した旨を manifest に残す。
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";
import {
  loadConfig,
  launchContext,
  dumpFailure,
  downloadTo,
  findUniqueByLabels,
  makeRunId,
} from "./lib/google-console-browser.mjs";
import { parseCsv } from "./lib/google-console-csv.mjs";

const STATE_DIR = ".claude/state/metrics/ga4-ui";

function parseArgs() {
  const a = process.argv.slice(2);
  const opts = { dryRun: false, headed: false, reports: "all" };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === "--dry-run") opts.dryRun = true;
    else if (a[i] === "--headed") opts.headed = true;
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

/** Asia/Tokyo 基準の 28 日窓（前日終端）。 */
function tokyoWindow(days) {
  const now = new Date(Date.now() + 9 * 3600 * 1000); // UTC+9
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end), timezone: "Asia/Tokyo" };
}

function reportsHome(cfg) {
  return `https://analytics.google.com/analytics/web/#/p${cfg.ga4.propertyId}/reports/intelligenthome`;
}

async function assertProperty(page, cfg) {
  const url = page.url();
  if (url.includes(`/p${cfg.ga4.propertyId}`)) return true;
  const body = await page.locator("body").innerText().catch(() => "");
  if (body.includes(cfg.ga4.propertyId)) return true;
  const err = new Error(`GA4 property ${cfg.ga4.propertyId} が URL/画面に見当たりません。`);
  err.code = "GA4_PROPERTY_MISMATCH";
  throw err;
}

async function main() {
  const opts = parseArgs();
  const cfg = loadConfig();
  const runId = makeRunId();
  const runDir = join(STATE_DIR, runId);
  mkdirSync(runDir, { recursive: true });

  const reportKeys =
    opts.reports === "all"
      ? Object.keys(cfg.ga4.reports)
      : opts.reports.split(",").map((s) => s.trim()).filter(Boolean);

  const window = tokyoWindow(cfg.ga4.windowDays || 28);
  const manifest = {
    schemaVersion: 1,
    runId,
    collectedAt: new Date().toISOString(),
    propertyId: cfg.ga4.propertyId,
    mode: opts.dryRun ? "dry-run" : "fetch",
    browserHeadless: !opts.headed && cfg.browser.headless,
    scriptVersion: gitCommit(),
    window,
    apiPreferred: true,
    apiNote:
      "一次経路は GA4 Data API（npm run fetch-ga4-data）。本 UI CSV は API で再現できない探索/照合用のバックアップ。",
    units: [],
  };

  console.log(`GA4 UI CSV 取得 [${manifest.mode}] reports=${reportKeys.join(",")}（API 優先・UI はバックアップ）`);
  const ctx = await launchContext(cfg, { headless: opts.headed ? false : cfg.browser.headless });
  const page = ctx.pages()[0] ?? (await ctx.newPage());

  try {
    await page.goto(reportsHome(cfg), { waitUntil: "domcontentloaded", timeout: cfg.browser.timeoutMs });
    await page.waitForTimeout(3000);

    try {
      await assertProperty(page, cfg);
    } catch (e) {
      await dumpFailure(page, cfg, runId, {
        step: "assert-ga4-property",
        expected: [cfg.ga4.propertyId],
        message: e.message,
      });
      console.error(`GA4 property 不一致で停止: ${e.message}`);
      manifest.status = "property-mismatch";
      finalize(manifest, runDir);
      process.exit(5);
    }

    for (const key of reportKeys) {
      const labels = cfg.ga4.reports[key];
      const unit = await processReport(page, cfg, runId, runDir, { key, labels, dryRun: opts.dryRun, window });
      manifest.units.push(unit);
      await page.goto(reportsHome(cfg), { waitUntil: "domcontentloaded", timeout: cfg.browser.timeoutMs }).catch(() => {});
      await page.waitForTimeout(2000);
    }
    manifest.status = "ok";
  } catch (e) {
    await dumpFailure(page, cfg, runId, { step: "unexpected", message: e?.message || String(e) });
    manifest.status = "error";
    manifest.error = String(e?.message || e).slice(0, 300);
  } finally {
    await ctx.close();
  }

  finalize(manifest, runDir);
  const okUnits = manifest.units.filter((u) => u.status === "downloaded").length;
  console.log(`\n完了: status=${manifest.status} / download 成功 ${okUnits}/${manifest.units.length}`);
  console.log(`manifest: ${join(runDir, "manifest.json")}`);
}

async function processReport(page, cfg, runId, runDir, { key, labels, dryRun, window }) {
  const base = {
    reportKey: key,
    reportLabel: labels[0],
    window,
    rawFile: null,
    sha256: null,
    csvRows: null,
    status: "pending",
    error: null,
  };

  // レポートを開く
  const link = await findUniqueByLabels(page, labels, { roles: ["link", "treeitem", "button", "tab"] });
  if (!link.locator) {
    base.status = "report-not-found";
    base.error = `候補 ${link.count}`;
    return base;
  }
  await link.locator.click().catch(() => {});
  await page.waitForTimeout(3000);

  // 共有/エクスポート → CSV
  const shareBtn = await findUniqueByLabels(page, ["共有", "Share", "エクスポート", "Export", "この レポートを共有", "Download"], {
    roles: ["button", "link"],
  });
  base.exportButtonUnique = shareBtn.count === 1;
  if (!shareBtn.locator) {
    base.status = "export-button-not-found";
    base.error = `候補 ${shareBtn.count}`;
    if (!dryRun) {
      await dumpFailure(page, cfg, runId, {
        step: "ga4-find-export",
        expected: ["共有 / Share / Download"],
        message: `共有/エクスポート候補が ${shareBtn.count} 件`,
        candidateCount: shareBtn.count,
      });
    }
    return base;
  }
  await shareBtn.locator.click().catch(() => {});
  await page.waitForTimeout(800);
  const csvItem = await findUniqueByLabels(page, ["CSV をダウンロード", "CSVをダウンロード", "Download CSV", "Download file"], {
    roles: ["menuitem", "button", "link", "option"],
  });
  base.csvMenuDetected = !!csvItem.locator;

  if (dryRun) {
    await page.keyboard.press("Escape").catch(() => {});
    base.status = csvItem.locator ? "dry-ok" : "csv-menu-not-found";
    return base;
  }

  if (!csvItem.locator) {
    await dumpFailure(page, cfg, runId, {
      step: "ga4-select-csv",
      expected: ["CSV をダウンロード / Download CSV"],
      message: `CSV メニュー項目が ${csvItem.count} 件`,
      candidateCount: csvItem.count,
    });
    base.status = "csv-menu-ambiguous";
    return base;
  }

  const destName = `${key}--${runId}.csv`;
  const destPath = join(runDir, destName);
  try {
    const dl = await downloadTo(page, () => csvItem.locator.click(), destPath, { timeout: 90000 });
    base.rawFile = destName;
    base.sha256 = dl.sha256;
    const { rows } = parseCsv(existsSync(destPath) ? readFileSync(destPath, "utf-8") : "");
    base.csvRows = rows.length;
    base.status = "downloaded";
  } catch (e) {
    await dumpFailure(page, cfg, runId, { step: "ga4-download", message: e?.message || String(e) });
    base.status = "download-failed";
    base.error = String(e?.message || e).slice(0, 200);
  }
  return base;
}

function finalize(manifest, runDir) {
  writeFileSync(join(runDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf-8");
}

main().catch((e) => {
  console.error("Fatal:", e?.message || e);
  process.exit(1);
});
