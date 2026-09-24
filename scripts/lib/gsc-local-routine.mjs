import { collectFailedRequests } from "./report-honesty.mjs";

/**
 * gsc-local-routine.mjs（lib）— Mac の launchd で回す GSC 定期処理の判定（純関数）
 * ---------------------------------------------------------------------------
 * 実行は scripts/gsc-local-routine.mjs。ここは「今日は何をするか」「結果をどう読むか」だけを決める。
 * ---------------------------------------------------------------------------
 */

/** 送信の間隔。launchd は寝ていた分を起床時に 1 回だけ実行するので、手動実行と重ならないよう 20 時間空ける。 */
export const MIN_HOURS_BETWEEN_REQUESTS = 20;

/** history.json の runs から、直近に送信（mode=commit）した時刻を返す。無ければ null。 */
export function lastCommitRunAt(runs = []) {
  let latest = null;
  for (const r of runs) {
    if (r?.mode !== "commit") continue;
    // 未ログインで 1 件も送れなかった回は「送信」ではない。数えると再ログイン後も 20 時間送らない（2026-09-25 実測）
    if (r?.status === "not-signed-in") continue;
    const t = Date.parse(r.collectedAt ?? "");
    if (Number.isFinite(t) && (latest === null || t > latest)) latest = t;
  }
  return latest === null ? null : new Date(latest);
}

/** 今日の登録リクエストを送るか。送らない理由も返す。 */
export function decideIndexingRun({ runs = [], hasPriorityList, now = new Date(), minHours = MIN_HOURS_BETWEEN_REQUESTS }) {
  if (!hasPriorityList) return { run: false, reason: "順位表（priority-latest.txt）が無い＝index-coverage.yml がまだ作っていない" };
  const last = lastCommitRunAt(runs);
  if (last && now.getTime() - last.getTime() < minHours * 3600000) {
    return { run: false, reason: `前回の送信から ${Math.floor((now.getTime() - last.getTime()) / 3600000)} 時間（${minHours} 時間空ける）` };
  }
  return { run: true, reason: "送信する" };
}

/**
 * gsc-request-indexing.mjs の結果を読む。requests-latest.json の runId が変わっていなければ、
 * ブラウザを開く前に止まった（対象 0 件＝全部 14 日以内に送信済み、または起動エラー）。
 * @returns {{ outcome: 'sent'|'nothing-to-send'|'diagnosed'|'needs-login'|'failed', detail: string }}
 */
export function classifyIndexingResult({ exitCode, before, after }) {
  const ran = after && after.runId && after.runId !== before?.runId;
  if (!ran) {
    return exitCode === 2
      ? { outcome: "nothing-to-send", detail: "送る URL が無い（順位表の候補がすべて 14 日以内に送信済み）" }
      : { outcome: "failed", detail: `ブラウザを開く前に失敗（exit ${exitCode}）` };
  }
  const s = after.summary ?? {};
  if (after.status === "not-signed-in") return { outcome: "needs-login", detail: "Google に未ログイン" };
  if (after.status === "ok") return { outcome: "sent", detail: `受理 ${s.accepted ?? 0} 件・既に登録済み ${s.alreadyIndexed ?? 0} 件（exit ${exitCode}）` };
  if (after.status === "no-requests") {
    // 受理 0 件には「検査した URL がすべて登録済み」（正常）と「送信を試みて全部失敗」（ボタンが無い等）がある。
    // 失敗の判定は gsc-request-indexing 自身のサマリーと同じ collectFailedRequests に任せる（日次上限は失敗に数えない）。
    const failed = collectFailedRequests(after.items, { benignStatuses: ["accepted", "already-indexed", "limit-reached", "quota-exceeded"] });
    return failed.length
      ? { outcome: "failed", detail: `送信に失敗 ${failed.length} 件（${[...new Set(failed.map((i) => i.request.status))].join(", ")}）` }
      : { outcome: "nothing-to-send", detail: `検査 ${s.inspected ?? 0} 件がすべて登録済み、または日次上限` };
  }
  if (after.status === "dry-ok") return { outcome: "diagnosed", detail: `--dry-run の診断 ${s.inspected ?? 0} 件（送信なし）` };
  return { outcome: "failed", detail: `status=${after.status}（exit ${exitCode}）` };
}

/** 月次の UI CSV 取得（fetch-gsc-ui-csv）の exit code を読む。0=完全 2=不完全 3=未ログイン 5=property 不一致 6=到達不能。 */
export function classifyUiFetchExit(code) {
  if (code === 0) return { outcome: "complete", normalize: true };
  if (code === 2) return { outcome: "incomplete", normalize: true };
  if (code === 3) return { outcome: "needs-login", normalize: false };
  return { outcome: "failed", normalize: false };
}
