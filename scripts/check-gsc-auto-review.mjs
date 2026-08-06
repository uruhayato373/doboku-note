#!/usr/bin/env node
/**
 * check-gsc-auto-review.mjs
 * ---------------------------------------------------------------------------
 * GSC 計測「記録」の自動化（クラウドルーティン `doboku-note GSC auto review`・毎週金 12:00 JST）が
 * 沈黙していないかを、**repo 側から**機械判定する surfacer。
 *
 * なぜ必要か: ルーティンの生死はクラウド側にしか無く repo からは見えない（routines/SKILL.md）。
 * 実際 2026-07・08 の月次カバレッジ 2 回分は CI がデータを commit したのに誰も分析せず、
 * indexed_ratio が 81.6%→71.7% に落ちる間、観測ログへの記録がゼロだった。
 * データ取得（CI）が生きていても記録層が死ぬと同じ事故が再発するため、
 * 「取得できているのに記録されていない」を検知する。
 *
 * 2 チャネル:
 *   - weekly-auto  … 週次 performance 記録（metrics-analyzer → 観測ログ）
 *   - monthly-auto … 月次 coverage 記録（gsc-index-auditor → 観測ログ）
 *
 * 判定:
 *   weekly-auto  DUE = 週次見出しゼロ | 最新が THRESHOLD 日超前
 *   monthly-auto DUE = 最新 inspection-batch 以降の月次見出しが無く、batch から THRESHOLD 日超経過
 *     ※ しきい値 8 日の根拠: ルーティンは金曜発火・batch は毎月1日生成。1 日が土曜の月は
 *       最初の金曜が 7 日後 ＝ 5 日等の短いしきい値だと**正常動作でも DUE 誤検知**する。
 *
 * 手動エントリ（/gsc-review・/weekly-improve）も充足扱いにする。人が手で記録したなら
 * 「記録層が沈黙している」わけではないため（検知したいのは記録の欠落であって、実行主体ではない）。
 *
 * CLAUDE.md §9「検査ゼロを PASS と呼ばない」:
 *   走査した見出し数と該当数を必ず出力する。走査 0 件（ログ読めず・見出し形式の変更）は
 *   OK ではなく「検査不能」として DUE にする。緑の裏に判定の破損を隠さない。
 *
 * 使い方:
 *   npm run check-gsc-auto-review              # 人向けサマリ
 *   npm run check-gsc-auto-review -- --json    # weekly-review-guard / Issue 起票用 JSON
 *   npm run check-gsc-auto-review -- --days 8  # しきい値変更
 * 常に exit 0（非ブロッキング surfacer。赤落ちさせるのは呼び出し側の判断）。
 * ---------------------------------------------------------------------------
 */
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const LOG_PATH = ".claude/knowledge/reference/gsc-management.md";
const BATCH_DIR = ".claude/state/metrics/url-inspection";
const GSC_DIR = ".claude/state/metrics/gsc";
const ROUTINE = "doboku-note GSC auto review（クラウドルーティン・金 12:00 JST）";
/** ログが肥大化したら年次アーカイブを促す観測点（無限成長の早期警戒）。 */
const BLOAT_LINES = 800;

const args = process.argv.slice(2);
const WANT_JSON = args.includes("--json");
const di = args.indexOf("--days");
const THRESHOLD = di >= 0 && args[di + 1] ? parseInt(args[di + 1], 10) || 8 : 8;

/**
 * 観測・判断ログの見出しを走査する。
 * 実エントリの見出しは規約どおりではなく末尾に自由文が付く
 *   例) ### 2026-07-02（月次・/gsc-review — index 率の揺り戻し）
 * ため、日付と丸括弧の中身だけを取り出して中身をトークンで分類する（厳密一致にしない）。
 */
function scanHeadings(md) {
  const re = /^### (\d{4}-\d{2}-\d{2})（([^）]*)）/gm;
  const all = [];
  let m;
  while ((m = re.exec(md)) !== null) {
    const [, date, inner] = m;
    all.push({
      date,
      inner,
      weekly: inner.includes("週次") || inner.includes("/weekly-improve"),
      monthly: inner.includes("月次") || inner.includes("/gsc-review"),
      auto: inner.includes("自動レビュー"),
    });
  }
  return all;
}

/** ディレクトリ内 `prefix-YYYY-MM-DD...` の最新ファイルの日付を返す。 */
function latestStampedDate(dir, prefix) {
  let files;
  try {
    files = readdirSync(join(ROOT, dir));
  } catch {
    return null;
  }
  const dates = files
    .filter((f) => f.startsWith(prefix))
    .map((f) => f.slice(prefix.length).match(/^(\d{4}-\d{2}-\d{2})/)?.[1])
    .filter(Boolean)
    .sort();
  return dates.length ? dates[dates.length - 1] : null;
}

function daysSince(dateStr) {
  const ms = Date.parse(`${dateStr}T00:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  return Math.floor((Date.now() - ms) / 86400000);
}

// ── 入力の読み込み ────────────────────────────────────────────────
let md = null;
let readError = null;
try {
  md = readFileSync(join(ROOT, LOG_PATH), "utf-8");
} catch (e) {
  readError = e.message;
}

const headings = md ? scanHeadings(md) : [];
const logLines = md ? md.split(/\r?\n/).length : 0;
// 判定の破損: ログが読めない、または見出しを 1 件も認識できない（形式変更・セクション消失）。
const brokenInspection = md == null || headings.length === 0;

const latestBatch = latestStampedDate(BATCH_DIR, "inspection-batch-");
const latestGscQuery = latestStampedDate(GSC_DIR, "gsc-query-");

const weeklyEntries = headings.filter((h) => h.weekly);
const monthlyEntries = headings.filter((h) => h.monthly);

// ── weekly-auto ──────────────────────────────────────────────────
function evalWeekly() {
  const label = "GSC自動レビュー(週次)";
  const command = `対話セッションで /routines（list-first）→ 停止なら再作成 / 応急は /weekly-improve`;
  if (brokenInspection) {
    return {
      channel: "weekly-auto",
      label,
      due: true,
      reasons: [
        readError
          ? `検査不能（観測ログを読めない: ${readError}）`
          : "検査不能（見出し走査 0 件＝判定の破損。見出し形式の変更を疑う）",
      ],
      latestEntry: null,
      daysSince: null,
      count: 0,
      command,
    };
  }
  const latest = weeklyEntries.map((e) => e.date).sort().pop() ?? null;
  const age = latest ? daysSince(latest) : null;
  const reasons = [];
  if (!latest) reasons.push("週次エントリが 1 件も無い（未記録）");
  else if (age > THRESHOLD) reasons.push(`最新の週次記録から ${age}日（しきい値 ${THRESHOLD}日）`);
  return {
    channel: "weekly-auto",
    label,
    due: reasons.length > 0,
    reasons,
    latestEntry: latest,
    daysSince: age,
    count: weeklyEntries.length,
    command,
  };
}

// ── monthly-auto ─────────────────────────────────────────────────
function evalMonthly() {
  const label = "GSC自動レビュー(月次)";
  const command = `対話セッションで /routines（list-first）→ 停止なら再作成 / 応急は /gsc-review`;
  if (brokenInspection) {
    return {
      channel: "monthly-auto",
      label,
      due: true,
      reasons: [
        readError
          ? `検査不能（観測ログを読めない: ${readError}）`
          : "検査不能（見出し走査 0 件＝判定の破損。見出し形式の変更を疑う）",
      ],
      latestEntry: null,
      latestBatch,
      daysSinceBatch: null,
      count: 0,
      command,
    };
  }
  const latest = monthlyEntries.map((e) => e.date).sort().pop() ?? null;
  if (!latestBatch) {
    // データが無い ＝ 記録層の問題ではない（index-coverage.yml 側の話）。DUE にはしない。
    return {
      channel: "monthly-auto",
      label,
      due: false,
      reasons: ["inspection-batch が 1 件も無い（記録層ではなく index-coverage.yml 側の問題）"],
      latestEntry: latest,
      latestBatch: null,
      daysSinceBatch: null,
      count: monthlyEntries.length,
      command,
    };
  }
  // batch 日付以降に月次エントリがあれば記録済み。
  const logged = monthlyEntries.some((e) => e.date >= latestBatch);
  const ageBatch = daysSince(latestBatch);
  const reasons = [];
  if (!logged && ageBatch > THRESHOLD) {
    reasons.push(`batch ${latestBatch} の記録が無い（${ageBatch}日経過・しきい値 ${THRESHOLD}日）`);
  }
  return {
    channel: "monthly-auto",
    label,
    due: reasons.length > 0,
    reasons,
    logged,
    latestEntry: latest,
    latestBatch,
    daysSinceBatch: ageBatch,
    count: monthlyEntries.length,
    command,
  };
}

const channels = [evalWeekly(), evalMonthly()];
const bloat = logLines > BLOAT_LINES;

const result = {
  check: "gsc-auto-review",
  thresholdDays: THRESHOLD,
  anyDue: channels.some((c) => c.due),
  scannedHeadings: headings.length,
  logPath: LOG_PATH,
  logLines,
  bloat,
  latestBatch,
  latestGscQuery,
  routine: ROUTINE,
  channels,
  note: "記録層（観測ログへの追記）の沈黙検知。データ取得の停止は check-gsc-ui-due / fetch-metrics 側の担当。",
};

if (WANT_JSON) {
  console.log(JSON.stringify(result, null, 2));
} else {
  // §9: 走査件数と該当件数を必ず出す（緑の裏に検査ゼロを隠さない）。
  const scanned = `見出し走査 ${headings.length} 件`;
  for (const c of channels) {
    const counts = `${scanned}中 ${c.channel === "weekly-auto" ? "週次" : "月次"} ${c.count} 件`;
    if (c.due) {
      console.log(`[${c.label}] DUE: ${c.reasons.join(" / ")} → ${c.command}`);
      console.log(`  ${counts}・最新 ${c.latestEntry ?? "なし"}`);
    } else {
      const detail =
        c.channel === "weekly-auto"
          ? `最新 ${c.latestEntry}（${c.daysSince}日前・次回まで${Math.max(0, THRESHOLD - (c.daysSince ?? 0))}日）`
          : c.logged
            ? `batch ${c.latestBatch} は記録済み（最新月次 ${c.latestEntry}）`
            : `batch ${c.latestBatch} は未記録だが ${c.daysSinceBatch}日経過（しきい値 ${THRESHOLD}日・次の金曜待ち）`;
      console.log(`[${c.label}] OK: ${detail} — ${counts}`);
      if (c.reasons.length) console.log(`  注記: ${c.reasons.join(" / ")}`);
    }
  }
  if (bloat) {
    console.log(`[観測ログ] INFO: ${logLines} 行（${BLOAT_LINES} 行超）— 年次アーカイブを検討`);
  }
}
process.exit(0);
