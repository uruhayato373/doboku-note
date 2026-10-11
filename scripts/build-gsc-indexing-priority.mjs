#!/usr/bin/env node
/**
 * build-gsc-indexing-priority.mjs — 登録リクエストの順位表を CI で毎週作る（オフライン・creds 不要）
 * ---------------------------------------------------------------------------
 * 入力: 最新の URL Inspection batch（index-coverage.yml が commit）＋最新の gsc-page（同 run が取得）
 *       ＋ public/_redirects（旧 /docs → 正規パス）＋ gsc-indexing/history.json（直近リクエストの cooldown）
 *       ＋ config/business-direction.json（重点資格＝期待値が同じときの弱い加点）
 * 出力: data/gsc/indexing-priority.json（順位・件数・型ごとの期待値と根拠・根拠ファイル）
 *       data/gsc/indexing-priority.txt （`gsc-indexing:request -- --file` にそのまま渡す）
 *
 * 並び: 表示実績のある未登録 → 表示 0 は「型ごとの期待値」降順（算定と型の定義は scripts/lib/gsc-indexing-priority.mjs）。
 * 内部リンク数は、サイトのビルド（out/）からしか数えられず CI のこの step には無いので渡していない（同じ期待値の中はパス昇順）。
 *
 * 人間の手順はこれだけ:
 *   npm run gsc-indexing:request -- --file data/gsc/indexing-priority.txt
 * 期限切れは `npm run check-gsc-indexing-due`（weekly-review-guard が毎週 surface）。
 *
 * §9: 入力が無ければ exit 1（順位表 0 件を成功にしない）。検査 0 件の batch・表示実績 0 行の gsc-page も入力不成立で exit 1。
 *     候補 0 件は正常（全部登録済み）で exit 0。
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { latestReportRef, readJsonOrReport } from "./lib/metric-reports.mjs";
import { parseLegacyRedirects } from "./lib/legacy-routes.mjs";
import { buildIndexingPriority, MIN_INDEXED_FOR_OWN_MEAN } from "./lib/gsc-indexing-priority.mjs";
import { readDataset, readDatasetIf, readLatest } from "./lib/dataset-io.mjs";
import { writeDataset } from "./lib/dataset-write.mjs";
import { datasetPath } from "./lib/datasets.mjs";
import { REPO_ROOT } from "./lib/repository-paths.mjs";

const REDIRECTS = join(REPO_ROOT, "public/_redirects");

const latestBatch = readLatest(REPO_ROOT, "gsc.url-inspection");
const gscPageFile = latestReportRef(REPO_ROOT, "gsc.page");
if (!latestBatch || !gscPageFile) {
  console.error(`[gsc-indexing-priority] ✗ 入力不足 batch=${latestBatch?.file ?? "なし"} gsc-page=${gscPageFile ?? "なし"}`);
  process.exit(1);
}
const batchFile = latestBatch.file;
const batch = latestBatch.data;
if (batch.partial === true) {
  console.error(`[gsc-indexing-priority] ✗ 最新 batch が partial（${batch.completed}/${batch.total}）。完走 batch を待つ`);
  process.exit(1);
}
if ((batch.results ?? []).length === 0) {
  console.error(`[gsc-indexing-priority] ✗ 最新 batch ${batchFile} は検査 0 件。候補 0 件（全部登録済み）と区別できないので順位表を作らない`);
  process.exit(1);
}
const gscPage = readJsonOrReport(REPO_ROOT, gscPageFile);
if ((gscPage.rows ?? []).length === 0) {
  console.error(`[gsc-indexing-priority] ✗ gsc-page ${gscPageFile} は 0 行。型ごとの期待値を算定できない（全部 0 になりパス昇順に戻る）`);
  process.exit(1);
}
const legacyRoutes = existsSync(REDIRECTS) ? parseLegacyRedirects(readFileSync(REDIRECTS, "utf8")) : new Map();
const requestRuns = readDatasetIf(REPO_ROOT, "gsc.indexing-history")?.runs ?? [];
const priorityQualifications = readDataset(REPO_ROOT, "config.business-direction").qualifications.map((q) => q.id);

const { counts, items, types } = buildIndexingPriority({ batchResults: batch.results, gscPageRows: gscPage.rows, legacyRoutes, requestRuns, priorityQualifications });

const out = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  batchFile: batchFile.replace(/\\/g, "/"),
  gscPageFile: gscPageFile.replace(/\\/g, "/"),
  gscPageWindow: { startDate: gscPage.meta?.startDate ?? null, endDate: gscPage.meta?.endDate ?? null },
  counts,
  // 表示 0 の並びの根拠。期待値 = 型の「登録済み 1 本あたり 28 日表示（最大の 1 本を除く平均）」× 型の未登録率。
  // 登録済みが minIndexedForOwnMean 本未満の型は上位のまとまりの平均で代用する（types[].basis=substitute・meanSource が代用元）
  priorityQualifications,
  minIndexedForOwnMean: MIN_INDEXED_FOR_OWN_MEAN,
  types,
  // JSON は先頭 200 件まで（週次 commit の差分を抑える）。全件は txt にある。
  items: items.slice(0, 200),
  itemsTruncated: items.length > 200,
};
const written = writeDataset(REPO_ROOT, "gsc.indexing-priority", out);
const txt = [
  `# gsc-indexing priority (generated ${out.generatedAt})`,
  `# batch=${out.batchFile} gsc-page=${out.gscPageFile}`,
  `# inspected=${counts.inspected} indexed=${counts.indexed} candidates=${counts.candidates} withDemand=${counts.withDemand} cooledDown=${counts.cooledDown}`,
  "# order=表示あり（表示降順）→ 型の期待値（降順）→ 重点資格 → パス昇順（根拠は indexing-priority.json の types）",
  ...items.map((i) => i.path),
  "",
].join("\n");
writeDataset(REPO_ROOT, "gsc.indexing-priority-list", txt);

const substituted = types.filter((t) => t.basis !== "own").length;
console.log(
  `[gsc-indexing-priority] batch=${out.batchFile} / gsc-page=${out.gscPageFile}\n` +
    `  検査 ${counts.inspected} 件 / 登録済み ${counts.indexed} / 候補 ${counts.candidates}（表示実績あり ${counts.withDemand}・cooldown 除外 ${counts.cooledDown}）\n` +
    `  型 ${types.length} 種（平均を上位のまとまりで代用 ${substituted} 種・重点資格 ${priorityQualifications.length} 件）→ ${written.file}`,
);
for (const i of items.slice(0, 10)) console.log(`  ${String(i.impressions).padStart(5)} impr ${String(i.clicks).padStart(3)} clk ev ${i.expectedValue.toFixed(1).padStart(5)} ${i.status.padEnd(20)} ${i.path}`);
if (items.length > 10) console.log(`  … 他 ${items.length - 10} 件 → ${datasetPath("gsc.indexing-priority-list")}`);
