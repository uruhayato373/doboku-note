#!/usr/bin/env node
/**
 * check-a8-report-due.mjs
 * ---------------------------------------------------------------------------
 * A8 成果レポートの取り込み（`/a8-report`）が月次サイクル（既定30日）に対して
 * 期限切れかを機械判定する surfacer。
 *
 * なぜ surfacer か: A8 は公開 API が無く、取得は Playwright + A8 ログイン必須の
 * **ローカル専用・人間 in the loop** ＝ CI cron 化できない。よって「自動で回る」のではなく
 * **手動の月次儀式**にするしかなく、放置防止のため weekly-review（唯一稼働のクラウド PDCA）
 * から「そろそろ A8 成果の取り込み時期」を思い出させる。新規 cron は作らない。
 * （`check-gsc-ui-due.mjs` と同じ思想・同じ形）
 *
 * 判定: `.claude/state/metrics/affiliate/a8-ui/last-run.json`（committed マーカー）の
 *       collectedAt から経過日数 >= しきい値で DUE。マーカー無ければ DUE(初回/未実施)。
 *
 * 追加で surface するもの（A8 固有・放置すると静かに壊れる）:
 *   - `crossCheck.hasShortfall`＝サイト別を allowlist で説明しきれていない＝未登録プログラムの疑い
 *   - `crossCheck.exceeded`＝口座横断（stats47 込み）の合計がサイト別を上回っている状態。
 *     **これは構造的に必ず起きる**（program-detail は口座単位で、A8 にはサイト切替が無い）。
 *     2026-08-04 まで無条件に「[要対応] 他サイト混入の疑い」を出していたが、毎回赤が出て
 *     何も対処できない＝偽赤だった。対処は既に済んでいる（案件別の分母は GA4 を使う・
 *     affiliate-operations.md §6.5）。そこで**超過の大きさ**で分ける:
 *       超過 ≦ サイト別クリックの 50% … 想定内。INFO として比率だけ出す
 *       超過 > 50%                     … 想定を超えた混入 or 写像ミスの疑いとして [要対応]
 *
 * 使い方:
 *   npm run check-a8-report-due                 # 1 行サマリ
 *   npm run check-a8-report-due -- --json       # weekly-review 用 JSON
 *   npm run check-a8-report-due -- --days 30
 * 常に exit 0（非ブロッキング surfacer）。
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const MARKER = join(ROOT, ".claude/state/metrics/affiliate/a8-ui/last-run.json");
const LOG = join(ROOT, ".claude/state/metrics/affiliate/a8-report-log.json");
const REVIEW = "/a8-report（ローカル・要 A8 ログイン）";

const args = process.argv.slice(2);
const WANT_JSON = args.includes("--json");
const di = args.indexOf("--days");
// `|| 30` で書くと --days 0（常に DUE＝動作確認用）が falsy に潰れるので明示的に判定する
const parsedDays = di >= 0 && args[di + 1] != null ? Number.parseInt(args[di + 1], 10) : NaN;
const THRESHOLD = Number.isFinite(parsedDays) && parsedDays >= 0 ? parsedDays : 30;

const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
};

const marker = readJson(MARKER);
const log = readJson(LOG);

const lastIso = marker?.collectedAt || marker?.lastRun || null;
const lastMs = lastIso
  ? Date.parse(String(lastIso).replace(/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/, "$1T$2:$3:$4"))
  : NaN;
const daysSince = Number.isFinite(lastMs) ? Math.floor((Date.now() - lastMs) / 86400000) : null;
const due = marker == null || daysSince == null || daysSince >= THRESHOLD;

// 取りこぼしの客観シグナルは「サイト別を allowlist で説明しきれていない不足分」。
// 口座横断レポートの未写像そのものは stats47 分を含むので指標にしない。
const candidates = Array.isArray(log?.missingProgramCandidates) ? log.missingProgramCandidates : [];
const shortfall = log?.crossCheck?.hasShortfall === true;
const exceeded = log?.crossCheck?.exceeded === true;

const issues = [];
if (shortfall) {
  const sf = log?.crossCheck?.shortfall ?? {};
  issues.push(
    `未登録プログラムの疑い（サイト別との不足 click ${sf.clicks ?? "-"} / 確定額 ${sf.revenueYen ?? "-"}` +
      (candidates.length ? `・候補 ${candidates.map((c) => c.programId).join(", ")}` : "") +
      "）",
  );
}
// 超過は口座横断レポートの性質上ふつうに起きる。大きさで「想定内」と「異常」を分ける。
const EXCESS_RATIO_LIMIT = 0.5;
const siteClicks = Number(log?.crossCheck?.deltas?.clicks?.site ?? 0);
const excessClicks = Number(log?.crossCheck?.deltas?.clicks?.delta ?? 0);
const excessRatio = exceeded && siteClicks > 0 ? excessClicks / siteClicks : null;
const excessAbnormal = exceeded && excessRatio != null && excessRatio > EXCESS_RATIO_LIMIT;
const notes = [];
if (excessAbnormal) {
  issues.push(
    `crossCheck 超過が想定を超える（口座横断 ${excessClicks} click 超過＝サイト別 ${siteClicks} の ` +
      `${Math.round(excessRatio * 100)}%・上限 ${EXCESS_RATIO_LIMIT * 100}%）。programIdMap の写像ミス or 新たな共用案件を疑う`,
  );
} else if (exceeded) {
  notes.push(
    `crossCheck 超過 ${excessClicks} click（サイト別 ${siteClicks} の ${excessRatio != null ? Math.round(excessRatio * 100) : "?"}%）＝` +
      `口座横断レポートに stats47 が含まれるため想定内。案件別の分母は GA4 を使う（affiliate-operations.md §6.5）`,
  );
}

const result = {
  check: "a8-report-due",
  thresholdDays: THRESHOLD,
  due,
  lastRun: marker?.lastRun ?? null,
  collectedAt: lastIso,
  daysSince,
  downloadedUnits: marker?.downloadedUnits ?? null,
  missingProgramCandidates: candidates.length,
  crossCheckShortfall: shortfall,
  crossCheckExceeded: exceeded,
  crossCheckExcessClicks: exceeded ? excessClicks : 0,
  crossCheckExcessRatio: excessRatio,
  crossCheckExcessAbnormal: excessAbnormal,
  issues,
  notes,
  review: REVIEW,
  note: "ローカル専用・要 A8 ログイン。A8 は公開 API 無しでクラウド週次では実行不可＝surface のみ。",
};

if (WANT_JSON) {
  console.log(JSON.stringify(result, null, 2));
} else {
  if (due) {
    console.log(
      lastIso
        ? `[A8 成果取込] DUE: 前回 ${lastIso}（${daysSince}日前・しきい値${THRESHOLD}日）→ 次セッションで ${REVIEW}`
        : `[A8 成果取込] DUE: 未実施（マーカーなし）→ 次セッションで ${REVIEW}`,
    );
  } else {
    console.log(`[A8 成果取込] OK: 前回 ${lastIso}（${daysSince}日前・次回まで${THRESHOLD - daysSince}日）`);
  }
  for (const i of issues) console.log(`  [要対応] ${i}`);
  for (const n of notes) console.log(`  [想定内] ${n}`);
}
process.exit(0);
