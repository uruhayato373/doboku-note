/**
 * google-console-units.mjs — UI 取得 run の「完全性」判定の単一実装
 * ---------------------------------------------------------------------------
 * なぜ必要か（2026-07-30 新設）: fetch-gsc-ui-csv / fetch-ga4-ui-csv は例外が飛ばなければ
 * `manifest.status = "ok"` を無条件で立て、last-run マーカーも status に関わらず書いていた。
 * その結果 **0/10 で全滅した run でも「ok・◯日前」** として月次サイクルの時計がリセットされ、
 * check-gsc-ui-due が緑を返す＝失敗が完全に見えない状態だった（実際 7/10 の部分成功が "ok"）。
 * CLAUDE.md §9「検査ゼロを PASS と呼ばない」をこの経路に適用するため、分類と判定を 1 箇所に集約する。
 *
 * 分類の要点:
 *   - GSC の `row-not-found` は **正常なゼロ**（そのスコープに当該理由のページが無い）と
 *     **UI 変更で理由行を見つけられなかった**の両方を意味しうる。前者は失敗ではないので
 *     `zero` に分け、後者を拾うために「スコープ内で取得成功が 1 件も無い」を疑わしいと格上げする。
 *   - それ以外の非 downloaded（scope-switch-failed / ambiguous-row / drilldown-failed /
 *     export-button-* / csv-menu-* / empty-download / zip-no-table / download-failed / …）は
 *     すべて失敗。1 件でもあれば run は完全ではない。
 */

/** 取得できたユニット（実 download と dry-run 検出成功）。 */
const OK_STATUSES = new Set(["downloaded", "dry-ok"]);
/** 「対象が存在しない」= 正常なゼロとして扱う状態。 */
const ZERO_STATUSES = new Set(["row-not-found"]);
/** run 全体を止めた致命状態（ユニット分類より優先して最終 status になる）。 */
const FATAL_STATUSES = new Set([
  "not-signed-in",
  "property-mismatch",
  "page-indexing-unreachable",
  "error",
]);

export function isOkUnit(u) {
  return OK_STATUSES.has(u?.status);
}
export function isZeroUnit(u) {
  return ZERO_STATUSES.has(u?.status);
}
export function isFailedUnit(u) {
  return !isOkUnit(u) && !isZeroUnit(u);
}

/**
 * ユニット配列を ok / zero / failed に分け、スコープ別の内訳も返す。
 * `total` は「検査対象数」＝ §9 で必ず出力する数。
 */
export function classifyUnits(units = []) {
  const ok = units.filter(isOkUnit);
  const zero = units.filter(isZeroUnit);
  const failed = units.filter(isFailedUnit);

  const byScope = {};
  for (const u of units) {
    const key = u.scope || u.reportKey || u.key || "_";
    byScope[key] ??= { total: 0, ok: 0, zero: 0, failed: 0 };
    byScope[key].total += 1;
    if (isOkUnit(u)) byScope[key].ok += 1;
    else if (isZeroUnit(u)) byScope[key].zero += 1;
    else byScope[key].failed += 1;
  }

  return {
    total: units.length,
    okUnits: ok.length,
    zeroUnits: zero.length,
    failedUnits: failed.length,
    byScope,
    failedDetail: failed.map((u) => ({
      unit: `${u.scope ?? u.reportKey ?? u.key ?? "?"}:${u.issueKey ?? u.key ?? "?"}`,
      status: u.status ?? null,
      error: u.error ?? null,
    })),
    /** ok が 1 件も無いのに zero がある面（UI 変更で理由行を取り違えている疑い）。 */
    suspiciousScopes: Object.entries(byScope)
      .filter(([, s]) => s.ok === 0 && s.zero > 0)
      .map(([k]) => k),
  };
}

/**
 * run 全体の status を決める。
 *   fatal        … ログイン/プロパティ/到達不能など run を止めた状態をそのまま返す
 *   "no-units"   … 検査対象 0 件（config 誤り・引数誤り）＝ PASS にしてはいけない
 *   "error"      … 取得成功 0 件で失敗あり
 *   "partial"    … 失敗あり（取得成功も有る）／疑わしい面あり
 *   "empty"      … 失敗ゼロだが取得成功も 0 件（全部「対象なし」＝実質何も取れていない）
 *   "ok"         … 失敗ゼロかつ取得成功あり
 * `complete` は「この run で月次サイクルを満たしたと言えるか」＝ok のみ true。
 */
export function judgeRun({ units = [], fatalStatus = null } = {}) {
  const c = classifyUnits(units);
  let status;
  if (fatalStatus && FATAL_STATUSES.has(fatalStatus)) status = fatalStatus;
  else if (c.total === 0) status = "no-units";
  else if (c.failedUnits > 0 && c.okUnits === 0) status = "error";
  else if (c.failedUnits > 0 || c.suspiciousScopes.length > 0) status = "partial";
  else if (c.okUnits === 0) status = "empty";
  else status = "ok";
  return { ...c, status, complete: status === "ok" };
}

/** §9 準拠の 1 行サマリ（検査対象数と実取得数を必ず出す）。 */
export function formatRunSummary(judged, label = "run") {
  const s = `${label}: status=${judged.status} / 検査対象 ${judged.total} ユニット → 取得 ${judged.okUnits} ・対象なし ${judged.zeroUnits} ・失敗 ${judged.failedUnits}`;
  if (judged.suspiciousScopes.length) {
    return `${s}\n  [warn] 取得成功 0 件の面（UI 変更の疑い）: ${judged.suspiciousScopes.join(", ")}`;
  }
  return s;
}

/**
 * プロセス終了コード。0=完全・2=不完全（部分/空/対象なし）・3 以上は呼出側の致命コードを尊重。
 * 「不完全なのに exit 0」を作らないための共通写像。
 */
export function exitCodeFor(judged) {
  return judged.complete ? 0 : 2;
}

/** 旧スキーマ（v1/v2）のマーカーを legacy 記録へ畳み込む（履歴を捨てないため）。 */
function deriveLegacy(prev) {
  if (!prev) return null;
  if (prev.legacy) return prev.legacy; // すでに畳み込み済み
  if (prev.schemaVersion >= 3) return null;
  if (!prev.lastRun) return null;
  return {
    schemaVersion: prev.schemaVersion ?? 1,
    runId: prev.lastRun,
    collectedAt: prev.collectedAt ?? null,
    status: prev.status ?? null,
    complete: typeof prev.complete === "boolean" ? prev.complete : null,
    downloadedUnits: prev.downloadedUnits ?? null,
    totalUnits: prev.totalUnits ?? null,
    note: "旧スキーマで記録された取得。zero と failed が分離されていないため完全性は確定できない。",
  };
}

/**
 * 取得マーカー（committed・URL データは含めない）を組み立てる。
 *
 * **なぜ lastAttempt と lastComplete を分けるか（2026-07-30）**: 当初は 1 つの run 情報だけを
 * 書いていたため、未ログインで即中断した run が **直前の成功 run の記録を上書きして消した**
 * （実際 2026-07-23 の 7/10 記録が not-signed-in で消えた）。失敗は見えなければならないが、
 * 「最後にいつサイクルを満たしたか」も失ってはならないので両方を持つ。
 *   - lastAttempt  … 最後の実行（失敗も含む・毎回更新）
 *   - lastComplete … 最後に complete だった実行（complete な run のときだけ更新・失敗では保持）
 * 月次カデンスの年齢は lastComplete で測り、再取得の必要性は lastAttempt.complete で見る。
 */
export function buildMarker({ prev = null, channel, runId, collectedAt, judged, extra = {}, note }) {
  const attempt = {
    runId,
    collectedAt,
    status: judged.status,
    complete: judged.complete,
    totalUnits: judged.total,
    downloadedUnits: judged.okUnits,
    zeroUnits: judged.zeroUnits,
    failedUnits: judged.failedUnits,
    failedDetail: judged.failedDetail,
    suspiciousScopes: judged.suspiciousScopes,
    byScope: judged.byScope,
  };
  const lastComplete = judged.complete
    ? {
        runId,
        collectedAt,
        totalUnits: judged.total,
        downloadedUnits: judged.okUnits,
        zeroUnits: judged.zeroUnits,
      }
    : (prev?.lastComplete ?? null);

  return {
    schemaVersion: 3,
    channel,
    ...extra,
    lastAttempt: attempt,
    lastComplete,
    legacy: deriveLegacy(prev),
    // 後方互換フィールド（旧 reader 用・値は lastAttempt を指す）
    lastRun: attempt.runId,
    collectedAt: attempt.collectedAt,
    status: attempt.status,
    complete: attempt.complete,
    totalUnits: attempt.totalUnits,
    downloadedUnits: attempt.downloadedUnits,
    note:
      note ??
      "UI 取得の実行マーカー（URL データは含めない）。lastAttempt=最後の実行 / lastComplete=最後に完全だった実行。check-gsc-ui-due が参照。",
  };
}
