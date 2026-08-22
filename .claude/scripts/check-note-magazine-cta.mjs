#!/usr/bin/env node
/**
 * check-note-magazine-cta.mjs — note 有料マガジン導線 CTA の形式ゲート
 *
 * note 記事本文（content/note/**​/article.md）の有料マガジン誘導は「リンクカード」で出す。
 * そのために次の 2 形式違反を検出する（いずれも BLOCK 相当）:
 *
 *   1. markdown リンク形式のマガジンURL  `[text](…/dobokunote/m/ID)`
 *      → note ではカード化されない。bare URL を単独行に置くこと。
 *      （旧 note-lint の checkMagazineLinkCard は `](` 行を除外していたため markdown
 *        リンクがすり抜けていた＝2026-06-12 の建設部門入口記事16本 取りこぼしの根本原因）
 *
 *   2. マガジンURL／{{MAGAZINE_URL}} と同一行の価格（¥）
 *      → マガジンは価格改訂があり、本文直書きの価格は陳腐化して誤記化する。
 *        価格は note 販売ページに委譲する。価格 SoT は src/lib/note-magazines.ts。
 *
 * 例外: もくじ index ページ（frontmatter `noteSeries: 総合案内`＝L1総合案内・各資格L2もくじ）は
 *   多数マガジンを一覧する性質上 markdown リンクのコンパクト列挙を許容する（①は対象外）。
 *   ただし価格（②）は index でも禁止（陳腐化する・note カードが実価格を表示する）。
 *
 * 例外: 冒頭パック CTA（`<!-- cta:pack-top -->` / `cta:pack-top-light` マーカー直後のブロック）は
 *   note-funnel-architecture.md 原則2「冒頭はパックへ**インラインで軽く**（カード連打で読み物の信頼を
 *   損ねない）」に従い markdown リンクを意図的に用いる（①は対象外）。価格（②）は staleness ゆえ CTA でも
 *   禁止（価格は note 販売ページ＝src/lib/note-magazines.ts が SoT）。マーカー〜次の空行までを CTA 域とみなす。
 *
 * 真実源: .claude/knowledge/reference/content-principles.md §14-c
 * 呼出元: scripts/note-lint.mjs（pre-commit ゲート）/ /note-prepublish-review Phase 1
 * 兄弟:   .claude/scripts/check-note-bold-paren.mjs（同じ「1チェッカー×2呼出元」パターン）
 *
 * 終了コード: 0 = 違反なし / 1 = 違反あり / 2 = 引数エラー
 */

import { readFileSync } from "node:fs";
import { argv } from "node:process";

const files = argv.slice(2);
if (files.length === 0) {
  console.error("usage: check-note-magazine-cta.mjs <file1> [file2 ...]");
  process.exit(2);
}

const MAG_MD = /\[[^\]]*\]\([^)]*note\.com\/dobokunote\/m\/[A-Za-z0-9]+/;
const MAG_URL = /https:\/\/note\.com\/dobokunote\/m\/[A-Za-z0-9]+|\{\{MAGAZINE_URL\}\}/;
const YEN = /¥[0-9０-９]/;

/** @returns {{kind:'md'|'price', text:string}[]} */
function checkLine(line) {
  const v = [];
  if (MAG_MD.test(line)) v.push({ kind: "md", text: line.trim() });
  if (MAG_URL.test(line) && YEN.test(line)) v.push({ kind: "price", text: line.trim() });
  return v;
}

let totalViolations = 0;
const fileReports = [];
for (const file of files) {
  let content;
  try {
    content = readFileSync(file, "utf-8");
  } catch (e) {
    console.error(`SKIP: ${file} — ${e.message}`);
    continue;
  }
  // frontmatter を除外（本文のみ検査）
  const fmMatch = content.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)([\s\S]*)$/);
  const body = fmMatch ? fmMatch[2] : content;
  const fmLines = fmMatch ? fmMatch[1].split("\n").length - 1 : 0;
  // もくじ index（noteSeries: 総合案内）は markdown リンク列挙を許容（price は維持）
  const isIndex = fmMatch ? /^noteSeries:\s*総合案内\s*$/m.test(fmMatch[1]) : false;
  const lines = body.split("\n");
  const fileViolations = [];
  let inFence = false;
  let inPackTop = false; // 冒頭パック CTA 域（cta:pack-top マーカー〜次の空行）は md リンクを許容
  lines.forEach((line, idx) => {
    if (/^\s*```/.test(line)) { inFence = !inFence; return; }
    if (inFence) return;
    if (/<!--\s*cta:pack-top(-light)?\s*-->/.test(line)) { inPackTop = true; return; }
    if (inPackTop && line.trim() === "") { inPackTop = false; }
    const v = checkLine(line).filter((x) => !((isIndex || inPackTop) && x.kind === "md"));
    if (v.length > 0) fileViolations.push({ line: idx + 1 + fmLines, v });
  });
  if (fileViolations.length > 0) {
    fileReports.push({ file, violations: fileViolations });
    totalViolations += fileViolations.reduce((a, b) => a + b.v.length, 0);
  }
}

if (fileReports.length === 0) {
  console.log("✅ Magazine CTA : OK (markdown-link 0 / price-on-url-line 0)");
  process.exit(0);
} else {
  console.log("Magazine CTA : NG");
  const MSG = {
    md: "markdownリンク不可 → bare URL を単独行に（リンクカード化）",
    price: "CTAに価格(¥)を書かない（改訂で陳腐化・SoTはnote販売ページ）",
  };
  fileReports.forEach(({ file, violations }) => {
    console.log(`  ${file}:`);
    violations.forEach(({ line, v }) => {
      v.forEach(({ kind, text }) => {
        const preview = text.length > 60 ? text.slice(0, 60) + "..." : text;
        console.log(`    L${line}: [${MSG[kind]}] ${preview}`);
      });
    });
  });
  console.log(`\nTotal: ${totalViolations} violations across ${fileReports.length} files`);
  process.exit(1);
}
