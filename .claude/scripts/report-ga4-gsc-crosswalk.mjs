#!/usr/bin/env node
/**
 * report-ga4-gsc-crosswalk.mjs — GA4 と GSC を page(URL) キーで突合する週次レポート
 *
 * 計測基盤 #11。GA4(page 別 users/sessions/engagement) と GSC(page 別 impressions/clicks/
 * ctr/position) はどちらも page 次元を持つのに、これまで URL で join するレポートが無く、
 * 「どのページが・どのくらい検索表示され・実際にどれだけ滞在/エンゲージしたか」を 1 行で
 * 見られなかった。両者を突合し、改善機会（High-Impr-Low-CTR 等）を surface する。
 *
 * 入力（最新スナップショットを自動選択・オフライン）:
 *   - .claude/state/metrics/ga4/ga4-page-*.json   （page, activeUsers, sessions, engagementRate, bounceRate …）
 *   - .claude/state/metrics/gsc/gsc-page-*.json    （keys:[URL], clicks, impressions, ctr, position）
 *
 * 出力:
 *   - .claude/state/metrics/crosswalk/crosswalk-<ISO>.json  （全 join 行）
 *   - .claude/state/metrics/crosswalk/crosswalk-latest.md   （サマリ＋改善機会 Top）
 *   - コンソールにサマリ
 *
 * usage: node .claude/scripts/report-ga4-gsc-crosswalk.mjs [--min-impr 50] [--low-ctr 0.01]
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const GA4_DIR = ".claude/state/metrics/ga4";
const GSC_DIR = ".claude/state/metrics/gsc";
const OUT_DIR = ".claude/state/metrics/crosswalk";

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const MIN_IMPR = parseInt(arg("--min-impr", "50"), 10);
const LOW_CTR = parseFloat(arg("--low-ctr", "0.01"));

function latest(dir, prefix) {
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(".json")).sort();
  return files.length ? join(dir, files[files.length - 1]) : null;
}

// URL / path を join キーへ正規化（ドメイン除去・クエリ/ハッシュ除去・末尾スラッシュ除去）
function normPath(u) {
  if (!u) return "";
  let p = String(u).replace(/^https?:\/\/(www\.)?doboku-note\.com/i, "");
  p = p.split("#")[0].split("?")[0];
  if (p.length > 1) p = p.replace(/\/$/, "");
  return p || "/";
}

const ga4File = latest(GA4_DIR, "ga4-page-");
const gscFile = latest(GSC_DIR, "gsc-page-");
if (!ga4File || !gscFile) {
  console.error(`[crosswalk] 入力不足: ga4-page=${!!ga4File} gsc-page=${!!gscFile}。スキップ。`);
  process.exit(0);
}

const ga4 = JSON.parse(readFileSync(ga4File, "utf-8"));
const gsc = JSON.parse(readFileSync(gscFile, "utf-8"));

// GA4: page→{users,sessions,engagementRate,bounceRate}
const ga4Map = new Map();
for (const r of ga4.rows || ga4.data || []) {
  const key = normPath(r.page);
  ga4Map.set(key, {
    users: r.activeUsers ?? 0,
    sessions: r.sessions ?? 0,
    engagementRate: r.engagementRate ?? null,
    bounceRate: r.bounceRate ?? null,
  });
}
// GSC: page→{impressions,clicks,ctr,position}
const gscMap = new Map();
for (const r of gsc.rows || []) {
  const key = normPath(r.keys?.[0]);
  gscMap.set(key, {
    impressions: r.impressions ?? 0,
    clicks: r.clicks ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? null,
  });
}

// full outer join
const paths = new Set([...ga4Map.keys(), ...gscMap.keys()]);
const rows = [];
for (const p of paths) {
  const g = gscMap.get(p) || null;
  const a = ga4Map.get(p) || null;
  rows.push({ path: p, gsc: g, ga4: a });
}

// 改善機会の抽出
// title/meta 改善機会 = 上位表示(position<=15)なのに CTR が低い＝クリックされない。
// ランキング改善機会 = 表示は多いが順位が低い(position>15)＝内容/被リンクで上げる余地。
const titleOpportunity = rows
  .filter((r) => r.gsc && r.gsc.impressions >= MIN_IMPR && r.gsc.ctr < LOW_CTR && r.gsc.position !== null && r.gsc.position <= 15)
  .sort((x, y) => y.gsc.impressions - x.gsc.impressions);
const rankingOpportunity = rows
  .filter((r) => r.gsc && r.gsc.impressions >= MIN_IMPR && r.gsc.position !== null && r.gsc.position > 15)
  .sort((x, y) => y.gsc.impressions - x.gsc.impressions);
const rankedLowEngage = rows
  .filter((r) => r.gsc && r.ga4 && r.gsc.clicks >= 5 && r.ga4.engagementRate !== null && r.ga4.engagementRate < 0.4)
  .sort((x, y) => y.gsc.clicks - x.gsc.clicks);
const gscNoGa4 = rows.filter((r) => r.gsc && r.gsc.clicks >= 5 && !r.ga4); // 検索クリックはあるが GA4 に出ない（計測差 or bot）

function fmtPct(v) {
  return v === null ? "n.d." : (v * 100).toFixed(1) + "%";
}

const stamp = (ga4.meta?.endDate || "") + "_" + (gsc.meta?.endDate || "");
const md = [];
md.push(`# GA4 × GSC crosswalk（page 突合）`);
md.push("");
md.push(`- GA4: \`${ga4File.split(/[\\/]/).pop()}\`（${ga4.meta?.startDate}〜${ga4.meta?.endDate}）`);
md.push(`- GSC: \`${gscFile.split(/[\\/]/).pop()}\`（${gsc.meta?.startDate}〜${gsc.meta?.endDate}）`);
md.push(`- join 済ページ: ${rows.filter((r) => r.gsc && r.ga4).length}（GSCのみ ${rows.filter((r) => r.gsc && !r.ga4).length} / GA4のみ ${rows.filter((r) => !r.gsc && r.ga4).length}）`);
md.push("");
md.push(`## title/meta 改善機会（上位表示 pos≤15 なのに CTR<${(LOW_CTR * 100).toFixed(1)}%＝クリックされない）`);
md.push("");
md.push(`| page | impr | clicks | ctr | pos | GA4 users | engage |`);
md.push(`|---|--:|--:|--:|--:|--:|--:|`);
for (const r of titleOpportunity.slice(0, 20)) {
  md.push(`| ${r.path} | ${r.gsc.impressions} | ${r.gsc.clicks} | ${fmtPct(r.gsc.ctr)} | ${r.gsc.position?.toFixed(1) ?? "n.d."} | ${r.ga4?.users ?? "—"} | ${r.ga4 ? fmtPct(r.ga4.engagementRate) : "—"} |`);
}
if (!titleOpportunity.length) md.push(`（該当なし＝上位表示ページは十分クリックされている）`);
md.push("");
md.push(`## ランキング改善機会（表示は多いが pos>15＝内容/被リンクで順位を上げる余地・上位20）`);
md.push("");
md.push(`| page | impr | clicks | ctr | pos |`);
md.push(`|---|--:|--:|--:|--:|`);
for (const r of rankingOpportunity.slice(0, 20)) {
  md.push(`| ${r.path} | ${r.gsc.impressions} | ${r.gsc.clicks} | ${fmtPct(r.gsc.ctr)} | ${r.gsc.position?.toFixed(1) ?? "n.d."} |`);
}
md.push("");
md.push(`## Ranked-Low-Engagement（検索クリックはあるが GA4 engagement<40%・内容/UX 要改善）`);
md.push("");
md.push(`| page | clicks | pos | GA4 users | engage | bounce |`);
md.push(`|---|--:|--:|--:|--:|--:|`);
for (const r of rankedLowEngage.slice(0, 15)) {
  md.push(`| ${r.path} | ${r.gsc.clicks} | ${r.gsc.position?.toFixed(1) ?? "n.d."} | ${r.ga4.users} | ${fmtPct(r.ga4.engagementRate)} | ${fmtPct(r.ga4.bounceRate)} |`);
}
md.push("");
if (gscNoGa4.length) {
  md.push(`## GSC クリックあり・GA4 未計上（計測差 or 直帰・${gscNoGa4.length}件）`);
  md.push(gscNoGa4.slice(0, 10).map((r) => `- ${r.path}（clicks ${r.gsc.clicks}）`).join("\n"));
  md.push("");
}

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const isoSafe = stamp.replace(/[^0-9_]/g, "");
writeFileSync(join(OUT_DIR, `crosswalk-${isoSafe}.json`), JSON.stringify({ meta: { ga4File, gscFile, ga4Range: [ga4.meta?.startDate, ga4.meta?.endDate], gscRange: [gsc.meta?.startDate, gsc.meta?.endDate], minImpr: MIN_IMPR, lowCtr: LOW_CTR }, rows }, null, 2));
writeFileSync(join(OUT_DIR, "crosswalk-latest.md"), md.join("\n"));

console.log(`[crosswalk] join ${rows.length} paths（GSC∩GA4 ${rows.filter((r) => r.gsc && r.ga4).length}）`);
console.log(`  title機会(pos≤15低CTR): ${titleOpportunity.length}｜ranking機会(pos>15): ${rankingOpportunity.length}｜Ranked-Low-Engage: ${rankedLowEngage.length}｜GSC-only-clicks: ${gscNoGa4.length}`);
console.log(`  → ${join(OUT_DIR, "crosswalk-latest.md")}`);
