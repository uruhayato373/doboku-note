#!/usr/bin/env node
/**
 * ig-status.mjs — Instagram 投稿済みステータス管理
 *
 * パックルートに posted.json を置く（存在しない = 未投稿）
 * slide-data.json には手を加えない / A系統・B系統共通
 *
 * Usage:
 *   node scripts/ig-status.mjs                        # 全パック一覧
 *   node scripts/ig-status.mjs --exam=cem             # 試験絞り込み
 *   node scripts/ig-status.mjs --year=r07             # 年度絞り込み（exam-packs のみ）
 *   node scripts/ig-status.mjs --pending              # 未投稿のみ
 *   node scripts/ig-status.mjs --done                 # 投稿済みのみ
 *   node scripts/ig-status.mjs mark cem/exam-packs/r07/pack-01
 *   node scripts/ig-status.mjs mark cem/exam-packs/r07/pack-01 --date=2026-06-20 --note=手動
 *   node scripts/ig-status.mjs unmark cem/exam-packs/r07/pack-01
 *   node scripts/ig-status.mjs summary                # 試験別進捗サマリ
 */

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, unlinkSync } from "fs";
import { join, relative, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const IG_DIR = join(ROOT, "docs/sns/instagram");

const EXCLUDE_DIRS = new Set(["_dev", "highlights", "stories", "img", "carousel", "reels"]);
const EXAM_DIRS = ["cem", "civil-1", "civil-2", "pe-construction"];

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
const command = positional[0]; // mark / unmark / summary / undefined (list)
const targetArg = positional[1]; // relative path under IG_DIR

// ─── pack discovery ───────────────────────────────────────────
function isPack(dir) {
  const entries = readdirSync(dir);
  return entries.includes("slide-data.json") ||
    entries.includes("caption.txt") ||
    entries.includes("posted.json") ||
    entries.includes("carousel");
}

function walkPacks(dir, depth = 0) {
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

function readPosted(packDir) {
  const p = join(packDir, "posted.json");
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

function readMeta(packDir) {
  const p = join(packDir, "slide-data.json");
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8"))._meta || null; } catch { return null; }
}

function packInfo(packDir) {
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
  if (flags.pending) filtered = filtered.filter((p) => !p.posted);
  if (flags.done) filtered = filtered.filter((p) => !!p.posted);
  return filtered;
}

// ─── display ──────────────────────────────────────────────────
const COL = {
  STATUS: 7,
  EXAM: 14,
  SLUG: 36,
  DATE: 12,
  NOTE: 20,
};

function pad(s, n) {
  const str = String(s ?? "");
  return str.length >= n ? str.slice(0, n - 1) + "…" : str.padEnd(n);
}

function printTable(packs) {
  const header = [
    pad("STATUS", COL.STATUS),
    pad("EXAM", COL.EXAM),
    pad("SLUG", COL.SLUG),
    pad("DATE", COL.DATE),
    pad("NOTE", COL.NOTE),
  ].join("  ");
  console.log(header);
  console.log("-".repeat(header.length));
  for (const p of packs) {
    const status = p.posted ? "done" : "-";
    const date = p.posted?.at || "";
    const note = p.posted?.note || "";
    console.log([
      pad(status, COL.STATUS),
      pad(p.exam, COL.EXAM),
      pad(p.slug, COL.SLUG),
      pad(date, COL.DATE),
      pad(note, COL.NOTE),
    ].join("  "));
  }
  const done = packs.filter((p) => p.posted).length;
  console.log(`\n${done} / ${packs.length} 投稿済み`);
}

function printSummary(packs) {
  const byExam = {};
  for (const p of packs) {
    if (!byExam[p.exam]) byExam[p.exam] = { done: 0, total: 0 };
    byExam[p.exam].total++;
    if (p.posted) byExam[p.exam].done++;
  }
  console.log("EXAM            DONE / TOTAL  BAR");
  console.log("-".repeat(50));
  for (const [exam, { done, total }] of Object.entries(byExam)) {
    const pct = total > 0 ? Math.round((done / total) * 20) : 0;
    const bar = "█".repeat(pct) + "░".repeat(20 - pct);
    console.log(`${pad(exam, 16)}${String(done).padStart(4)} / ${String(total).padEnd(6)}  ${bar}  ${Math.round((done / total) * 100) || 0}%`);
  }
  const totalDone = packs.filter((p) => p.posted).length;
  console.log(`\n合計: ${totalDone} / ${packs.length}`);
}

// ─── mark / unmark ────────────────────────────────────────────
function resolvePackDir(arg) {
  if (!arg) {
    console.error("パスを指定してください（例: cem/exam-packs/r07/pack-01）");
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

function doMark(packDir) {
  const date = flags.date || todayISO();
  const data = { at: date };
  if (flags.note) data.note = String(flags.note);
  writeFileSync(join(packDir, "posted.json"), JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`marked: ${relative(IG_DIR, packDir).replace(/\\/g, "/")}  at=${date}${flags.note ? ` note=${flags.note}` : ""}`);
}

function doUnmark(packDir) {
  const p = join(packDir, "posted.json");
  if (!existsSync(p)) {
    console.log("posted.json がありません（未投稿）");
    return;
  }
  unlinkSync(p);
  console.log(`unmarked: ${relative(IG_DIR, packDir).replace(/\\/g, "/")}`);
}

// ─── main ─────────────────────────────────────────────────────
if (command === "mark") {
  doMark(resolvePackDir(targetArg));
} else if (command === "unmark") {
  doUnmark(resolvePackDir(targetArg));
} else {
  const allPacks = walkPacks(IG_DIR).map(packInfo);
  const filtered = filterPacks(allPacks);
  if (command === "summary") {
    printSummary(filtered);
  } else {
    printTable(filtered);
  }
}
