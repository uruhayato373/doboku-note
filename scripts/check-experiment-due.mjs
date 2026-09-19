#!/usr/bin/env node
/**
 * check-experiment-due.mjs — 「計測→記録→改善→**再計測**」の最後の輪を閉じる surfacer
 * ---------------------------------------------------------------------------
 * なぜ必要か（2026-07-30 新設）: PDCA の仕組み自体は既にある
 * （`/nsm-experiment` propose→start→measure→close ＋ `.claude/state/experiments.json`）。
 * 欠けていたのは **「期限が来た実験を誰が思い出すか」** だけだった。実際:
 *   - EXP-004 は `next_check_date` 2026-05-30 に対し measure が 05-30、close が 06-26（27日放置）
 *   - EXP-005 は 2026-07-26 に `pending_user_actions`（deploy 後の再計測）が積まれたまま
 * 改善を打っても再計測されなければサイクルは閉じず、学びが台帳に入らない。
 *
 * そこで **新しい仕組みは作らず**、既存台帳を読んで期限超過だけを surface する
 * （`check-gsc-ui-due` と同じ形＝weekly-review が読む・cron は増やさない）。
 *
 * 判定:
 *   MEASURE_DUE … status=running かつ next_check_date <= 今日（または started_at から N 日経過）
 *   CLOSE_DUE   … status=measuring のまま closeGraceDays 超過
 *   DECIDE_DUE  … status=proposed のまま proposeGraceDays 超過（start か abandon の判断待ち）
 *   PENDING     … pending_user_actions が残っている（status に関わらず要人手）
 *   NO_BASELINE … running なのに baseline が無い＝前後比較が原理的にできない（§9 の同型）
 *
 * 使い方:
 *   npm run check-experiment-due
 *   npm run check-experiment-due -- --json
 * 常に exit 0（非ブロッキング surfacer）。
 * ---------------------------------------------------------------------------
 */
import { readFileSync, existsSync } from "node:fs";
import { judgeLedger } from "./lib/experiment-due.mjs";

const LEDGER = ".claude/state/experiments.json";
const argv = process.argv.slice(2);
const WANT_JSON = argv.includes("--json");
const num = (flag, def) => {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] ? parseInt(argv[i + 1], 10) || def : def;
};
// 既定値: 介入から 28 日で GSC の窓が入れ替わる＝再計測の最短。measuring / proposed の放置上限は 14 日。
const RUNNING_GRACE = num("--running-days", 28);
const CLOSE_GRACE = num("--close-days", 14);
const PROPOSE_GRACE = num("--propose-days", 14);

if (!existsSync(LEDGER)) {
  console.error(`[check-experiment-due] ✗ 台帳が無い: ${LEDGER}`);
  process.exit(0);
}
const ledger = JSON.parse(readFileSync(LEDGER, "utf8"));
const experiments = Array.isArray(ledger.experiments) ? ledger.experiments : [];

// 判定は scripts/lib/experiment-due.mjs（純関数・唯一の実装）。§9: 検査対象数を必ず出す。
const { items, due, issues } = judgeLedger(experiments, Date.now(), { runningDays: RUNNING_GRACE, closeDays: CLOSE_GRACE, proposeDays: PROPOSE_GRACE });

const result = {
  check: "experiment-due",
  thresholds: { runningDays: RUNNING_GRACE, closeDays: CLOSE_GRACE, proposeDays: PROPOSE_GRACE },
  totalExperiments: items.length,
  byStatus: items.reduce((a, i) => ((a[i.status] = (a[i.status] ?? 0) + 1), a), {}),
  dueCount: due.length,
  due,
  // 旧 check-experiments-due（2026-09-19 に統合・削除）の互換: PENDING を人向け 1 行で
  issues,
  review: "/nsm-experiment measure <id> / close <id>（PDCA の再計測フェーズ）",
};

if (WANT_JSON) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(
    `[実験サイクル] 台帳 ${items.length} 件を検査（${Object.entries(result.byStatus).map(([k, v]) => `${k}:${v}`).join(" / ")}）`,
  );
  if (items.length === 0) {
    console.log("  台帳が空（＝実験が 1 件も登録されていない。異常なしではない）");
  } else if (due.length === 0) {
    console.log("  期限超過なし");
  }
  for (const i of due) {
    console.log(`  DUE ${i.id} [${i.status}] ${i.title}`);
    for (const r of i.reasons) console.log(`      ${r.kind}: ${r.detail}`);
    console.log(`      → ${i.review}`);
  }
}
process.exit(0);
