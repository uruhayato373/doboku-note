#!/usr/bin/env node
/**
 * check-callout-types.mjs
 * ---------------------------------------------------------------------------
 * <Callout type="..."> の type が未知の場合、Callout.tsx はランタイムで黙って
 * "note" へフォールバックする（誤タイプの MDX がビルドを通ってしまう＝
 * 静的監査 UI-008 の指摘）。TypeScript の型（CalloutKind）は MDX（.mdx/.md）の
 * 属性文字列を静的検査しないため、これは content lint で拾うしかない。
 *
 * 許容集合は Callout.tsx から正規表現抽出する（二重管理を避け、Callout.tsx を
 * 単一の真実源にする）。CalloutKind の型定義や LEGACY_ALIASES を変更したら、
 * このスクリプトを直す必要はない（自動で追従する）。
 *
 *   node scripts/check-callout-types.mjs           # content/ 全体を検査
 *   node scripts/check-callout-types.mjs <path...> # 対象を限定
 *
 * exit 0 = 未知 type 0 件 / exit 1 = 未知 type 検出 or 検査不成立
 * 「検査ゼロを PASS と呼ばない」(CLAUDE.md §9): 走査ファイル数・検出 Callout 数を
 * 必ず出力し、0 件のときは検査不成立として exit 1 にする。
 * ---------------------------------------------------------------------------
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirnameOf(import.meta.url), "..");
const CALLOUT_SRC = join(ROOT, "src/components/ui/Callout/Callout.tsx");
const DEFAULT_TARGETS = ["content"];

function dirnameOf(metaUrl) {
  return fileURLToPath(new URL(".", metaUrl));
}

function extractAllowedTypes() {
  const src = readFileSync(CALLOUT_SRC, "utf-8");

  const kindMatch = src.match(/export type CalloutKind =([\s\S]*?);/);
  const kinds = kindMatch
    ? [...kindMatch[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1])
    : [];

  const legacyMatch = src.match(/LEGACY_ALIASES\s*=\s*{([\s\S]*?)}\s*as const/);
  const legacy = legacyMatch
    ? [...legacyMatch[1].matchAll(/^\s*([a-z]+):/gm)].map((m) => m[1])
    : [];

  return { kinds, legacy, allowed: new Set([...kinds, ...legacy]) };
}

function walk(dir, exts, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walk(full, exts, out);
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function lineOf(content, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (content[i] === "\n") line++;
  }
  return line;
}

function main() {
  const { kinds, legacy, allowed } = extractAllowedTypes();
  if (kinds.length === 0) {
    console.error(
      "[check-callout-types] 検査不成立: Callout.tsx から CalloutKind を抽出できませんでした（正規表現の不一致 or ファイル移動）。",
    );
    process.exit(1);
  }

  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const targets = args.length > 0 ? args : DEFAULT_TARGETS;

  const files = [];
  for (const t of targets) {
    const full = join(ROOT, t);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, [".mdx", ".md"], files);
    } else {
      files.push(full);
    }
  }

  if (files.length === 0) {
    console.error("[check-callout-types] 検査不成立: 対象 .mdx/.md ファイルが 0 件でした。");
    process.exit(1);
  }

  const TAG_RE = /<Callout\b([^>]*)>/g;
  const TYPE_RE = /type\s*=\s*["']([^"']+)["']/;

  let calloutCount = 0;
  const violations = [];

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    let m;
    while ((m = TAG_RE.exec(content)) !== null) {
      calloutCount++;
      const typeMatch = m[1].match(TYPE_RE);
      if (!typeMatch) continue; // type 省略 = 既定 "note"、許容
      const type = typeMatch[1];
      if (!allowed.has(type)) {
        violations.push({
          file: relative(ROOT, file),
          line: lineOf(content, m.index),
          type,
        });
      }
    }
  }

  if (calloutCount === 0) {
    console.error(
      `[check-callout-types] 検査不成立: ${files.length} ファイルを走査しましたが <Callout> が 0 件でした。パターンの不一致を疑ってください。`,
    );
    process.exit(1);
  }

  console.log(
    `[check-callout-types] ${files.length} ファイル走査・<Callout> ${calloutCount} 件検出・許容 type ${kinds.length} 種 + legacy ${legacy.length} 種`,
  );

  if (violations.length > 0) {
    console.error(`\n[check-callout-types] FAIL: 未知の Callout type が ${violations.length} 件あります。`);
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}  type="${v.type}"`);
    }
    console.error(
      `\n  許容 type: ${kinds.join(", ")}\n  legacy alias（自動変換）: ${legacy.join(", ")}\n` +
        "  未知 type は現状ランタイムで黙って \"note\" へフォールバックするため、意図した色/アイコンが出ません。",
    );
    process.exit(1);
  }

  console.log("[check-callout-types] ✓ 未知の Callout type はありません");
  process.exit(0);
}

main();
