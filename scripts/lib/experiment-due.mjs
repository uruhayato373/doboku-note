/**
 * experiment-due.mjs — NSM 実験台帳（.claude/state/experiments.json）の期限判定（純関数・唯一の実装）
 * ---------------------------------------------------------------------------
 * 2026-09-19（DN-0252）: check-experiment-due（weekly-review-guard が週次実行）と check-experiments-due
 * （週次スキル内だけ）が同じ判定を別々に実装し、同日に両方が同じ実験を「要対応」と出していた。
 * ここへ一本化し、後者の「measuring でも next_check_date 超過は MEASURE_DUE」を吸収する。
 *
 * 判定:
 *   MEASURE_DUE … status=running|measuring かつ next_check_date <= 基準日（running で未設定なら started_at から runningDays 経過）
 *   CLOSE_DUE   … status=measuring のまま最終更新から closeDays 超過
 *   DECIDE_DUE  … status=proposed のまま最終更新から proposeDays 超過（start か abandon の判断待ち）
 *   PENDING     … pending_user_actions が残っている（done/abandoned 以外）
 *   NO_BASELINE … running なのに baseline が無い＝前後比較が原理的にできない（§9 の同型）
 *   VERDICT_DUE … measure 仕様の自動計測（measure-experiments・CI）の事後窓が完了した＝裁定して close する番
 */
export const DEFAULT_THRESHOLDS = { runningDays: 28, closeDays: 14, proposeDays: 14 };

const daysBetween = (fromIso, nowMs) => {
  const ms = Date.parse(fromIso ?? '');
  return Number.isFinite(ms) ? Math.floor((nowMs - ms) / 86400000) : null;
};
const lastHistoryDate = (e) => e.history?.at(-1)?.date ?? e.started_at ?? e.created_at ?? null;

/** 1 実験の判定。nowMs は基準時刻（テストで固定する）。 */
export function judgeExperiment(e, nowMs = Date.now(), t = DEFAULT_THRESHOLDS) {
  const reasons = [];
  const st = e.status;
  const sinceStart = daysBetween(e.started_at ?? e.created_at, nowMs);
  const sinceTouch = daysBetween(lastHistoryDate(e), nowMs);

  if (st === 'running' || st === 'measuring') {
    const nc = e.next_check_date ? Date.parse(e.next_check_date) : null;
    if (nc != null && Number.isFinite(nc) && nc <= nowMs) {
      reasons.push({ kind: 'MEASURE_DUE', detail: `next_check_date ${String(e.next_check_date).slice(0, 10)} を超過` });
    } else if (st === 'running' && nc == null && sinceStart != null && sinceStart >= t.runningDays) {
      reasons.push({ kind: 'MEASURE_DUE', detail: `開始から ${sinceStart}日（next_check_date 未設定・しきい値 ${t.runningDays}日）` });
    }
  }
  if (st === 'running' && (!e.baseline || (typeof e.baseline === 'object' && Object.keys(e.baseline).length === 0))) {
    reasons.push({ kind: 'NO_BASELINE', detail: 'running だが baseline が無い＝前後比較ができない' });
  }
  if (st === 'measuring' && sinceTouch != null && sinceTouch >= t.closeDays) {
    reasons.push({ kind: 'CLOSE_DUE', detail: `measuring のまま ${sinceTouch}日（しきい値 ${t.closeDays}日）` });
  }
  if (st === 'proposed' && sinceTouch != null && sinceTouch >= t.proposeDays) {
    reasons.push({ kind: 'DECIDE_DUE', detail: `proposed のまま ${sinceTouch}日（start か abandon の判断待ち）` });
  }
  const finalAuto = (e.measurements ?? []).filter((m) => m?.source === 'auto' && m.complete);
  if ((st === 'running' || st === 'measuring') && finalAuto.length) {
    const m = finalAuto.at(-1);
    reasons.push({ kind: 'VERDICT_DUE', detail: `自動計測の事後窓が完了（${m.metric} ${m.pre?.value ?? '—'}→${m.post?.value ?? '—'}・目安 ${m.verdictHint}）。裁定して close する` });
  }
  const pending = Array.isArray(e.pending_user_actions) ? e.pending_user_actions : [];
  if (pending.length > 0 && st !== 'done' && st !== 'abandoned') {
    reasons.push({ kind: 'PENDING', detail: `要人手 ${pending.length} 件: ${pending.map((p) => p.action).join(' / ')}` });
  }
  const review = e.kind === 'seo-rank-watch'
    ? `npm run seo-rank-watch -- review --id ${e.watchId} --no-fetch`
    : `/nsm-experiment ${st === 'measuring' || reasons.some((r) => r.kind === 'VERDICT_DUE') ? 'close' : 'measure'} ${e.id}`;
  return {
    id: e.id, review, title: e.title, status: st, targetMetric: e.target_metric ?? null,
    nextCheckDate: e.next_check_date ?? null, daysSinceStart: sinceStart, daysSinceTouch: sinceTouch,
    due: reasons.length > 0, reasons,
  };
}

/** 台帳全体の判定。issues は PENDING の人向け 1 行（旧 check-experiments-due の互換）。 */
export function judgeLedger(experiments, nowMs = Date.now(), t = DEFAULT_THRESHOLDS) {
  const items = experiments.map((e) => judgeExperiment(e, nowMs, t));
  const due = items.filter((i) => i.due);
  const issues = items.flatMap((i) => i.reasons.filter((r) => r.kind === 'PENDING').map((r) => `${i.id}: ${r.detail}`));
  return { items, due, issues };
}
