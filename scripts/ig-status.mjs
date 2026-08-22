#!/usr/bin/env node
/**
 * ig-status.mjs — Instagram 投稿済みステータス管理（フォーマット別: carousel / reels / stories）
 *
 * パックルートに posted.json を置く（存在しない = 全フォーマット未投稿）。
 * スキーマ（新）:
 *   {
 *     "carousel": { "at": "YYYY-MM-DD", "url": "...", "note": "..." } | null,
 *     "reels":    { ... } | null,
 *     "stories":  { ... } | null
 *   }
 *   旧フラット形式 { at, url, note } は carousel として後方互換解釈する（migrate で正規化）。
 * slide-data.json には手を加えない / A系統・B系統共通。
 *
 * Usage:
 *   node scripts/ig-status.mjs                            # 全パック一覧（C/R/S 別ステータス）
 *   node scripts/ig-status.mjs --exam=cem                 # 試験絞り込み
 *   node scripts/ig-status.mjs --year=r07                 # 年度絞り込み（exam-packs のみ）
 *   node scripts/ig-status.mjs --pending                  # どのフォーマットも未投稿のみ
 *   node scripts/ig-status.mjs --done                     # いずれか投稿済みのみ
 *   node scripts/ig-status.mjs --format=reels --pending   # reels が未投稿のパックのみ
 *   node scripts/ig-status.mjs --format=reels --done      # reels が投稿済みのパックのみ
 *   node scripts/ig-status.mjs mark cem/npv-net-present-value reels --url=... --note=手動
 *   node scripts/ig-status.mjs mark cem/exam-packs/r07/pack-01            # 省略時は carousel
 *   node scripts/ig-status.mjs unmark cem/npv-net-present-value reels     # reels だけ取消
 *   node scripts/ig-status.mjs unmark cem/npv-net-present-value           # 全フォーマット取消（ファイル削除）
 *   node scripts/ig-status.mjs migrate                    # 旧フラット posted.json を新スキーマへ一括移行
 *   node scripts/ig-status.mjs summary                    # 試験別進捗サマリ
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, unlinkSync } from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
export const IG_DIR = join(ROOT, "content/sns/instagram");

const EXCLUDE_DIRS = new Set(["_dev", "highlights", "stories", "img", "carousel", "reels"]);
const EXAM_DIRS = ["cem", "civil-1", "civil-2", "pe-construction"];
export const FORMATS = ["carousel", "reels", "stories"];
const FMT_LETTER = { carousel: "C", reels: "R", stories: "S" };

// ─── args ─────────────────────────────────────────────────────
function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const [k, v] = argv[i].slice(2).split("=");
      flags[k] = v !== undefined ? v : (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true);
    } else {
      positional.push(argv[i]);
    }
  }
  return { flags, positional };
}

const { flags, positional } = parseArgs(process.argv.slice(2));
const command = positional[0]; // mark / unmark / migrate / summary / undefined (list)
const targetArg = positional[1]; // relative path under IG_DIR
const formatArg = positional[2]; // carousel / reels / stories（mark/unmark 時）

// ─── posted.json 正規化（後方互換）────────────────────────────
export function normalizePosted(raw) {
  if (!raw || typeof raw !== "object") return null;
  // 新スキーマ: carousel/reels/stories のいずれかのキーを持つ
  if (FORMATS.some((f) => f in raw)) {
    const out = { carousel: null, reels: null, stories: null };
    for (const f of FORMATS) if (raw[f]) out[f] = raw[f];
    return out;
  }
  // 旧フラット { at, url, note } → carousel として解釈
  if (raw.at || raw.url) {
    return { carousel: { ...raw }, reels: null, stories: null };
  }
  return null;
}

function anyPosted(posted) {
  return !!posted && FORMATS.some((f) => posted[f]);
}

// ─── pack discovery ───────────────────────────────────────────
function isPack(dir) {
  const entries = readdirSync(dir);
  return entries.includes("slide-data.json") ||
    entries.includes("caption.txt") ||
    entries.includes("posted.json") ||
    entries.includes("carousel");
}

export function walkPacks(dir, depth = 0) {
  const result = [];
  if (depth > 6) return result;
  let entries;
  try { entries = readdirSync(dir); } catch { return result; }
  for (const entry of entries) {
    if (EXCLUDE_DIRS.has(entry) || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    try { if (!statSync(full).isDirectory()) continue; } catch { continue; }
    if (isPack(full)) {
      result.push(full);
    } else {
      result.push(...walkPacks(full, depth + 1));
    }
  }
  return result;
}

export function readPostedRaw(packDir) {
  const p = join(packDir, "posted.json");
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

export function readPosted(packDir) {
  return normalizePosted(readPostedRaw(packDir));
}

function readMeta(packDir) {
  const p = join(packDir, "slide-data.json");
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8"))._meta || null; } catch { return null; }
}

export function packInfo(packDir) {
  const rel = relative(IG_DIR, packDir).replace(/\\/g, "/");
  const parts = rel.split("/");
  const exam = parts[0] || "?";
  const meta = readMeta(packDir);
  const posted = readPosted(packDir);
  const year = meta?.year || null;
  const packNum = meta?.packNum || null;
  const management = meta?.management || null;
  const slug = parts.slice(1).join("/");
  return { packDir, rel, exam, slug, year, packNum, management, posted };
}

// ─── filter ───────────────────────────────────────────────────
function filterPacks(packs) {
  let filtered = packs;
  if (flags.exam) filtered = filtered.filter((p) => p.exam === flags.exam);
  if (flags.year) filtered = filtered.filter((p) => p.year === flags.year);
  if (flags.format && FORMATS.includes(flags.format)) {
    const fmt = flags.format;
    if (flags.pending) filtered = filtered.filter((p) => !p.posted?.[fmt]);
    if (flags.done) filtered = filtered.filter((p) => !!p.posted?.[fmt]);
  } else {
    if (flags.pending) filtered = filtered.filter((p) => !anyPosted(p.posted));
    if (flags.done) filtered = filtered.filter((p) => anyPosted(p.posted));
  }
  return filtered;
}

// ─── display ──────────────────────────────────────────────────
const COL = {
  STATUS: 5,
  EXAM: 14,
  SLUG: 36,
  DATE: 12,
  NOTE: 20,
};

function pad(s, n) {
  const str = String(s ?? "");
  return str.length >= n ? str.slice(0, n - 1) + "…" : str.padEnd(n);
}

function statusStr(posted) {
  // 例: "C--"（carousel のみ）/ "CRS"（全部）/ "---"（未投稿）
  return FORMATS.map((f) => (posted?.[f] ? FMT_LETTER[f] : "-")).join("");
}

function latestDate(posted) {
  const dates = FORMATS.map((f) => posted?.[f]?.at).filter(Boolean).sort();
  return dates.length ? dates[dates.length - 1] : "";
}

function firstNote(posted) {
  for (const f of FORMATS) if (posted?.[f]?.note) return posted[f].note;
  return "";
}

function printTable(packs) {
  const header = [
    pad("C/R/S", COL.STATUS),
    pad("EXAM", COL.EXAM),
    pad("SLUG", COL.SLUG),
    pad("DATE", COL.DATE),
    pad("NOTE", COL.NOTE),
  ].join("  ");
  console.log(header);
  console.log("-".repeat(header.length));
  for (const p of packs) {
    console.log([
      pad(statusStr(p.posted), COL.STATUS),
      pad(p.exam, COL.EXAM),
      pad(p.slug, COL.SLUG),
      pad(latestDate(p.posted), COL.DATE),
      pad(firstNote(p.posted), COL.NOTE),
    ].join("  "));
  }
  const done = packs.filter((p) => anyPosted(p.posted)).length;
  const ftot = {};
  for (const f of FORMATS) ftot[f] = packs.filter((p) => p.posted?.[f]).length;
  console.log(
    `\nいずれか投稿済み: ${done} / ${packs.length}　|　` +
    `carousel ${ftot.carousel}　reels ${ftot.reels}　stories ${ftot.stories}（/ ${packs.length}）`
  );
}

function printSummary(packs) {
  const byExam = {};
  for (const p of packs) {
    if (!byExam[p.exam]) byExam[p.exam] = { done: 0, total: 0, carousel: 0, reels: 0, stories: 0 };
    byExam[p.exam].total++;
    if (anyPosted(p.posted)) byExam[p.exam].done++;
    for (const f of FORMATS) if (p.posted?.[f]) byExam[p.exam][f]++;
  }
  console.log("EXAM            DONE / TOTAL  BAR                   C / R / S");
  console.log("-".repeat(70));
  for (const [exam, s] of Object.entries(byExam)) {
    const pct = s.total > 0 ? Math.round((s.done / s.total) * 20) : 0;
    const bar = "█".repeat(pct) + "░".repeat(20 - pct);
    console.log(
      `${pad(exam, 16)}${String(s.done).padStart(4)} / ${String(s.total).padEnd(6)}  ${bar}  ` +
      `${s.carousel} / ${s.reels} / ${s.stories}`
    );
  }
  const totalDone = packs.filter((p) => anyPosted(p.posted)).length;
  console.log(`\n合計: ${totalDone} / ${packs.length}（いずれか投稿済み）`);
}

// ─── mark / unmark / migrate ──────────────────────────────────
function resolvePackDir(arg) {
  if (!arg) {
    console.error("パスを指定してください（例: cem/npv-net-present-value）");
    process.exit(1);
  }
  const full = join(IG_DIR, arg.replace(/\\/g, "/"));
  if (!existsSync(full)) {
    console.error(`ディレクトリが見つかりません: ${full}`);
    process.exit(1);
  }
  return full;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function resolveFormat(arg) {
  if (!arg) return "carousel";
  if (!FORMATS.includes(arg)) {
    console.error(`フォーマットは ${FORMATS.join(" / ")} のいずれか（指定: ${arg}）`);
    process.exit(1);
  }
  return arg;
}

function doMark(packDir) {
  const format = resolveFormat(formatArg);
  const p = join(packDir, "posted.json");
  const cur = readPosted(packDir) || { carousel: null, reels: null, stories: null };
  const entry = { at: flags.date || todayISO() };
  if (flags.url) entry.url = String(flags.url).split("?")[0]; // クエリ除去（shortcode のみ）
  if (flags.note) entry.note = String(flags.note);
  cur[format] = entry;
  writeFileSync(p, JSON.stringify(cur, null, 2) + "\n", "utf8");
  console.log(
    `marked ${format}: ${relative(IG_DIR, packDir).replace(/\\/g, "/")}  at=${entry.at}` +
    `${entry.url ? ` url=${entry.url}` : ""}${entry.note ? ` note=${entry.note}` : ""}`
  );
}

function doUnmark(packDir) {
  const p = join(packDir, "posted.json");
  if (!existsSync(p)) {
    console.log("posted.json がありません（未投稿）");
    return;
  }
  if (formatArg) {
    const format = resolveFormat(formatArg);
    const cur = readPosted(packDir) || { carousel: null, reels: null, stories: null };
    cur[format] = null;
    if (!anyPosted(cur)) {
      unlinkSync(p);
      console.log(`unmarked ${format}（全フォーマット空のため posted.json 削除）`);
    } else {
      writeFileSync(p, JSON.stringify(cur, null, 2) + "\n", "utf8");
      console.log(`unmarked ${format}: ${relative(IG_DIR, packDir).replace(/\\/g, "/")}`);
    }
  } else {
    unlinkSync(p);
    console.log(`unmarked（全フォーマット）: ${relative(IG_DIR, packDir).replace(/\\/g, "/")}`);
  }
}

function doMigrate() {
  let n = 0;
  for (const dir of walkPacks(IG_DIR)) {
    const raw = readPostedRaw(dir);
    if (!raw) continue;
    if (FORMATS.some((f) => f in raw)) continue; // 既に新スキーマ
    const norm = normalizePosted(raw);
    if (!norm) continue;
    writeFileSync(join(dir, "posted.json"), JSON.stringify(norm, null, 2) + "\n", "utf8");
    n++;
    console.log("migrated:", relative(IG_DIR, dir).replace(/\\/g, "/"));
  }
  console.log(`\n${n} 件を新スキーマ（carousel/reels/stories）へ移行`);
}

// ─── main（直接実行時のみ・import 時は走らせない）──────────────
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  if (command === "mark") {
    doMark(resolvePackDir(targetArg));
  } else if (command === "unmark") {
    doUnmark(resolvePackDir(targetArg));
  } else if (command === "migrate") {
    doMigrate();
  } else {
    const allPacks = walkPacks(IG_DIR).map(packInfo);
    const filtered = filterPacks(allPacks);
    if (command === "summary") {
      printSummary(filtered);
    } else {
      printTable(filtered);
    }
  }
}
