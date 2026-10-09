#!/usr/bin/env node
/**
 * check-affiliate-wiring.mjs — アフィリ配線のドリフト検知（決定論・pre-commit / CI）
 * ---------------------------------------------------------------------------
 * `check-a8-wiring.mjs`（A8 単体）を 3 ASP 横断へ拡張・統合したもの。
 *
 * このサブシステムは 4 つの真実源が一致していて初めて意味を持つ。どれかがズレると
 * **静かに間違った EPC** が出る（取り込みは成功し数字も出るが、対象が違う）。機械で止める。
 *
 *   1. `config/affiliate-mats.json`                … サイトに実際に置いた広告（program 語彙の de-facto SSOT）
 *   2. `data/affiliate/catalog.json`  … 3 ASP 横断の提携カタログ
 *   3. `config/a8-report-automation.json`  … A8 成果取込の programIdMap
 *   4. `data/affiliate/catalog.json` の ctaLabels       … GA4 のラベル → 案件（EPC レポートの分類。scripts/lib/affiliate-labels.mjs）
 *
 * usage:
 *   node scripts/check-affiliate-wiring.mjs
 *   node scripts/check-affiliate-wiring.mjs --staged
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { datasetPath } from "./lib/datasets.mjs";
import { withSharedConnection } from "./lib/asp-config.mjs";
import { labelProgramMap } from "./lib/affiliate-labels.mjs";

const MATS = datasetPath("config.affiliate-mats");
const CATALOG = datasetPath("affiliate.catalog");
const A8_CONFIG = datasetPath("config.a8-report-automation");
const ASP_CONFIG = datasetPath("config.affiliate-asp");
const CREATIVES = "src/config/affiliate-creatives.ts";
const WATCHED = [MATS, CATALOG, A8_CONFIG, ASP_CONFIG, CREATIVES];
const KNOWLEDGE = ".claude/knowledge/reference/affiliate-operations.md";

const STATUS_VOCAB = new Set(["approved", "applying", "none", "unavailable", "unknown"]);

if (process.argv.includes("--staged")) {
  let files = [];
  try {
    files = execSync("git -c core.quotepath=false diff --cached --name-only", { encoding: "utf-8" }).split("\n").filter(Boolean);
  } catch {
    files = [];
  }
  const touched = files.some((f) => WATCHED.includes(f.replace(/\\/g, "/")));
  if (!touched) {
    console.log("[check-affiliate-wiring] skip（関係ファイルが staged に無し）");
    process.exit(0);
  }
}

const errors = [];
const warns = [];
const readJson = (p) => {
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch (e) {
    errors.push(`${p} が JSON として読めない: ${e.message}`);
    return null;
  }
};

// ── 1. mats（サイトに置いた広告）
let matPrograms = new Set();
if (existsSync(MATS)) {
  const raw = readJson(MATS);
  const mats = Array.isArray(raw) ? raw : (raw?.mats ?? []);
  matPrograms = new Set(mats.map((m) => m.program).filter(Boolean));
}

// ── 2. カタログ（3 ASP 横断）
const catalog = existsSync(CATALOG) ? readJson(CATALOG) : null;
const catPrograms = new Map(Object.entries(catalog?.programs ?? {}));

if (catalog) {
  for (const [key, p] of catPrograms) {
    if (!p.label) errors.push(`catalog.${key}: label が無い`);
    const asps = p.asps ?? {};
    if (Object.keys(asps).length === 0) errors.push(`catalog.${key}: asps が空`);
    for (const [aspName, a] of Object.entries(asps)) {
      if (!STATUS_VOCAB.has(a.status)) {
        errors.push(`catalog.${key}.asps.${aspName}.status が不正: ${JSON.stringify(a.status)}（${[...STATUS_VOCAB].join("|")}）`);
      }
      // 提携済み/申請中を名乗るなら、その ASP の識別子が要る（後で照合できないと意味がない）
      if ((a.status === "approved" || a.status === "applying") && !(a.programId || a.promotionId || a.pid)) {
        warns.push(`catalog.${key}.asps.${aspName}: ${a.status} だが ASP 側の ID が無い（照合できない）`);
      }
    }
    // サイトに配置しているなら mats に mat が要る
    if (p.placement === "active" && !matPrograms.has(key)) {
      errors.push(`catalog.${key}: placement=active だが ${MATS} に program="${key}" の mat が無い（配置の実体が無い）`);
    }
    // Red Line 該当を配置していないこと
    if (p.redLine === true && p.placement === "active") {
      errors.push(`catalog.${key}: Red Line 該当（講座/教材等）なのに placement=active。配置してはいけない`);
    }
  }
  // 逆方向: サイトに置いているのにカタログに無い＝取りこぼし
  for (const prog of matPrograms) {
    if (!catPrograms.has(prog)) {
      errors.push(`${MATS} に掲載中の "${prog}" が ${CATALOG} に無い＝**取りこぼし**（配置しているのに横断管理から漏れる）`);
    }
  }
}

// ── 3. A8 成果取込の programIdMap
if (existsSync(A8_CONFIG)) {
  const a8 = readJson(A8_CONFIG)?.a8 ?? {};
  for (const [field, v] of Object.entries(a8.columnAliases ?? {})) {
    if (!Array.isArray(v)) errors.push(`a8.columnAliases.${field} が配列でない（解説キーは columnAliases の外へ）`);
  }
  const labels = a8.exportButtonLabels ?? [];
  if (Array.isArray(labels) && labels.length !== 1) {
    warns.push(`a8.exportButtonLabels が ${labels.length} 要素（実機は <button>CSV</button> 1 個。増やすと曖昧判定で押せなくなる）`);
  }
  const scopes = Object.entries(a8.reports ?? {}).map(([k, v]) => [k, v.siteScope]);
  for (const [k, sc] of scopes) {
    if (!["site-rows", "account-wide", "result-rows"].includes(sc)) errors.push(`a8.reports.${k}.siteScope が不正: ${JSON.stringify(sc)}`);
  }
  if (!scopes.some(([, sc]) => sc === "site-rows")) {
    errors.push("a8: siteScope=site-rows のレポートが無い＝doboku-note に分離された実績を取る経路が消えている");
  }

  const mapValues = new Set(
    Object.entries(a8.programIdMap ?? {})
      .filter(([k, v]) => !k.startsWith("_") && typeof v === "string")
      .map(([, v]) => v),
  );
  for (const prog of matPrograms) {
    if (!mapValues.has(prog)) {
      errors.push(`${MATS} に掲載中の "${prog}" が a8.programIdMap に無い＝A8 レポート集計から漏れる`);
    }
  }
  for (const v of mapValues) {
    if (!matPrograms.has(v)) warns.push(`a8.programIdMap の "${v}" が ${MATS} に無い（掲載終了の取り残し？）`);
  }
  // カタログの A8 programId と programIdMap の整合
  for (const [key, p] of catPrograms) {
    const pid = p.asps?.a8?.programId;
    if (!pid) continue;
    const mapped = a8.programIdMap?.[pid];
    if (mapped && mapped !== key) {
      errors.push(`catalog.${key} の A8 programId ${pid} が programIdMap では "${mapped}" に写像されている（不一致）`);
    }
  }
}

// ── 4. ASP 接続設定
if (existsSync(ASP_CONFIG)) {
  // A8 の URL・口座・ブラウザの共通部分は a8-report-automation.json が正本（読み出しと同じ合成をしてから検査する。写しが書かれていれば例外）
  let asp = readJson(ASP_CONFIG);
  try {
    asp = withSharedConnection(asp);
  } catch (e) {
    errors.push(`${ASP_CONFIG}: ${e.message}`);
  }
  if (!asp?.targetSiteName) errors.push(`${ASP_CONFIG}: targetSiteName が無い`);
  for (const [name, a] of Object.entries(asp?.asps ?? {})) {
    if (!["none", "url-param", "chosen-widget"].includes(a.siteSeparation)) {
      errors.push(`asps.${name}.siteSeparation が不正: ${JSON.stringify(a.siteSeparation)}`);
    }
    if (a.siteSeparation !== "none") {
      if (!a.sites?.[asp.targetSiteName]) errors.push(`asps.${name}.sites に "${asp.targetSiteName}" が無い（サイト assert が効かない）`);
    } else if (!a.accountId) {
      errors.push(`asps.${name}: siteSeparation=none なら accountId（口座 assert 用）が必要`);
    }
    if (a.browser?.authService !== name) {
      errors.push(`asps.${name}.browser.authService が ASP 名と一致しない: ${JSON.stringify(a.browser?.authService)}`);
    }
  }
}

// ── 5. GA4 のラベル → 案件（正本は catalog の ctaLabels・scripts/lib/affiliate-labels.mjs）
// (a) コードに書いたラベル（面ごとの trackLabel と本文カードの service 名）が全部 catalog で案件に解決できる。
//     解決できないラベルのクリックは EPC レポートの分類から黙って落ちる
// (b) mat を持つ転職案件（vertical あり）は ctaLabels を持つ（ココナラは別イベント coconala_cta_click なので対象外）
let labelsChecked = 0;
try {
  const labelMap = labelProgramMap(catalog ?? {});
  const code = existsSync(CREATIVES) ? readFileSync(CREATIVES, "utf-8") : "";
  const literals = new Set();
  for (const m of code.matchAll(/trackLabel: "([^"]+)"/g)) {
    literals.add(m[1]);
    if (m[1].endsWith("-sidebar")) literals.add(m[1].replace(/-sidebar$/, "-endbanner")); // 記事末は -sidebar を -endbanner に置き換えて出す（ArticleFooter）
  }
  for (const m of code.matchAll(/service: "([^"]+)"/g)) literals.add(m[1]);
  if (literals.size === 0) errors.push(`${CREATIVES} からラベルを 1 つも読めない（書式が変わった？検査不成立）`);
  for (const label of literals) {
    labelsChecked++;
    if (!labelMap.has(label)) errors.push(`ラベル "${label}"（${CREATIVES}）が ${CATALOG} のどの案件の ctaLabels にも無い（EPC レポートの分類から落ちる）`);
  }
  for (const prog of matPrograms) {
    const p = catalog?.programs?.[prog];
    if (p?.vertical && !(p.ctaLabels ?? []).length) errors.push(`${CATALOG}: 転職案件 ${prog} は mat があるのに ctaLabels が無い`);
  }
} catch (e) {
  errors.push(`${CATALOG}: ctaLabels — ${e.message}`);
}

for (const w of warns) console.warn(`[check-affiliate-wiring] WARN: ${w}`);
if (errors.length > 0) {
  for (const e of errors) console.error(`[check-affiliate-wiring] ERROR: ${e}`);
  console.error(
    `\n対処: 4 つの真実源を一致させる。\n` +
      `  ${MATS}（サイトに置いた広告・program 語彙の SSOT）\n` +
      `  ${CATALOG}（3 ASP 横断の提携カタログ）\n` +
      `  ${A8_CONFIG}（A8 成果取込の programIdMap）\n` +
      `  ${CATALOG} の ctaLabels（GA4 のラベル → 案件）\n` +
      `ルール: ${KNOWLEDGE}`,
  );
  process.exit(1);
}
console.log(
  `[check-affiliate-wiring] ✓ mats ${matPrograms.size} 種 / catalog ${catPrograms.size} 件 / コードのラベル ${labelsChecked} 件 が整合（WARN ${warns.length}）`,
);
process.exit(0);
