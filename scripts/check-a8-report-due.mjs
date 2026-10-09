#!/usr/bin/env node
/**
 * check-a8-report-due.mjs
 * ---------------------------------------------------------------------------
 * A8 成果レポートの取り込みが止まっていないかを機械判定する surfacer。
 *
 * 取得は `login-collectors.yml`（週次・火 06:20 JST・JST の前月と当月）が CI で回し、手動の `/a8-report`
 * と workflow の `month` 入力が補う。A8 は公開 API が無く Playwright＋暗号化したログイン状態で取るので、
 * 取得・正規化・書き戻しのどこかが黙って止まりうる。日次の ops 点検（quality-audit の ops:true）がこれを読む。
 *
 * 判定: `data/a8/ui-last-run.json`（committed マーカー）の
 *       collectedAt から経過日数 >= しきい値（台帳 a8.ui-last-run の freshness.warnDays）で DUE。マーカー無ければ DUE(初回/未実施)。
 *       加えて、取得の後に台帳（report-log）が進んでいない＝正規化か書き戻しが止まった状態（collectPublishGap）と、
 *       最新の取得が ok でないことを [要対応] に出す（2026-10-04〜06 は取得が成功し書き戻しだけ落ちた・DN-0566）。
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
import { join } from "node:path";

import { classifyCrossCheck, collectPublishGap } from "./lib/report-honesty.mjs";
import { datasetPath, freshnessDays } from "./lib/datasets.mjs";
import { REPO_ROOT as ROOT } from "./lib/repository-paths.mjs";

const MARKER = join(ROOT, datasetPath("a8.ui-last-run"));
const LOG = join(ROOT, datasetPath("a8.report-log"));
const REVIEW = "gh workflow run login-collectors.yml -f service=a8（CI）か /a8-report（ローカル・要 A8 ログイン）";

const args = process.argv.slice(2);
const WANT_JSON = args.includes("--json");
const di = args.indexOf("--days");
// `|| 30` で書くと --days 0（常に DUE＝動作確認用）が falsy に潰れるので明示的に判定する
const parsedDays = di >= 0 && args[di + 1] != null ? Number.parseInt(args[di + 1], 10) : NaN;
// 既定は台帳 a8.ui-last-run の freshness.warnDays（--days で一時的に変えられる）
const THRESHOLD = Number.isFinite(parsedDays) && parsedDays >= 0 ? parsedDays : freshnessDays("a8.ui-last-run", "warnDays");

const readJsonOrNull = (p) => {
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
};

const marker = readJsonOrNull(MARKER);
const log = readJsonOrNull(LOG);

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
const pub = collectPublishGap(marker, log);
if (pub.gap) {
  issues.push(
    `取得（${pub.markerAt}）の後に台帳 report-log が進んでいない（最終更新 ${pub.logAt ?? "なし"}）＝正規化か develop への書き戻しが止まった。` +
      "login-collectors の publish ジョブと automation-failure Issue を確かめる",
  );
}
if (marker && !pub.lastRunOk) {
  issues.push(`最新の取得が ok でない（status=${pub.lastStatus ?? "不明"}・取れたレポート ${marker.downloadedUnits ?? "-"}/${marker.totalUnits ?? "-"}）`);
}
if (shortfall) {
  const sf = log?.crossCheck?.shortfall ?? {};
  issues.push(
    `未登録プログラムの疑い（サイト別との不足 click ${sf.clicks ?? "-"} / 確定額 ${sf.revenueYen ?? "-"}` +
      (candidates.length ? `・候補 ${candidates.map((c) => c.programId).join(", ")}` : "") +
      "）",
  );
}
// 超過は口座横断レポートの性質上ふつうに起きる。大きさで「想定内」と「異常」を分ける。
// 判定は scripts/lib/report-honesty.mjs（純関数・tests/report-honesty.test.mjs で固定）。
const cc = classifyCrossCheck(log?.crossCheck);
const EXCESS_RATIO_LIMIT = cc.limit;
const { siteClicks, excessClicks, excessRatio, abnormal: excessAbnormal } = cc;
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
  publishGap: pub.gap,
  lastStatus: pub.lastStatus,
  issues,
  notes,
  review: REVIEW,
  note: "取得は login-collectors.yml（週次・前月と当月）。手動は workflow の month 入力か /a8-report。surface のみ。",
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
// --fail-on-due: 期限切れなら exit 1（quality-audit の ops:true が日次で読む＝週次レビューから移した点検・DN-0394）。既定は従来どおり常に exit 0。
process.exit(args.includes("--fail-on-due") && due ? 1 : 0);
