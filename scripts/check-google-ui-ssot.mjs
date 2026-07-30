#!/usr/bin/env node
/**
 * check-google-ui-ssot.mjs — GSC/GA4 UI 取得の追跡 SSOT の整合ゲート
 * ---------------------------------------------------------------------------
 * 何を守るか:
 *   1. **検査ゼロを PASS と呼ばない**（CLAUDE.md §9）。SSOT が空／history が空なら exit 1。
 *      「1 ユニットも無い」状態が緑になると「取得できている」と誤読される。
 *   2. last-run.json ↔ ssot/history.json ↔ ssot/urls/*.json の runId 整合。
 *      取得だけ走って正規化を忘れた（＝SSOT が古い）状態を検出する。
 *   3. urls/*.json のスキーマ健全性（rows 配列・exportedRows 一致・runId/collectedAt 有り）。
 *   4. 前回取得が不完全（complete:false）なら FAIL。取り切れていない状態を緑にしない。
 *   5. truncated（GSC の 1,000 件上限に当たった）ユニットは WARN（データが頭打ち＝解釈注意）。
 *
 * gsc-ui は必須チャネル、ga4-ui は任意チャネル（一次経路は Data API）。
 * 任意チャネルは「SSOT が存在するのに壊れている」ときだけ FAIL し、未実施は INFO。
 *
 * 使い方:
 *   npm run check-google-ui-ssot
 *   npm run check-google-ui-ssot -- --json
 * exit 0=OK / 1=不整合（CI・pre-commit で止める用）
 * ---------------------------------------------------------------------------
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  listUnitSsot,
  readUnitSsot,
  readHistory,
  readMarker,
  ssotDir,
} from "./lib/google-console-ssot.mjs";

const WANT_JSON = process.argv.includes("--json");
const CHANNELS = [
  { key: "gsc-ui", required: true, label: "GSC UI" },
  { key: "ga4-ui", required: false, label: "GA4 UI" },
];

const errors = [];
const warnings = [];
const infos = [];
// 実際に検査した対象数。0 のまま終わったら「検査不成立」として exit 1（§9）。
let checked = 0;
const report = [];

for (const ch of CHANNELS) {
  const marker = readMarker(ch.key);
  const history = readHistory(ch.key);
  const units = listUnitSsot(ch.key);
  const hasSsot = existsSync(ssotDir(ch.key));

  const entry = {
    channel: ch.key,
    required: ch.required,
    markerRunId: marker?.lastRun ?? null,
    markerComplete: marker?.complete ?? null,
    historyRuns: history?.runs?.length ?? 0,
    latestHistoryRunId: history?.runs?.at(-1)?.runId ?? null,
    unitFiles: units.length,
    totalRows: 0,
    truncatedUnits: [],
    staleUnits: [],
  };

  if (!hasSsot && !marker) {
    if (ch.required) {
      errors.push(`[${ch.label}] SSOT もマーカーも無い（未実施）。\`npm run search-growth:audit\` を実行してください。`);
    } else {
      infos.push(`[${ch.label}] 未実施（任意チャネル・一次経路は GA4 Data API）。`);
    }
    report.push(entry);
    continue;
  }

  // (1) 検査ゼロの検出
  if (units.length === 0) {
    const msg = `[${ch.label}] ssot/urls/*.json が 0 件（正規化されていない）。取得後に \`npm run google-console:normalize -- --latest\` が必要。`;
    if (ch.required) errors.push(msg);
    else warnings.push(msg);
  }
  if (!history || (history.runs ?? []).length === 0) {
    const msg = `[${ch.label}] ssot/history.json が空（run 履歴なし）。`;
    if (ch.required) errors.push(msg);
    else warnings.push(msg);
  }

  // (4) 直近の実行の完全性（schemaVersion 3 は lastAttempt / lastComplete が正）
  // v1/v2 マーカーは run id を `lastRun` に持つので `runId` へ写像する（そうしないと表示が "?" になる）。
  const attempt =
    marker == null
      ? null
      : marker.schemaVersion >= 3
        ? marker.lastAttempt
        : { ...marker, runId: marker.lastRun ?? null };
  const lastComplete = marker?.schemaVersion >= 3 ? marker.lastComplete : null;
  entry.attemptRunId = attempt?.runId ?? null;
  entry.attemptComplete = attempt?.complete ?? null;
  entry.lastCompleteRunId = lastComplete?.runId ?? null;

  if (attempt && attempt.complete === false) {
    errors.push(
      `[${ch.label}] 直近の実行が不完全（run=${attempt.runId ?? "?"} status=${attempt.status ?? "?"} / 失敗 ${attempt.failedUnits ?? "?"} ユニット）。再取得が必要。`,
    );
  } else if (attempt && attempt.complete == null) {
    warnings.push(
      `[${ch.label}] マーカーが旧スキーマ（complete 無し・取得 ${attempt.downloadedUnits ?? "?"}/${attempt.totalUnits ?? "?"}）。次回取得で解消される。`,
    );
  }
  if (marker && marker.schemaVersion >= 3 && !lastComplete) {
    errors.push(`[${ch.label}] 完全な取得の記録が無い（lastComplete=null）。サイクルが一度も満たされていない。`);
  }

  // (2) runId 整合 — 成功した実行だけを history と突合する（失敗実行は正規化されないのが正常）。
  if (attempt?.complete === true && attempt.runId && entry.latestHistoryRunId && attempt.runId !== entry.latestHistoryRunId) {
    errors.push(
      `[${ch.label}] 完全だった run（${attempt.runId}）と history 最新（${entry.latestHistoryRunId}）が不一致＝取得後の正規化もれ。`,
    );
  }

  // (3) 各ユニットのスキーマ健全性
  for (const u of units) {
    checked += 1;
    const doc = readUnitSsot(ch.key, u.key);
    if (!doc) {
      errors.push(`[${ch.label}] ${u.key}: JSON として読めない。`);
      continue;
    }
    if (!Array.isArray(doc.rows)) {
      errors.push(`[${ch.label}] ${u.key}: rows が配列でない。`);
      continue;
    }
    if (!doc.runId || !doc.collectedAt) {
      errors.push(`[${ch.label}] ${u.key}: runId / collectedAt が欠落（いつのデータか特定できない）。`);
    }
    if (typeof doc.exportedRows === "number" && doc.exportedRows !== doc.rows.length) {
      errors.push(`[${ch.label}] ${u.key}: exportedRows ${doc.exportedRows} と rows ${doc.rows.length} が不一致。`);
    }
    const missingUrl = doc.rows.filter((r) => !r?.url).length;
    if (missingUrl > 0) {
      errors.push(`[${ch.label}] ${u.key}: url 欠落 ${missingUrl} 行。`);
    }
    entry.totalRows += doc.rows.length;
    if (doc.truncated) entry.truncatedUnits.push(u.key);
    // 最新 run より古いユニット＝その理由/スコープが今回取れていない
    const refRun = lastComplete?.runId ?? (attempt?.complete === true ? attempt.runId : null);
    if (refRun && doc.runId && doc.runId !== refRun) entry.staleUnits.push(u.key);
  }

  if (entry.truncatedUnits.length) {
    warnings.push(
      `[${ch.label}] 1,000 件上限に当たったユニット ${entry.truncatedUnits.length} 件（データ頭打ち・全量ではない）: ${entry.truncatedUnits.join(", ")}`,
    );
  }
  if (entry.staleUnits.length) {
    warnings.push(
      `[${ch.label}] 最新 run で更新されなかったユニット ${entry.staleUnits.length} 件（前回値のまま）: ${entry.staleUnits.join(", ")}`,
    );
  }
  report.push(entry);
}

if (WANT_JSON) {
  console.log(
    JSON.stringify(
      { check: "google-ui-ssot", checkedUnits: checked, errors, warnings, infos, channels: report },
      null,
      2,
    ),
  );
} else {
  for (const i of infos) console.log(`[check-google-ui-ssot] INFO ${i}`);
  for (const w of warnings) console.log(`[check-google-ui-ssot] WARN ${w}`);
  for (const e of errors) console.error(`[check-google-ui-ssot] ERROR ${e}`);
  for (const r of report) {
    console.log(
      `[check-google-ui-ssot] ${r.channel}: ユニット ${r.unitFiles} 件 / ${r.totalRows} 行 / run 履歴 ${r.historyRuns} 件` +
        `（marker run=${r.markerRunId ?? "なし"} complete=${r.markerComplete ?? "?"}）`,
    );
  }
}

if (errors.length > 0) {
  if (!WANT_JSON) console.error(`\n[check-google-ui-ssot] ✗ ${errors.length} 件の不整合`);
  process.exit(1);
}
// §9: 何も検査していないのに緑を返さない。
if (checked === 0) {
  if (!WANT_JSON) {
    console.error("\n[check-google-ui-ssot] ✗ 検査対象 0 ユニット（SSOT が空）。取得と正規化が未実施です。");
  }
  process.exit(1);
}
if (!WANT_JSON) console.log(`\n[check-google-ui-ssot] ✓ ${checked} ユニットを検査・整合（WARN ${warnings.length} 件）`);
process.exit(0);
