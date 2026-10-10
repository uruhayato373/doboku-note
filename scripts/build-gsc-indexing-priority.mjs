#!/usr/bin/env node
/**
 * build-gsc-indexing-priority.mjs — 登録リクエストの順位表を CI で毎週作る（オフライン・creds 不要）
 * ---------------------------------------------------------------------------
 * 入力: 最新の URL Inspection batch（index-coverage.yml が commit）＋最新の gsc-page（同 run が取得）
 *       ＋ public/_redirects（旧 /docs → 正規パス）＋ gsc-indexing/history.json（直近リクエストの cooldown）
 * 出力: data/gsc/indexing-priority.json（順位・件数・根拠ファイル）
 *       data/gsc/indexing-priority.txt （`gsc-indexing:request -- --file` にそのまま渡す）
 *
 * 人間の手順はこれだけ:
 *   npm run gsc-indexing:request -- --file data/gsc/indexing-priority.txt
 * 期限切れは `npm run check-gsc-indexing-due`（weekly-review-guard が毎週 surface）。
 *
 * §9: 入力が無ければ exit 1（順位表 0 件を成功にしない）。候補 0 件は正常（全部登録済み）で exit 0。
 * ---------------------------------------------------------------------------
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { datasetPath, latestFile } from "./lib/datasets.mjs";
import { latestReportRef, readJsonOrReport } from "./lib/metric-reports.mjs";
import { parseLegacyRedirects } from "./lib/legacy-routes.mjs";
import { buildIndexingPriority } from "./lib/gsc-indexing-priority.mjs";
import { REPO_ROOT } from "./lib/repository-paths.mjs";

const PRIORITY_JSON = datasetPath("gsc.indexing-priority");
const PRIORITY_TXT = datasetPath("gsc.indexing-priority-list");
const REDIRECTS = join(REPO_ROOT, "public/_redirects");

const batchFile = latestFile(REPO_ROOT, "gsc.url-inspection");
const gscPageFile = latestReportRef(".", "gsc.page");
if (!batchFile || !gscPageFile) {
  console.error(`[gsc-indexing-priority] ✗ 入力不足 batch=${batchFile ?? "なし"} gsc-page=${gscPageFile ?? "なし"}`);
  process.exit(1);
}
const batch = JSON.parse(readFileSync(join(REPO_ROOT, batchFile), "utf8"));
if (batch.partial === true) {
  console.error(`[gsc-indexing-priority] ✗ 最新 batch が partial（${batch.completed}/${batch.total}）。完走 batch を待つ`);
  process.exit(1);
}
const gscPage = readJsonOrReport(".", gscPageFile);
const legacyRoutes = existsSync(REDIRECTS) ? parseLegacyRedirects(readFileSync(REDIRECTS, "utf8")) : new Map();
const historyPath = datasetPath("gsc.indexing-history");
const requestRuns = existsSync(historyPath) ? JSON.parse(readFileSync(historyPath, "utf8")).runs ?? [] : [];

const { counts, items } = buildIndexingPriority({ batchResults: batch.results ?? [], gscPageRows: gscPage.rows ?? [], legacyRoutes, requestRuns });

mkdirSync(dirname(PRIORITY_JSON), { recursive: true });
const out = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  batchFile: batchFile.replace(/\\/g, "/"),
  gscPageFile: gscPageFile.replace(/\\/g, "/"),
  gscPageWindow: { startDate: gscPage.meta?.startDate ?? null, endDate: gscPage.meta?.endDate ?? null },
  counts,
  // JSON は先頭 200 件まで（週次 commit の差分を抑える）。全件は txt にある。
  items: items.slice(0, 200),
  itemsTruncated: items.length > 200,
};
writeFileSync(PRIORITY_JSON, JSON.stringify(out, null, 2) + "\n", "utf8");
const txt = [
  `# gsc-indexing priority (generated ${out.generatedAt})`,
  `# batch=${out.batchFile} gsc-page=${out.gscPageFile}`,
  `# inspected=${counts.inspected} indexed=${counts.indexed} candidates=${counts.candidates} withDemand=${counts.withDemand} cooledDown=${counts.cooledDown}`,
  ...items.map((i) => i.path),
  "",
].join("\n");
writeFileSync(PRIORITY_TXT, txt, "utf8");

console.log(
  `[gsc-indexing-priority] batch=${out.batchFile} / gsc-page=${out.gscPageFile}\n` +
    `  検査 ${counts.inspected} 件 / 登録済み ${counts.indexed} / 候補 ${counts.candidates}（表示実績あり ${counts.withDemand}・cooldown 除外 ${counts.cooledDown}）`,
);
for (const i of items.slice(0, 10)) console.log(`  ${String(i.impressions).padStart(5)} impr ${String(i.clicks).padStart(3)} clk ${i.status.padEnd(20)} ${i.path}`);
if (items.length > 10) console.log(`  … 他 ${items.length - 10} 件 → ${PRIORITY_TXT}`);
