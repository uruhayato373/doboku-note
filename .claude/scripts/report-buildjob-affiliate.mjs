#!/usr/bin/env node
/**
 * report-buildjob-affiliate.mjs — BuildJob（＋競合転職案件）のアフィリ クリック/EPC 週次レポート
 *
 * BuildJob 収益最大化スプリント（docs/project/04_運営/09_BuildJob収益最大化スプリント.md）P2。
 * 「どの面（サイドバー/記事末/本文中間/hub）が・どのページが BuildJob クリックを生んでいるか」を
 * オフラインで 1 レポートにまとめ、A8 成果スナップショットと突合して推定 EPC（報酬/クリック）を出す。
 * 期間中（〜2026-08-31）は高意図 slug が BuildJob 100% のため、面別クリックの伸びを毎週追える。
 *
 * 入力（最新スナップショットを自動選択・オフライン・ネットワーク不要）:
 *   - .claude/state/metrics/ga4/ga4-cta-clicks-by-label-*.json  （label × eventName × eventCount）
 *       ※ 面別ラベルは fetch-ga4-cta-clicks --by-label で取得（要 GA4 event_label カスタムディメンション）。
 *   - .claude/state/metrics/ga4/ga4-cta-clicks-*.json           （pagePath × eventName × eventCount・page 別）
 *   - .claude/state/metrics/affiliate/a8-results.json           （A8 成果の月次手動スナップショット）
 *
 * 出力:
 *   - .claude/state/metrics/affiliate/buildjob-report-latest.md  （面別/ページ別/EPC サマリ）
 *   - コンソールにサマリ
 *
 * usage: node .claude/scripts/report-buildjob-affiliate.mjs
 *
 * 注: 計測は本番でのみ発火し、デプロイ後にクリックが蓄積してから値が入る（導入直後 0 件は正常）。
 *     GA4 by-label が未登録で全ラベル "(not set)" のときは面別内訳が出せない旨を明示して継続する。
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const GA4_DIR = ".claude/state/metrics/ga4";
const AFF_DIR = ".claude/state/metrics/affiliate";

/** プログラム分類: data-cta-label（面別 trackLabel or CareerAffiliate の service 名）→ プログラム。 */
const PROGRAM_BY_LABEL = new Map([
  // BuildJob（面別 trackLabel）
  ["BuildJob-sidebar", "buildjob"],
  ["BuildJob-midtext", "buildjob"],
  ["BuildJob-hubcareer", "buildjob"],
  // BuildJob / GKS（CareerAffiliate の service 名がラベルになる：記事末カード・inline preset）
  ["ビルドジョブ", "buildjob"],
  ["GKSキャリア", "gks"],
  ["GKS-sidebar", "gks"],
  // 建設JOBs（A/B 対抗案件）
  ["KensetsuJobs-sidebar", "kensetsu-jobs"],
  ["建設JOBs", "kensetsu-jobs"],
  // ハイクラス DX/コンサル（総監）
  ["DXConsulting-sidebar", "dx-consulting"],
  ["ハイクラス DX・コンサル転職", "dx-consulting"],
]);

/** BuildJob の面別ラベル（面内訳の並び順を固定するため）。 */
const BUILDJOB_SURFACE_LABELS = [
  "BuildJob-sidebar",
  "ビルドジョブ",
  "BuildJob-midtext",
  "BuildJob-hubcareer",
];

/** prefix の直後が数字（日付）のファイルだけを拾う（-by-device / -by-label の別スキーマ混入を防ぐ）。 */
function latest(prefix) {
  if (!existsSync(GA4_DIR)) return null;
  const files = readdirSync(GA4_DIR)
    .filter((f) => f.startsWith(prefix) && /\d/.test(f.charAt(prefix.length)) && f.endsWith(".json"))
    .sort();
  return files.length ? join(GA4_DIR, files[files.length - 1]) : null;
}

/** by-label は prefix が `ga4-cta-clicks-by-label-`。上の latest() は数字直後判定なので専用に取る。 */
function latestByLabel() {
  if (!existsSync(GA4_DIR)) return null;
  const files = readdirSync(GA4_DIR)
    .filter((f) => f.startsWith("ga4-cta-clicks-by-label-") && f.endsWith(".json"))
    .sort();
  return files.length ? join(GA4_DIR, files[files.length - 1]) : null;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fmtInt(n) {
  return Number(n).toLocaleString("en-US");
}

// ---- 1. 面別（label）クリック集計 -------------------------------------------
const labelFile = latestByLabel();
const byProgram = new Map(); // program -> total clicks
const bySurface = new Map(); // label -> clicks
let labelPeriod = null;
let labelUnavailable = false;

if (labelFile) {
  const data = readJson(labelFile);
  labelPeriod = data.meta ? `${data.meta.startDate}〜${data.meta.endDate}` : null;
  const affRows = data.rows.filter((r) => r.eventName === "affiliate_cta_click");
  const nonSet = affRows
    .filter((r) => r.label === "(not set)")
    .reduce((s, r) => s + r.eventCount, 0);
  const classified = affRows.filter((r) => PROGRAM_BY_LABEL.has(r.label));
  if (classified.length === 0 && nonSet > 0) {
    labelUnavailable = true;
  }
  for (const r of affRows) {
    bySurface.set(r.label, (bySurface.get(r.label) ?? 0) + r.eventCount);
    const program = PROGRAM_BY_LABEL.get(r.label);
    if (program) byProgram.set(program, (byProgram.get(program) ?? 0) + r.eventCount);
  }
}

// ---- 2. ページ別（pagePath）BuildJob 相当クリック --------------------------
// page 別ファイルは label 次元を持たないため「affiliate クリックが多いページ」を出す
// （BuildJob 面がそのページに乗っているかは slug × affiliate-creatives の高意図判定で解釈する）。
const pageFile = latest("ga4-cta-clicks-");
const pageRows = [];
let pagePeriod = null;
if (pageFile) {
  const data = readJson(pageFile);
  pagePeriod = data.meta ? `${data.meta.startDate}〜${data.meta.endDate}` : null;
  for (const r of data.rows) {
    if (r.eventName !== "affiliate_cta_click") continue;
    const page = r.pagePath ?? r.page ?? "(unknown)";
    pageRows.push({ page, clicks: r.eventCount });
  }
  pageRows.sort((a, b) => b.clicks - a.clicks);
}

// ---- 3. A8 成果スナップショットと突合（推定 EPC） --------------------------
const a8File = join(AFF_DIR, "a8-results.json");
const a8 = existsSync(a8File) ? readJson(a8File) : { records: [] };
const a8ByProgram = new Map();
for (const rec of a8.records ?? []) {
  const cur = a8ByProgram.get(rec.program) ?? { conversions: 0, approved: 0, revenueYen: 0, months: [] };
  cur.conversions += rec.conversions ?? 0;
  cur.approved += rec.approved ?? 0;
  cur.revenueYen += rec.revenueYen ?? 0;
  if (rec.month) cur.months.push(rec.month);
  a8ByProgram.set(rec.program, cur);
}

// ---- 4. レポート組み立て ----------------------------------------------------
const lines = [];
lines.push("# BuildJob アフィリ クリック/EPC レポート");
lines.push("");
lines.push(`生成時のスナップショット期間: 面別=${labelPeriod ?? "N/A"} / ページ別=${pagePeriod ?? "N/A"}`);
lines.push("");
lines.push("> 生成: `npm run report-buildjob-affiliate`（オフライン集計）。GA4 クリックが真実源（分子）、");
lines.push("> A8 成果は月次手動スナップショット（`a8-results.json`）。計測は本番のみ発火＝デプロイ後に蓄積。");
lines.push("");

lines.push("## プログラム別クリック（affiliate_cta_click）");
lines.push("");
if (labelUnavailable) {
  lines.push("> [!warning]");
  lines.push("> GA4 の面別ラベルが全て `(not set)`。原因は次のいずれか:");
  lines.push("> 1. 取得期間の大半が event_label カスタムディメンションの登録日（doboku-note は 2026-07-07 に");
  lines.push(">    「CTA label」= パラメータ `event_label` で登録済み）**より前**＝カスタムディメンションは遡及しないため。");
  lines.push(">    → 登録日以降を含む期間で `npm run fetch-ga4-cta-clicks -- --by-label` を取り直せば面別に分解される。");
  lines.push("> 2. 本番クリックがまだ少ない（デプロイ後に蓄積してから面別内訳が埋まる）。");
  lines.push("> いずれも追加の GA4 設定は不要（登録は完了済み）。以下はページ別のみ有効。");
  lines.push("");
}
if (byProgram.size > 0) {
  lines.push("| プログラム | クリック | A8 承認 | 確定報酬(円) | 推定 EPC(円/クリック) |");
  lines.push("|---|--:|--:|--:|--:|");
  const order = ["buildjob", "kensetsu-jobs", "gks", "dx-consulting"];
  const known = [...byProgram.keys()];
  const sorted = [...order.filter((p) => known.includes(p)), ...known.filter((p) => !order.includes(p))];
  for (const program of sorted) {
    const clicks = byProgram.get(program) ?? 0;
    const a8p = a8ByProgram.get(program);
    const approved = a8p?.approved ?? 0;
    const revenue = a8p?.revenueYen ?? 0;
    const epc = clicks > 0 && revenue > 0 ? Math.round(revenue / clicks) : null;
    lines.push(
      `| ${program} | ${fmtInt(clicks)} | ${approved ? fmtInt(approved) : "-"} | ${revenue ? fmtInt(revenue) : "-"} | ${epc != null ? fmtInt(epc) : "-"} |`,
    );
  }
} else {
  lines.push("_プログラム別に分類できるクリックがまだありません（面別ラベル未登録 or クリック 0）。_");
}
lines.push("");

lines.push("## BuildJob 面別クリック内訳");
lines.push("");
const surfaceRows = BUILDJOB_SURFACE_LABELS.map((label) => ({ label, clicks: bySurface.get(label) ?? 0 }));
if (surfaceRows.some((r) => r.clicks > 0)) {
  lines.push("| 面 | ラベル | クリック |");
  lines.push("|---|---|--:|");
  const surfaceName = {
    "BuildJob-sidebar": "PC サイドバー（ピクセル源）",
    "ビルドジョブ": "記事末カード＋本文 inline（モバイル）",
    "BuildJob-midtext": "本文中間テキスト",
    "BuildJob-hubcareer": "カテゴリ hub 小バナー",
  };
  for (const r of surfaceRows) {
    lines.push(`| ${surfaceName[r.label] ?? "-"} | \`${r.label}\` | ${fmtInt(r.clicks)} |`);
  }
} else {
  lines.push("_BuildJob 面別クリックはまだ計測されていません（デプロイ後に蓄積 / 面別ラベル未登録）。_");
}
lines.push("");

lines.push("## affiliate クリック上位ページ（page 別・全プログラム）");
lines.push("");
if (pageRows.length > 0) {
  lines.push("| ページ | クリック |");
  lines.push("|---|--:|");
  for (const r of pageRows.slice(0, 20)) {
    lines.push(`| ${r.page} | ${fmtInt(r.clicks)} |`);
  }
} else {
  lines.push("_page 別 affiliate クリックがまだありません。_");
}
lines.push("");

lines.push("## 注記");
lines.push("");
lines.push("- 高意図 31 slug は 〜2026-08-31 の間 BuildJob 100%（`HIGH_INTENT_CAREER_SLUGS`）。9/1 以降は slug ハッシュ A/B へ自動復帰。");
lines.push("- 期間中は高意図面が A/B 母集団から抜けるため、**建設JOBs vs BuildJob の EPC 比較は低意図面・hub のみで解釈**する。");
lines.push("- 推定 EPC は `a8-results.json` に月次成果を手入力してから有効（A8 は API 無し）。");
lines.push("- 面別内訳には GA4 の `event_label` カスタムディメンション登録が必要（未登録なら `(not set)` に集約）。");
lines.push("");

const md = lines.join("\n");
if (!existsSync(AFF_DIR)) mkdirSync(AFF_DIR, { recursive: true });
const outPath = join(AFF_DIR, "buildjob-report-latest.md");
writeFileSync(outPath, md + "\n");

// ---- コンソールサマリ -------------------------------------------------------
console.log("[report-buildjob-affiliate]");
console.log(`  面別スナップショット: ${labelFile ?? "なし"}`);
console.log(`  ページ別スナップショット: ${pageFile ?? "なし"}`);
if (labelUnavailable) {
  console.log("  ⚠ GA4 面別ラベルが (not set) のみ＝取得期間が event_label 登録日(2026-07-07)より前 or クリック蓄積不足");
}
const bj = byProgram.get("buildjob") ?? 0;
const kj = byProgram.get("kensetsu-jobs") ?? 0;
console.log(`  BuildJob クリック: ${fmtInt(bj)} / 建設JOBs クリック: ${fmtInt(kj)}`);
console.log(`  [written] ${outPath}`);
