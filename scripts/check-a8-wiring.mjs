#!/usr/bin/env node
/**
 * check-a8-wiring.mjs — A8 レポートパイプラインの配線ドリフト検知（決定論・pre-commit / CI）
 * ---------------------------------------------------------------------------
 * このパイプラインは「config の programIdMap」「サイトに置いた a8mat」「EPC 消費側の語彙」の
 * 3 つが一致していて初めて意味を持つ。どれかがズレると **静かに間違った EPC** が出る
 * （取り込みは成功し、数字も出るが、対象が違う）。機械で止める。
 *
 * 検査:
 *   1. config が読める・必須キー（mediaId / targetSite / reports / columnAliases / programIdMap）がある
 *   2. reports[].siteScope が site-rows | account-wide のいずれか、かつ site-rows が最低 1 つある
 *      （＝doboku 分離の真実源が必ず存在する）
 *   3. programIdMap の値（program 語彙）が affiliate-mats.json の program 集合に含まれる
 *      ＝サイトに実際に置いている広告と、レポート集計の語彙が一致している
 *   4. affiliate-mats.json に在る program が programIdMap に無い＝**取りこぼし**（掲載しているのに集計されない）
 *   5. columnAliases の値が全て配列（文字列の解説キーを中に置くと mapColumns が落ちる実績あり）
 *   6. exportButtonLabels が 1 要素（複数だと同一ボタンに多重ヒットして「曖昧」で押せなくなる）
 *
 * usage:
 *   node scripts/check-a8-wiring.mjs            # 全体
 *   node scripts/check-a8-wiring.mjs --staged   # staged に関係ファイルがある時だけ実行
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const CONFIG = ".claude/config/a8-report-automation.json";
const MATS = "src/config/affiliate-mats.json";
const CONSUMER = ".claude/scripts/report-buildjob-affiliate.mjs";
const WATCHED = [CONFIG, MATS, CONSUMER];

const staged = process.argv.includes("--staged");
if (staged) {
  let files = [];
  try {
    files = execSync("git diff --cached --name-only", { encoding: "utf-8" }).split("\n").filter(Boolean);
  } catch {
    files = [];
  }
  const touched = files.some((f) => WATCHED.some((w) => f.replace(/\\/g, "/") === w));
  if (!touched) {
    console.log("[check-a8-wiring] skip（関係ファイルが staged に無し）");
    process.exit(0);
  }
}

const errors = [];
const warns = [];

if (!existsSync(CONFIG)) {
  console.log("[check-a8-wiring] skip（config 未導入）");
  process.exit(0);
}

let cfg;
try {
  cfg = JSON.parse(readFileSync(CONFIG, "utf-8"));
} catch (e) {
  console.error(`[check-a8-wiring] ERROR: ${CONFIG} が JSON として読めない: ${e.message}`);
  process.exit(1);
}

const a8 = cfg.a8 ?? {};
for (const k of ["mediaId", "targetSite", "reports", "columnAliases", "programIdMap", "exportButtonLabels"]) {
  if (a8[k] == null) errors.push(`a8.${k} が無い`);
}

// 2. siteScope
const reports = a8.reports ?? {};
const scopes = Object.entries(reports).map(([k, v]) => [k, v.siteScope]);
for (const [k, sc] of scopes) {
  if (!["site-rows", "account-wide"].includes(sc)) {
    errors.push(`reports.${k}.siteScope が不正: ${JSON.stringify(sc)}（site-rows | account-wide）`);
  }
}
if (!scopes.some(([, sc]) => sc === "site-rows")) {
  errors.push(
    "siteScope=site-rows のレポートが 1 つも無い＝doboku-note に分離された実績を取る経路が消えている（サイト別レポートは必須）",
  );
}

// 5. columnAliases は全て配列
for (const [field, aliases] of Object.entries(a8.columnAliases ?? {})) {
  if (!Array.isArray(aliases)) {
    errors.push(`columnAliases.${field} が配列でない（解説キーは columnAliases の外に置く。中に置くと mapColumns が落ちる）`);
  }
}

// 6. exportButtonLabels
const labels = a8.exportButtonLabels ?? [];
if (Array.isArray(labels) && labels.length !== 1) {
  warns.push(
    `exportButtonLabels が ${labels.length} 要素（実機は <button>CSV</button> 1 個。候補を増やすと findUniqueByLabels が多重ヒットして押せなくなる）`,
  );
}

// 3/4. program 語彙の一致
const mapValues = new Set(
  Object.entries(a8.programIdMap ?? {})
    .filter(([k, v]) => !k.startsWith("_") && typeof v === "string")
    .map(([, v]) => v),
);

if (existsSync(MATS)) {
  let mats = [];
  try {
    const raw = JSON.parse(readFileSync(MATS, "utf-8"));
    mats = Array.isArray(raw) ? raw : (raw.mats ?? []);
  } catch (e) {
    errors.push(`${MATS} が読めない: ${e.message}`);
  }
  const matPrograms = new Set(mats.map((m) => m.program).filter(Boolean));

  for (const p of mapValues) {
    if (!matPrograms.has(p)) {
      warns.push(
        `programIdMap の "${p}" が ${MATS} に無い（サイトに置いていない広告を集計している／mat 側の掲載終了の取り残し）`,
      );
    }
  }
  for (const p of matPrograms) {
    if (!mapValues.has(p)) {
      errors.push(
        `${MATS} に掲載中の "${p}" が programIdMap に無い＝**取りこぼし**（サイトに置いているのに A8 レポート集計に入らない）`,
      );
    }
  }
}

// 消費側の語彙（report-buildjob-affiliate の PROGRAM_BY_LABEL）と突合
if (existsSync(CONSUMER)) {
  const src = readFileSync(CONSUMER, "utf-8");
  for (const p of mapValues) {
    // 語彙が消費側に一度も現れない＝EPC レポートの分類に載らない（分子と分母が噛み合わない）
    if (!src.includes(`"${p}"`)) {
      warns.push(`programIdMap の "${p}" が ${CONSUMER} に現れない（EPC レポートの分類に載らない）`);
    }
  }
}

for (const w of warns) console.warn(`[check-a8-wiring] WARN: ${w}`);
if (errors.length > 0) {
  for (const e of errors) console.error(`[check-a8-wiring] ERROR: ${e}`);
  console.error(
    `\n対処: ${CONFIG} の a8.programIdMap と ${MATS} の program を一致させる。` +
      `\n      プログラムID は A8 のプログラム別レポート CSV の「プログラムID」列（s00000...）。` +
      `\n      ルール: .claude/knowledge/reference/a8-affiliate-pipeline.md「成果レポート パイプライン」`,
  );
  process.exit(1);
}
console.log(
  `[check-a8-wiring] ✓ config 健全・program 語彙 ${mapValues.size} 種が mats と整合（WARN ${warns.length} 件）`,
);
process.exit(0);
