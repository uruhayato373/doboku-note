#!/usr/bin/env node
/**
 * report-buildjob-affiliate.mjs — BuildJob（＋競合転職案件）のアフィリ クリック/EPC 週次レポート
 *
 * BuildJob 収益最大化スプリント（docs/operations/09_BuildJob収益最大化スプリント.md）P2。
 * 「どの面（サイドバー/記事末/本文中間/hub）が・どのページが BuildJob クリックを生んでいるか」を
 * オフラインで 1 レポートにまとめ、A8 成果スナップショットと突合して推定 EPC（報酬/クリック）を出す。
 * 期間中（〜2026-08-31）は civil 全ページが BuildJob 100% のため、面別クリックの伸びを毎週追える。
 *
 * 入力（最新スナップショットを自動選択・オフライン・ネットワーク不要）:
 *   - .claude/state/metrics/ga4/ga4-cta-clicks-by-label-*.json  （label × eventName × eventCount）
 *       ※ 面別ラベルは fetch-ga4-cta-clicks --by-label で取得（要 GA4 event_label カスタムディメンション）。
 *   - .claude/state/metrics/ga4/ga4-cta-clicks-*.json           （pagePath × eventName × eventCount・page 別）
 *   - .claude/state/metrics/affiliate/a8-results.json           （A8 成果。`/a8-report` が自動取込）
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
import { pickByLabelSnapshot } from "./lib/ga4-snapshot.mjs";

import { isMeasurementWindowAligned } from "../../scripts/lib/report-honesty.mjs";

const GA4_DIR = ".claude/state/metrics/ga4";
const AFF_DIR = ".claude/state/metrics/affiliate";

/** プログラム分類: data-cta-label（面別 trackLabel or CareerAffiliate の service 名）→ プログラム。 */
const PROGRAM_BY_LABEL = new Map([
  // BuildJob（面別 trackLabel）
  ["BuildJob-sidebar", "buildjob"],
  ["BuildJob-endbanner", "buildjob"], // 記事末 300×250（2026-07-28〜）
  ["BuildJob-midtext", "buildjob"],
  ["BuildJob-hubcareer", "buildjob"],
  // BuildJob / GKS（CareerAffiliate の service 名がラベルになる：記事末カード・inline preset）
  ["ビルドジョブ", "buildjob"],
  ["GKSキャリア", "gks"],
  ["GKS-sidebar", "gks"],
  ["GKS-endbanner", "gks"],
  // 建設JOBs（A/B 対抗案件）
  ["KensetsuJobs-sidebar", "kensetsu-jobs"],
  ["KensetsuJobs-endbanner", "kensetsu-jobs"],
  ["建設JOBs", "kensetsu-jobs"],
  // ハイクラス DX/コンサル（総監）
  ["DXConsulting-sidebar", "dx-consulting"],
  ["DXConsulting-endbanner", "dx-consulting"],
  ["ハイクラス DX・コンサル転職", "dx-consulting"],
]);

/** BuildJob の面別ラベル（面内訳の並び順を固定するため）。 */
const BUILDJOB_SURFACE_LABELS = [
  "BuildJob-sidebar",
  "BuildJob-endbanner",
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

/** by-label スナップショットの選択は lib に集約（窓の扱いをレポート間でズレさせない・DN-0062）。 */
function latestByLabel() {
  return pickByLabelSnapshot(GA4_DIR);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function fmtInt(n) {
  return Number(n).toLocaleString("en-US");
}

/**
 * `affiliate_cta_impression` が本番で発火し始めた日（commit 445263f55 の deploy・2026-07-25）。
 *
 * これを定数で持つ理由: スナップショット JSON は期間の合計しか持たず、**その期間のどこから
 * 表示イベントが存在したかをデータだけからは判定できない**。窓が違うまま「クリック ÷ 表示」を
 * 出すと、分子 28 日 ÷ 分母 5 日 の比になって CTR を数倍に過大評価する。
 * スナップショットの開始日がこの日より前なら CTR は計算せず、**上限値**（クリックが全て
 * 表示計測期間に落ちたと仮定した最大値）だけを出す。
 */
const IMPRESSION_SINCE = "2026-07-25";

// ---- 1. 面別（label）クリック集計 -------------------------------------------
const labelFile = latestByLabel();
const byProgram = new Map(); // program -> total clicks
const bySurface = new Map(); // label -> clicks
const impressionsBySurface = new Map(); // label -> impressions
let labelPeriod = null;
let labelPeriodStart = null;
let labelUnavailable = false;
// "month" なら分子（A8 月次）と分母（GA4）が同じ月境界で揃う＝EPC は概算ではない。
// 未設定の既存ファイルは "days"（28 日窓）扱い。DN-0062。
let labelWindowKind = "days";

if (labelFile) {
  const data = readJson(labelFile);
  labelPeriod = data.meta ? `${data.meta.startDate}〜${data.meta.endDate}` : null;
  labelPeriodStart = data.meta?.startDate ?? null;
  labelWindowKind = data.meta?.windowKind ?? "days";
  for (const r of data.rows) {
    if (r.eventName !== "affiliate_cta_impression") continue;
    impressionsBySurface.set(r.label, (impressionsBySurface.get(r.label) ?? 0) + r.eventCount);
  }
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

// ★ 分子（A8 確定報酬）と分母（GA4 クリック）の期間を揃える。
//   揃えないと「全期間の報酬 ÷ 直近 28 日のクリック」になり EPC を過大評価する
//   （例: 確定 ¥50,000 ÷ 28 日窓の 7 クリック = EPC 7,143 円。市場平均 942 円の 7.6 倍）。
//   GA4 窓は月をまたぐので「窓に重なる月」を対象にする（月全体 vs 28 日窓のズレは残るため概算）。
const monthsInWindow = (() => {
  if (!labelPeriod) return null; // 期間不明なら絞れない
  const [s, e] = labelPeriod.split("〜");
  if (!s || !e) return null;
  const out = new Set();
  const cur = new Date(`${s.slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${e.slice(0, 7)}-01T00:00:00Z`);
  for (let guard = 0; guard < 24 && cur <= end; guard++) {
    out.add(`${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}`);
    cur.setUTCMonth(cur.getUTCMonth() + 1);
  }
  return out;
})();

const a8ByProgram = new Map();
const a8ExcludedMonths = new Set();
for (const rec of a8.records ?? []) {
  if (monthsInWindow && rec.month && !monthsInWindow.has(rec.month)) {
    a8ExcludedMonths.add(rec.month);
    continue;
  }
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
lines.push("> A8 成果（`a8-results.json`）は `/a8-report` が自動取込（`a8-ui:fetch` → `a8-ui:normalize`）。計測は本番のみ発火＝デプロイ後に蓄積。");
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
  // 窓が月次で揃っていれば EPC は概算ではない。揃っていない（既定の 28 日窓）ときだけ
  // 「概算」と明示する。表を見ただけで分かるようヘッダーに出す（注記まで読まれない前提で守る）。
  const epcHeader =
    labelWindowKind === "month" ? "実測 EPC(月次で窓を揃え済み)" : "推定 EPC(概算・期間ズレあり)";
  lines.push(`| プログラム | クリック(GA4) | A8 承認 | 確定報酬(円) | ${epcHeader} |`);
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
    "BuildJob-endbanner": "記事末 300×250 バナー",
    "ビルドジョブ": "本文中間ネイティブカード＋MDX inline",
    "BuildJob-midtext": "本文中間テキスト（2026-07-28 以降 未使用）",
    "BuildJob-hubcareer": "カテゴリ hub 小バナー",
  };
  for (const r of surfaceRows) {
    lines.push(`| ${surfaceName[r.label] ?? "-"} | \`${r.label}\` | ${fmtInt(r.clicks)} |`);
  }
} else {
  lines.push("_BuildJob 面別クリックはまだ計測されていません（デプロイ後に蓄積 / 面別ラベル未登録）。_");
}
lines.push("");

// ---- 面別 表示 → CTR（窓が揃うときだけ CTR を出す） -------------------------
// 「表示 0 件」と「表示イベント未実装」を同じ空表にしない（＝検査ゼロを PASS と呼ばない）。
lines.push("## 面別 表示回数と CTR");
lines.push("");
const totalImpressions = [...impressionsBySurface.values()].reduce((s, n) => s + n, 0);
if (totalImpressions === 0) {
  lines.push("> [!warning]");
  lines.push(
    `> このスナップショットに \`affiliate_cta_impression\` が **1 件も無い**（本番反映は ${IMPRESSION_SINCE}）。`,
  );
  lines.push(
    "> 表示ゼロなのか、取得期間が実装前なのか、`cta_placement` ディメンション未登録なのかを切り分けること。",
  );
  lines.push("> 切り分かないうちは CTR を語らない。");
} else {
  // 判定は scripts/lib/report-honesty.mjs（純関数・tests/report-honesty.test.mjs で固定）。
  const { aligned: windowAligned } = isMeasurementWindowAligned(labelPeriodStart, IMPRESSION_SINCE);
  if (!windowAligned) {
    lines.push("> [!warning] CTR は算出できない（分子と分母で窓が違う）");
    lines.push(
      `> 表示イベントの本番反映は **${IMPRESSION_SINCE}** で、このスナップショットの開始日は **${labelPeriodStart ?? "不明"}**。`,
    );
    lines.push(
      "> 分母（表示）は実装日以降ぶんしか無いのに分子（クリック）は期間全体ぶんあるため、比を取ると CTR を過大評価する。",
    );
    lines.push(
      `> 下表の CTR 欄は **上限**（クリックが全て表示計測期間に落ちたと仮定した最大値）。実測 CTR を得るには`,
    );
    // fetch-ga4-cta-clicks は --days しか受けない（終端は前日）。実装日を跨がない最大日数を出す。
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const alignedDays = Math.floor(
      (yesterday.getTime() - new Date(`${IMPRESSION_SINCE}T00:00:00Z`).getTime()) / 86_400_000,
    ) + 1;
    lines.push(
      alignedDays > 0
        ? `> \`npm run fetch-ga4-cta-clicks -- --by-label --days ${alignedDays}\`（または \`--month YYYY-MM\`）で窓を ${IMPRESSION_SINCE} 以降に揃えて取り直す（GA4 API＝CI/CD 供給）。`
        : `> 実装日 ${IMPRESSION_SINCE} 以降のデータがまだ 1 日も無い。`,
    );
    lines.push("");
  }
  lines.push(
    windowAligned ? "| 面 | 表示 | クリック | CTR |" : "| 面 | 表示 | クリック | CTR の上限 |",
  );
  lines.push("|---|--:|--:|--:|");
  const impressionRows = [...impressionsBySurface.entries()].sort((a, b) => b[1] - a[1]);
  for (const [label, impressions] of impressionRows) {
    const clicks = bySurface.get(label) ?? 0;
    const rate = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "-";
    lines.push(
      `| \`${label}\` | ${fmtInt(impressions)} | ${fmtInt(clicks)} | ${windowAligned ? "" : "≤ "}${rate}% |`,
    );
  }
  lines.push("");
  lines.push(
    `_表示イベントを持つ面 ${impressionRows.length} 件・表示合計 ${fmtInt(totalImpressions)} を実集計。表示イベントが 0 の面は行に出ない（＝計測されていない面は「CTR 0%」ではなく不在として扱う）。_`,
  );
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
lines.push(
  "- **2026-07-28 以降、キャンペーン中（〜08-31）は civil セグメント全ページが BuildJob 100%**（高意図 36 slug 限定をやめた。" +
    "GA4 実測でその 36 slug は流入上位に 1 つも入らず、実流入の学習系ページが 50/50 A/B のまま低 EPC 側に半分流れていたため）。" +
    "9/1 以降は `isCampaignActive()`=false で slug ハッシュ A/B へ自動復帰するが、GKS(457) < 建設JOBs(709) と逆転するため復帰後の arm 設計は要見直し。",
);
lines.push("- 期間中は高意図面が A/B 母集団から抜けるため、**建設JOBs vs BuildJob の EPC 比較は低意図面・hub のみで解釈**する。");
lines.push("- 推定 EPC は `a8-results.json` に成果が入ってから有効。A8 は API 無しのため `/a8-report`（Playwright・要ローカルログイン）で取り込む。");
lines.push(
  `- **EPC の分母は GA4 のラベル別クリック**（A8 の \`clicks\` は口座横断＝stats47 分を含むので使わない。真実源: affiliate-operations.md §6.5）。` +
    `分子は A8 の確定報酬で、GA4 窓に重なる月${monthsInWindow ? `（${[...monthsInWindow].sort().join(", ")}）` : ""}に限定して合算する。` +
    (a8ExcludedMonths.size ? `窓外として除外した月: ${[...a8ExcludedMonths].sort().join(", ")}。` : "") +
    (labelWindowKind === "month"
      ? `分母も同じ月の窓で取得済み（\`--month\`）のため、**分子と分母の期間は揃っている**。`
      : `**月全体の報酬 ÷ ${labelPeriod ?? "28 日"}のクリック**というズレが残るため EPC は概算。` +
        `揃えるには \`npm run fetch-ga4-cta-clicks -- --by-label --month YYYY-MM\` で月次窓を取り直す。`),
);
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
