#!/usr/bin/env node
/**
 * check-gsc-indexing-due.mjs — 登録リクエスト（人間・1 日 10 件）の放置検知 surfacer
 * ---------------------------------------------------------------------------
 * CI が作る順位表（priority-latest.json）に「表示実績のある未登録 URL」が残っているのに、
 * 直近 7 日に受理された登録リクエストが無ければ DUE。weekly-review-guard が毎週 job summary に出す。
 * 送信そのものは Google がAPIを提供しないため CI 化できない（gsc-management.md「CI 例外」）。
 *
 * 使い方:
 *   npm run check-gsc-indexing-due            # 人向け
 *   npm run check-gsc-indexing-due -- --json  # weekly-review 用
 * 常に exit 0（非ブロッキング surfacer）。順位表が無いときは「検査不能」として DUE に出す。
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync } from "node:fs";
import { datasetPath } from "./lib/datasets.mjs";
import { evaluateIndexingDue } from "./lib/gsc-indexing-priority.mjs";

const args = process.argv.slice(2);
const JSON_OUT = args.includes("--json");
const di = args.indexOf("--days");
const thresholdDays = di >= 0 && args[di + 1] ? parseInt(args[di + 1], 10) || 7 : 7;

const pPath = datasetPath("gsc.indexing-priority");
const hPath = datasetPath("gsc.indexing-history");
const priority = existsSync(pPath) ? JSON.parse(readFileSync(pPath, "utf8")) : null;
const requestRuns = existsSync(hPath) ? JSON.parse(readFileSync(hPath, "utf8")).runs ?? [] : [];

const verdict = evaluateIndexingDue({ priority, requestRuns, thresholdDays });
const command = `npm run gsc-indexing:request -- --file ${datasetPath("gsc.indexing-priority-list")}（ローカル・Google ログイン必須・10 件/回）`;
const result = { channel: "gsc-indexing", label: "GSC 登録リクエスト", generatedAt: priority?.generatedAt ?? null, thresholdDays, ...verdict, command };

if (JSON_OUT) {
  console.log(JSON.stringify(result, null, 2));
} else {
  const top = (priority?.items ?? []).filter((i) => i.impressions > 0).slice(0, 5);
  console.log(`[${result.label}] ${result.due ? "DUE" : "OK"}: ${result.reasons.join(" / ")}`);
  if (priority) console.log(`  順位表 ${priority.generatedAt}（batch ${priority.batchFile}）: 候補 ${priority.counts.candidates} / 表示実績あり ${priority.counts.withDemand}`);
  for (const i of top) console.log(`  ${String(i.impressions).padStart(5)} impr  ${i.status.padEnd(20)} ${i.path}`);
  if (result.due) console.log(`  → ${command}`);
}
// --fail-on-due: 期限切れなら exit 1（quality-audit の ops:true が日次で読む＝週次レビューから移した点検・DN-0394）。既定は従来どおり常に exit 0。
process.exit(process.argv.includes("--fail-on-due") && result.due ? 1 : 0);
