#!/usr/bin/env node
/**
 * check-gsc-ui-due.mjs
 * ---------------------------------------------------------------------------
 * GSC「ページのインデックス登録」理由別 UI CSV の取得（/google-search-growth）が
 * 月次サイクル（既定30日）に対して期限切れかを機械判定する surfacer。
 *
 * なぜ surfacer か: 本取得は Playwright + Google ログイン必須の **ローカル専用・人間 in the loop**
 * ＝CI cron 化できない（`docs/reference/gsc-management.md` の CI 例外）。よって「自動で回る」のでは
 * なく **手動の月次儀式**にするしかなく、放置防止のため weekly-review（唯一稼働のクラウド PDCA）
 * から「そろそろ月次 GSC UI 取得の時期」を思い出させる。新規 cron は作らない（クラウド最小化方針）。
 *
 * 判定: `.claude/state/metrics/gsc-ui/last-run.json`（committed マーカー・fetch-gsc-ui-csv が更新）の
 *       collectedAt から経過日数 >= しきい値（既定30日）で DUE。マーカー無ければ DUE(初回/未実施)。
 *
 * 使い方:
 *   npm run check-gsc-ui-due                 # 1 行サマリ
 *   npm run check-gsc-ui-due -- --json       # weekly-review 用 JSON
 *   npm run check-gsc-ui-due -- --days 30    # しきい値変更
 * 常に exit 0（非ブロッキング surfacer）。
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MARKER = join(ROOT, ".claude/state/metrics/gsc-ui/last-run.json");
const REVIEW = "/google-search-growth（ローカル・要 Google ログイン）";

const args = process.argv.slice(2);
const WANT_JSON = args.includes("--json");
const di = args.indexOf("--days");
const THRESHOLD = di >= 0 && args[di + 1] ? parseInt(args[di + 1], 10) || 30 : 30;

let marker = null;
try {
  marker = JSON.parse(readFileSync(MARKER, "utf-8"));
} catch {
  marker = null;
}

const lastIso = marker?.collectedAt || marker?.lastRun || null;
const lastMs = lastIso ? Date.parse(lastIso.replace(/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/, "$1T$2:$3:$4")) : NaN;
const daysSince = Number.isFinite(lastMs) ? Math.floor((Date.now() - lastMs) / 86400000) : null;
const due = marker == null || daysSince == null || daysSince >= THRESHOLD;

const result = {
  check: "gsc-ui-due",
  thresholdDays: THRESHOLD,
  due,
  lastRun: marker?.lastRun ?? null,
  collectedAt: lastIso,
  daysSince,
  downloadedUnits: marker?.downloadedUnits ?? null,
  review: REVIEW,
  note: "ローカル専用・要 Google ログイン。クラウド週次では実行不可＝surface のみ。",
};

if (WANT_JSON) {
  console.log(JSON.stringify(result, null, 2));
} else if (due) {
  console.log(
    lastIso
      ? `[GSC UI 取得] DUE: 前回 ${lastIso}（${daysSince}日前・しきい値${THRESHOLD}日）→ 次セッションで ${REVIEW}`
      : `[GSC UI 取得] DUE: 未実施（マーカーなし）→ 次セッションで ${REVIEW}`,
  );
} else {
  console.log(`[GSC UI 取得] OK: 前回 ${lastIso}（${daysSince}日前・次回まで${THRESHOLD - daysSince}日）`);
}
process.exit(0);
