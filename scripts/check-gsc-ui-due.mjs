#!/usr/bin/env node
/**
 * check-gsc-ui-due.mjs
 * ---------------------------------------------------------------------------
 * Google コンソール UI 取得（Playwright・ローカル専用）の月次サイクルが期限切れかを機械判定する surfacer。
 * 対象は 2 チャネル:
 *   - gsc-ui  … GSC「ページのインデックス登録」理由別 CSV（必須・既定 30 日）
 *   - ga4-ui  … GA4 標準レポート CSV（**任意**＝一次経路は Data API。年齢では DUE にしない）
 *
 * なぜ surfacer か: 本取得は Playwright + Google ログイン必須の **ローカル専用・人間 in the loop**
 * ＝CI cron 化できない（`.claude/knowledge/reference/gsc-management.md` の CI 例外）。よって「自動で回る」のでは
 * なく **手動の月次儀式**にするしかなく、放置防止のため weekly-review（唯一稼働のクラウド PDCA）
 * から「そろそろ月次 GSC UI 取得の時期」を思い出させる。新規 cron は作らない（クラウド最小化方針）。
 *
 * 判定（2026-07-30 改訂・**完全性を見る**）:
 *   DUE = マーカー無し（未実施）
 *       | 経過日数 >= しきい値
 *       | **complete !== true**（部分成功・空・失敗・中断）
 *   旧実装は collectedAt の経過日数だけを見ていたため、0/10 で全滅した run でも 30 日の時計が
 *   リセットされ「OK: 前回◯日前」と緑になった（実際 7/10 の部分成功が status:"ok" で記録されていた）。
 *   CLAUDE.md §9「検査ゼロを PASS と呼ばない」をこの判定に適用する。
 *   後方互換: schemaVersion 1 のマーカー（complete フィールド無し）は downloadedUnits/totalUnits から
 *   完全性を復元する（両方揃っていて一致すれば complete 扱い・不明なら不完全＝安全側）。
 *
 * 使い方:
 *   npm run check-gsc-ui-due                 # 人向けサマリ
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
const REVIEW = "/google-search-growth（ローカル・要 Google ログイン）";

const CHANNELS = [
  {
    key: "gsc-ui",
    label: "GSC UI 取得",
    marker: ".claude/state/metrics/gsc-ui/last-run.json",
    // 年齢でも DUE にする（月次の本体）
    ageDriven: true,
    command: "npm run search-growth:audit",
  },
  {
    key: "ga4-ui",
    label: "GA4 UI 取得",
    marker: ".claude/state/metrics/ga4-ui/last-run.json",
    // 一次経路は Data API なので「古い」だけでは DUE にしない。未実施/不完全のときだけ surface する。
    ageDriven: false,
    command: "npm run ga4-ui:fetch",
  },
];

const args = process.argv.slice(2);
const WANT_JSON = args.includes("--json");
const di = args.indexOf("--days");
const THRESHOLD = di >= 0 && args[di + 1] ? parseInt(args[di + 1], 10) || 30 : 30;

/** runId 形式（2026-07-23T22-59-15Z）も ISO も受ける。 */
function parseStamp(s) {
  if (!s) return NaN;
  return Date.parse(String(s).replace(/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})/, "$1T$2:$3:$4"));
}

/**
 * マーカーを schemaVersion 差を吸収して {attempt, complete} に読み替える。
 *   v3 … lastAttempt / lastComplete をそのまま使う（正）。
 *   v2 … 単一 run 情報。complete=true なら「その run が最後の完全」とみなす。
 *   v1 … complete が無い。downloadedUnits===totalUnits なら完全とみなし、判定できなければ
 *         **不完全に倒す**（zero と failed が分離されていない以上、緑にしてはいけない）。
 */
function readMarkerShape(marker) {
  if (marker == null) return { attempt: null, complete: null, legacy: null };
  if (marker.schemaVersion >= 3) {
    return { attempt: marker.lastAttempt ?? null, complete: marker.lastComplete ?? null, legacy: marker.legacy ?? null };
  }
  const attempt = {
    runId: marker.lastRun ?? null,
    collectedAt: marker.collectedAt ?? null,
    status: marker.status ?? null,
    complete:
      typeof marker.complete === "boolean"
        ? marker.complete
        : typeof marker.downloadedUnits === "number" &&
            typeof marker.totalUnits === "number" &&
            marker.totalUnits > 0
          ? marker.downloadedUnits === marker.totalUnits
          : false,
    totalUnits: marker.totalUnits ?? null,
    downloadedUnits: marker.downloadedUnits ?? null,
    zeroUnits: marker.zeroUnits ?? null,
    failedUnits: marker.failedUnits ?? null,
    failedDetail: marker.failedDetail ?? null,
    suspiciousScopes: marker.suspiciousScopes ?? null,
  };
  return {
    attempt,
    complete: attempt.complete
      ? {
          runId: attempt.runId,
          collectedAt: attempt.collectedAt,
          totalUnits: attempt.totalUnits,
          downloadedUnits: attempt.downloadedUnits,
        }
      : null,
    legacy: marker.legacy ?? null,
  };
}

function evaluate(ch) {
  let marker = null;
  try {
    marker = JSON.parse(readFileSync(join(ROOT, ch.marker), "utf-8"));
  } catch {
    marker = null;
  }
  const { attempt, complete, legacy } = readMarkerShape(marker);

  // 月次カデンスの年齢は **最後に完全だった取得**で測る（失敗した実行で時計をリセットさせない）。
  const completeIso = complete?.collectedAt ?? null;
  const completeMs = parseStamp(completeIso);
  const daysSinceComplete = Number.isFinite(completeMs)
    ? Math.floor((Date.now() - completeMs) / 86400000)
    : null;
  // 参考: 最後の実行（失敗込み）からの日数。
  const attemptIso = attempt?.collectedAt ?? attempt?.runId ?? null;
  const attemptMs = parseStamp(attemptIso);
  const daysSinceAttempt = Number.isFinite(attemptMs) ? Math.floor((Date.now() - attemptMs) / 86400000) : null;

  const never = attempt == null;
  const neverComplete = complete == null;
  const stale = ch.ageDriven && (daysSinceComplete == null || daysSinceComplete >= THRESHOLD);
  const lastFailed = attempt != null && attempt.complete !== true;
  const due = never || neverComplete || stale || lastFailed;

  const reasons = [];
  if (never) reasons.push("未実施（マーカー無し）");
  else if (neverComplete) {
    reasons.push(
      legacy?.runId
        ? `完全な取得の記録が無い（旧スキーマの ${legacy.runId} は 取得 ${legacy.downloadedUnits ?? "?"}/${legacy.totalUnits ?? "?"} で完全性未確定）`
        : "完全な取得の記録が無い",
    );
  } else if (stale) reasons.push(`最後の完全取得から ${daysSinceComplete}日（しきい値 ${THRESHOLD}日）`);
  if (lastFailed && attempt) {
    reasons.push(
      `直近の実行が不完全: ${attempt.status ?? "?"}（取得 ${attempt.downloadedUnits ?? "?"}/${attempt.totalUnits ?? "?"}・失敗 ${attempt.failedUnits ?? "?"}）`,
    );
  }

  return {
    channel: ch.key,
    label: ch.label,
    ageDriven: ch.ageDriven,
    due,
    reasons,
    // 最後の実行
    lastRun: attempt?.runId ?? null,
    lastAttemptAt: attemptIso,
    daysSinceAttempt,
    status: attempt?.status ?? null,
    attemptComplete: attempt?.complete ?? null,
    totalUnits: attempt?.totalUnits ?? null,
    downloadedUnits: attempt?.downloadedUnits ?? null,
    zeroUnits: attempt?.zeroUnits ?? null,
    failedUnits: attempt?.failedUnits ?? null,
    failedDetail: attempt?.failedDetail ?? null,
    suspiciousScopes: attempt?.suspiciousScopes ?? null,
    // 最後に完全だった取得（カデンスの基準）
    lastCompleteRun: complete?.runId ?? null,
    collectedAt: completeIso,
    daysSince: daysSinceComplete,
    legacy,
    command: ch.command,
  };
}

const channels = CHANNELS.map(evaluate);
const result = {
  check: "gsc-ui-due",
  thresholdDays: THRESHOLD,
  // 後方互換: 既存の weekly-review / skills は result.due（GSC UI 本体）を読む。
  due: channels.find((c) => c.channel === "gsc-ui")?.due ?? true,
  lastRun: channels.find((c) => c.channel === "gsc-ui")?.lastRun ?? null,
  collectedAt: channels.find((c) => c.channel === "gsc-ui")?.collectedAt ?? null,
  daysSince: channels.find((c) => c.channel === "gsc-ui")?.daysSince ?? null,
  downloadedUnits: channels.find((c) => c.channel === "gsc-ui")?.downloadedUnits ?? null,
  anyDue: channels.some((c) => c.due),
  channels,
  review: REVIEW,
  note: "ローカル専用・要 Google ログイン。クラウド週次では実行不可＝surface のみ。complete=false は再取得が必要。",
};

if (WANT_JSON) {
  console.log(JSON.stringify(result, null, 2));
} else {
  for (const c of channels) {
    // §9: 「何件検査した run だったか」を必ず出す（緑の裏に検査ゼロを隠さない）。
    const counts =
      c.totalUnits != null
        ? `検査 ${c.totalUnits} ユニット中 取得 ${c.downloadedUnits ?? "?"}・対象なし ${c.zeroUnits ?? "?"}・失敗 ${c.failedUnits ?? "?"}`
        : "件数不明";
    if (c.due) {
      console.log(`[${c.label}] DUE: ${c.reasons.join(" / ")} → ${c.command}（${REVIEW}）`);
      if (c.lastAttemptAt) console.log(`  直近の実行 ${c.lastAttemptAt}（${c.daysSinceAttempt}日前）: ${counts}`);
      if (c.collectedAt) console.log(`  最後の完全取得 ${c.collectedAt}（${c.daysSince}日前）`);
      else console.log(`  最後の完全取得: なし`);
      for (const f of c.failedDetail ?? []) console.log(`  [failed] ${f.unit} status=${f.status} ${f.error ?? ""}`);
    } else {
      console.log(
        `[${c.label}] OK: 最後の完全取得 ${c.collectedAt}（${c.daysSince}日前${
          c.ageDriven ? `・次回まで${Math.max(0, THRESHOLD - (c.daysSince ?? 0))}日` : "・年齢では DUE にしない"
        }）— ${counts}`,
      );
    }
  }
}
process.exit(0);
