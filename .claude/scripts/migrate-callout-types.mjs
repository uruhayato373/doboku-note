#!/usr/bin/env node
/**
 * Callout type 一括移行スクリプト（2026-04-22 PR #96）
 *
 * Claude Design ハンドオフでの Callout 再設計に伴い、旧 type を新 type に統合する。
 *
 * マッピング:
 *   info    → note
 *   warning → warn
 *   caution → warn
 *   note    → note  (変更なし)
 *   tip     → tip   (変更なし)
 *
 * error / success / question / danger は既存 MDX で未使用のため対象外。
 * CRLF を保持するため `.claude/scripts/lib/mdx-io.mjs` の `transformMdxFile` を使用。
 *
 * 使い方:
 *   node .claude/scripts/migrate-callout-types.mjs           # 実行（書き換え）
 *   node .claude/scripts/migrate-callout-types.mjs --dry-run # 置換対象の確認のみ
 */

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { transformMdxFile } from "./lib/mdx-io.mjs";

const ROOT = "content/site";
const DRY_RUN = process.argv.includes("--dry-run");

const MAPPING = [
  { from: "info", to: "note" },
  { from: "warning", to: "warn" },
  { from: "caution", to: "warn" },
];

/** 再帰的に .mdx ファイルを列挙 */
function walk(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.endsWith(".mdx")) {
      results.push(full);
    }
  }
  return results;
}

const files = walk(ROOT);
let totalChanges = 0;
let touchedFiles = 0;
const perTypeCount = Object.fromEntries(MAPPING.map((m) => [m.from, 0]));

for (const file of files) {
  let fileChanges = 0;

  const transform = (raw) => {
    let next = raw;
    for (const { from, to } of MAPPING) {
      // `<Callout type="<from>"` → `<Callout type="<to>"`
      // type 属性の値ちょうどに一致（部分一致を避ける）
      const pattern = new RegExp(
        `(<Callout\\s+[^>]*?type=")${from}(")`,
        "g",
      );
      const matches = next.match(pattern);
      if (matches) {
        perTypeCount[from] += matches.length;
        fileChanges += matches.length;
      }
      next = next.replace(pattern, `$1${to}$2`);
    }
    return next === raw ? null : next;
  };

  if (DRY_RUN) {
    // dry-run: 置換しないで count のみ
    const dryRaw = (await import("node:fs")).readFileSync(file, "utf-8");
    const result = transform(dryRaw);
    if (result !== null) {
      touchedFiles++;
      totalChanges += fileChanges;
      console.log(`[dry-run] ${file}: ${fileChanges} change(s)`);
    }
  } else {
    const written = transformMdxFile(file, transform);
    if (written) {
      touchedFiles++;
      totalChanges += fileChanges;
      console.log(`✓ ${file}: ${fileChanges} change(s)`);
    }
  }
}

console.log(`\n=== summary${DRY_RUN ? " (dry-run)" : ""} ===`);
console.log(`files scanned : ${files.length}`);
console.log(`files changed : ${touchedFiles}`);
console.log(`total changes : ${totalChanges}`);
for (const [from, count] of Object.entries(perTypeCount)) {
  const to = MAPPING.find((m) => m.from === from).to;
  console.log(`  ${from} → ${to}: ${count}`);
}
