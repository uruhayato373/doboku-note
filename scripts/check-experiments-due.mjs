#!/usr/bin/env node
/**
 * check-experiments-due.mjs
 * ---------------------------------------------------------------------------
 * NSM 実験（`.claude/state/experiments.json`）のうち「再測定・裁定の期限が来ている」
 * ものを機械判定する surfacer。
 *
 * なぜ必要か: 実験の measure/close は `/nsm-experiment` の手動コマンドで、発火を
 * 促す仕組みが coverage 側（`check-gsc-ui-due`）・アフィリ側（`check-a8-report-due`）
 * にはあるのに実験側だけ無かった。結果として再測定の放置が 3 回実績化している:
 *   - EXP-002: 70 日放置 → 計測不能で cancelled（learnings に「再開条件・期限を明示
 *     しないと無期限滞留する」と自己記録）
 *   - EXP-003: 中間 measure 予定を 42 日放置
 *   - EXP-005: proposed のまま 4 週放置（2026-W31 レビューが「実験文化の形骸化」と明記）
 * weekly-review の Agent C はこの判定を LLM に委ねていたが、期限計算は決定的に
 * 決まる（CLAUDE.md §5「コードで決定できるものはサブエージェントに委ねない」）。
 * 新規 cron は作らない — weekly-review（唯一稼働のクラウド PDCA）から思い出させる。
 *
 * 判定（すべて experiments.json のフィールドのみで決定的に計算）:
 *   1. active(running/measuring) かつ next_check_date <= today  → 再測定の期限超過
 *   2. active かつ next_check_date 未設定 かつ started_at + 14日 <= today
 *                                                              → 期限未設定のまま滞留
 *   3. proposed かつ created_at + 21日 <= today                 → start か棄却かの裁定要求
 *   4. pending_user_actions が非空                              → issues[] に surface
 *      （status に関わらず。EXP-005 の「deploy 後に再計測」がこれで浮く）
 *
 * 使い方:
 *   npm run check-experiments-due                     # 1 行サマリ
 *   npm run check-experiments-due -- --json           # weekly-review 用 JSON
 *   npm run check-experiments-due -- --days 14        # active 滞留のしきい値
 *   npm run check-experiments-due -- --proposed-days 21
 * 常に exit 0（非ブロッキング surfacer）。
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const STORE = join(ROOT, ".claude/state/experiments.json");
const REVIEW = "/nsm-experiment measure <id>";

const args = process.argv.slice(2);
const WANT_JSON = args.includes("--json");

// `|| N` で書くと --days 0（常に DUE＝動作確認用）が falsy に潰れるので明示的に判定する
const numArg = (flag, fallback) => {
  const i = args.indexOf(flag);
  const parsed = i >= 0 && args[i + 1] != null ? Number.parseInt(args[i + 1], 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};
const STALE_ACTIVE_DAYS = numArg("--days", 14);
const STALE_PROPOSED_DAYS = numArg("--proposed-days", 21);

// 判定対象外＝すでに閉じた実験
const TERMINAL = new Set(["done", "completed", "cancelled", "canceled", "closed", "abandoned"]);
const ACTIVE = new Set(["running", "measuring"]);

/**
 * 日付パース。experiments.json は ISO datetime（2026-07-26T21:06:47.000Z）と
 * 日付のみ（2026-04-25 / next_check_date の 2026-05-30）が混在する。
 * ファイル名由来の T02-05-55 形式も来うるので a8 版と同じ正規化を通す。
 */
const parseDate = (v) => {
  if (!v) return NaN;
  const s = String(v).replace(/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/, "$1T$2:$3:$4");
  return Date.parse(s);
};
const daysBetween = (fromMs, toMs) => Math.floor((toMs - fromMs) / 86400000);

let store = null;
try {
  store = JSON.parse(readFileSync(STORE, "utf-8"));
} catch {
  store = null;
}
const experiments = Array.isArray(store?.experiments) ? store.experiments : [];
const now = Date.now();

const dueExperiments = [];
const issues = [];

for (const exp of experiments) {
  const id = exp?.id ?? "(no-id)";
  const status = String(exp?.status ?? "unknown");
  const title = String(exp?.title ?? "").slice(0, 60);

  // 4. 未処理の申し送りは status に関わらず surface（閉じた実験に残っていること自体が異常）
  const pending = Array.isArray(exp?.pending_user_actions) ? exp.pending_user_actions : [];
  if (pending.length > 0) {
    const head = String(pending[0]?.action ?? pending[0] ?? "").slice(0, 80);
    issues.push(`${id}: 未処理の申し送り ${pending.length}件（${head}）`);
  }

  if (TERMINAL.has(status)) continue;

  if (ACTIVE.has(status)) {
    const checkMs = parseDate(exp?.next_check_date);
    if (Number.isFinite(checkMs)) {
      // 1. 再測定の期限超過
      const overdue = daysBetween(checkMs, now);
      if (overdue >= 0) {
        dueExperiments.push({
          id,
          status,
          title,
          reason: "measure 期限超過",
          nextCheckDate: exp.next_check_date,
          overdueDays: overdue,
        });
      }
      continue;
    }
    // 2. next_check_date 未設定のまま滞留（EXP-002 の 70 日放置がこの型）
    const startedMs = parseDate(exp?.started_at);
    const age = Number.isFinite(startedMs) ? daysBetween(startedMs, now) : null;
    if (age == null || age >= STALE_ACTIVE_DAYS) {
      dueExperiments.push({
        id,
        status,
        title,
        reason: age == null ? "started_at 不正・next_check_date 未設定" : "next_check_date 未設定のまま滞留",
        startedAt: exp?.started_at ?? null,
        ageDays: age,
        thresholdDays: STALE_ACTIVE_DAYS,
      });
    }
    continue;
  }

  if (status === "proposed") {
    // 3. 提案のまま放置＝start するか棄却するかの裁定要求（EXP-005 の 4 週放置がこの型）
    const createdMs = parseDate(exp?.created_at);
    const age = Number.isFinite(createdMs) ? daysBetween(createdMs, now) : null;
    if (age == null || age >= STALE_PROPOSED_DAYS) {
      dueExperiments.push({
        id,
        status,
        title,
        reason: age == null ? "created_at 不正・proposed のまま" : "proposed のまま滞留（start か棄却の裁定要求）",
        createdAt: exp?.created_at ?? null,
        ageDays: age,
        thresholdDays: STALE_PROPOSED_DAYS,
      });
    }
  }
}

const due = dueExperiments.length > 0;

const result = {
  check: "experiments-due",
  thresholdDays: STALE_ACTIVE_DAYS,
  proposedThresholdDays: STALE_PROPOSED_DAYS,
  due,
  storeFound: store != null,
  totalExperiments: experiments.length,
  activeExperiments: experiments.filter((e) => ACTIVE.has(String(e?.status))).length,
  dueExperiments,
  issues,
  review: REVIEW,
  note: "measure/close は手動コマンド。自動遷移はさせない（裁定は人）＝surface のみ。",
};

if (WANT_JSON) {
  console.log(JSON.stringify(result, null, 2));
} else {
  if (store == null) {
    console.log("[実験再測定] SKIP: .claude/state/experiments.json を読めませんでした");
  } else if (due) {
    console.log(`[実験再測定] DUE: ${dueExperiments.length}件 → ${REVIEW}`);
    for (const e of dueExperiments) {
      const age = e.overdueDays != null ? `${e.overdueDays}日超過` : e.ageDays != null ? `${e.ageDays}日経過` : "日付不明";
      console.log(`  - ${e.id}（${e.status}・${age}）: ${e.reason}`);
    }
  } else {
    console.log(`[実験再測定] OK: 期限超過なし（active ${result.activeExperiments}件 / 全${experiments.length}件）`);
  }
  for (const i of issues) console.log(`  [要対応] ${i}`);
}
process.exit(0);
