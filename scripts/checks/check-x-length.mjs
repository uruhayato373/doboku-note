#!/usr/bin/env node
/**
 * check-x-length.mjs
 *
 * X(Twitter) の文字数上限に対する違反検出。
 * content/sns/x/draft/<NNN>-*\/tweets.md を読み、`## Tweet NN` ブロックごとに
 * 重み付き文字数を算出する。
 *
 * 上限（ハイブリッド運用・policy §2/§2.1）:
 *  - 既定は 280（短文デフォルト＝リーチ最適）
 *  - `## Tweet NN:` 見出しに [longform] マーカーが付いたツイートのみ 25,000 に緩和
 *    （X Premium 長文。weighted 判定なので実文字数 25,000 より保守的＝安全側）
 *
 * X の重み規則:
 *  - URL は実長によらず 23 固定
 *  - U+0000..U+10FF / U+2000..U+200D / U+2010..U+201F / U+2032..U+2037 は 1
 *  - それ以外（CJK 等）は 2
 *
 * Usage:
 *   node scripts/checks/check-x-length.mjs                  # 全ドラフト
 *   node scripts/checks/check-x-length.mjs --draft 004      # 単一
 *   node scripts/checks/check-x-length.mjs --over           # 違反のみ表示
 *   node scripts/checks/check-x-length.mjs --json           # JSON 出力
 *   node scripts/checks/check-x-length.mjs --pending-only   # 投稿済み（台帳の phase が posted・retired）を除く＝旧 CI ゲート（quality-audit x-length。SNS の保留に合わせて 2026-10-25 に CI から外した。再開するときに作り直す）
 *
 * Exit code: 違反があれば 1
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { parseTweetBlocks } from "../lib/x-tweets-md.mjs";
import { loadXPosts } from "../lib/registry-x-store.mjs";
import { REPO_ROOT } from "../lib/repository-paths.mjs";
import { isCliEntry } from '../lib/cli-run.mjs';
const __dirname = dirname(fileURLToPath(import.meta.url));
const DRAFTS_DIR = join(__dirname, "../../content/sns/x/draft");
const LIMIT = 280;
const LONGFORM_LIMIT = 25000; // X Premium 長文（[longform] マーカー時のみ）
const URL_WEIGHT = 23;

function charWeight(cp) {
  if (cp <= 0x10ff) return 1;
  if (cp >= 0x2000 && cp <= 0x200d) return 1;
  if (cp >= 0x2010 && cp <= 0x201f) return 1;
  if (cp >= 0x2032 && cp <= 0x2037) return 1;
  return 2;
}

function weightFor(s) {
  let w = 0;
  for (const ch of s) w += charWeight(ch.codePointAt(0));
  return w;
}

export function tweetLength(text) {
  const urlRe = /https?:\/\/[^\s]+/g;
  let weighted = 0;
  let last = 0;
  let m;
  while ((m = urlRe.exec(text)) !== null) {
    weighted += weightFor(text.slice(last, m.index));
    weighted += URL_WEIGHT;
    last = m.index + m[0].length;
  }
  weighted += weightFor(text.slice(last));
  return weighted;
}

export function splitTweets(md) {
  // ブロックの切り出し（制作メモの除去・[thread] の分割）は parseTweetBlocks が唯一の実装。
  // [thread]: 本文と "--- リプライ ---" の各部が独立ツイート → 個別判定（policy §5.2.1）。非 thread のリプライ注記は投稿対象外。
  const rows = [];
  for (const b of parseTweetBlocks(md)) {
    const num = Number(b.key);
    const longform = /\[longform\]/i.test(b.title);
    const parts = [b.text, ...b.threadParts].filter(Boolean);
    const header = `${String(num).padStart(2, "0")}: ${b.title}`;
    parts.forEach((part, pi) => {
      rows.push({ num, header: b.threadParts.length ? `${header} [part ${pi + 1}/${parts.length}]` : header, body: part, longform });
    });
  }
  return rows;
}

// 投稿済み・停止（差し替え済み・取り下げ）の投稿は X 上で確定しているので、原稿を直しても意味がない（CI の対象外）。
const SETTLED = new Set(["posted", "retired"]);

/** 台帳から「下書きフォルダ → { 投稿番号 → phase }」を読む（無ければ空）。 */
function phasesByFolder() {
  const out = new Map();
  for (const p of loadXPosts(REPO_ROOT)) {
    if (!p.folder) continue;
    if (!out.has(p.folder)) out.set(p.folder, {});
    out.get(p.folder)[String(Number(p.key))] = p.phase;
  }
  return out;
}

/** 投稿済み・停止（phase が posted・retired）を除く。--pending-only（CI）の対象選別。 */
export function pendingOnly(rows, phaseByNum) {
  return rows.filter((r) => !SETTLED.has(phaseByNum[String(Number(r.num))]));
}

function checkDraft(folder) {
  const path = join(DRAFTS_DIR, folder, "tweets.md");
  if (!existsSync(path)) return null;
  const md = readFileSync(path, "utf8");
  const tweets = splitTweets(md);
  return tweets.map((t) => {
    const length = tweetLength(t.body);
    const limit = t.longform ? LONGFORM_LIMIT : LIMIT;
    return {
      folder,
      num: t.num,
      header: t.header,
      length,
      limit,
      longform: t.longform,
      over: length > limit,
      body: t.body,
    };
  });
}

function listDrafts() {
  return readdirSync(DRAFTS_DIR)
    .filter((e) => /^\d{3}-/.test(e))
    .sort();
}

function main() {
  const args = process.argv.slice(2);
  const draftIdx = args.indexOf("--draft");
  const onlyOver = args.includes("--over");
  const pending = args.includes("--pending-only");
  const asJson = args.includes("--json");

  let folders;
  if (draftIdx !== -1) {
    const id = String(parseInt(args[draftIdx + 1], 10)).padStart(3, "0");
    folders = listDrafts().filter((f) => f.startsWith(id + "-"));
  } else {
    folders = listDrafts();
  }

  const phases = pending ? phasesByFolder() : new Map();
  const all = [];
  let settled = 0;
  for (const f of folders) {
    const rows = checkDraft(f) || [];
    const kept = pending ? pendingOnly(rows, phases.get(f) ?? {}) : rows;
    settled += rows.length - kept.length;
    all.push(...kept);
  }

  const violations = all.filter((r) => r.over);

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          total: all.length,
          violations: violations.length,
          rows: onlyOver ? violations : all,
        },
        null,
        2
      )
    );
  } else {
    const byFolder = new Map();
    for (const r of all) {
      if (!byFolder.has(r.folder)) byFolder.set(r.folder, []);
      byFolder.get(r.folder).push(r);
    }
    for (const [folder, rows] of byFolder) {
      const overs = rows.filter((r) => r.over);
      if (onlyOver && overs.length === 0) continue;
      const summary = overs.length
        ? `${overs.length}/${rows.length} OVER`
        : `${rows.length} OK`;
      console.log(`\n📄 ${folder}  (${summary})`);
      for (const r of rows) {
        if (onlyOver && !r.over) continue;
        const mark = r.over ? "❌" : "✅";
        const lf = r.longform ? " [LF]" : "";
        console.log(
          `  ${mark} Tweet ${String(r.num).padStart(2, "0")}  ${String(r.length).padStart(3, " ")}/${r.limit}${lf}  ${r.header.slice(0, 40)}`
        );
      }
    }
    const lfCount = all.filter((r) => r.longform).length;
    console.log(
      `\n── Summary: ${all.length} tweets / ${violations.length} violations (short ${LIMIT} / longform ${LONGFORM_LIMIT}; ${lfCount} longform)${pending ? ` / 投稿済み ${settled} 件は対象外` : ""}`
    );
  }

  process.exit(violations.length > 0 ? 1 : 0);
}

if (isCliEntry(import.meta.url)) main();
