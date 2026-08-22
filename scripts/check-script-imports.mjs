#!/usr/bin/env node
// スクリプト層（scripts/** ・ .claude/scripts/** ・ .claude/skills/**）の
// **壊れた相対 import** を検出する決定的ゲート。
//
// なぜ必要か（tsc の死角）:
//   tsconfig.json の include は `**/*.ts` `**/*.tsx` のみで、`.mjs` は型検査の対象外。
//   さらに `.claude/**` は実質ノーチェック。つまり **スクリプト層の import 破損は
//   誰も見ていない**。実害:
//     - 2026-07-06: `.claude/scripts/report-monetization-coverage.mts` が
//       magazine-placement.ts の削除済み export を import → 6 週間実行不能。
//       週次レビューは古い集計を貼り続けた
//     - スキル移動（`.claude/skills/content/` → `quality/`）に追随せず
//       `scripts/batch-approve.mjs` が ERR_MODULE_NOT_FOUND で全損（4 か月放置）
//   どちらも「実行して初めて分かる」＝実行しなくなった経路では永久に気づけない。
//   knip の `Unresolved imports` は後者を報告していたが `ci:false`（report）のため
//   誰も読んでおらず、無いのと同じだった（2026-08-16 発覚）。
//
// 何を見るか: 相対パス（`./` `../`）の静的 import / export-from / 動的 import。
//   bare specifier（`node:fs` や npm パッケージ）は対象外＝依存解決は knip の領分。
//
// exit 0 = 破損なし / exit 1 = 破損あり
//
// 「検査ゼロを PASS と呼ばない」（CLAUDE.md §9）: 走査対象が 0 件なら exit 1。

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOTS = ["scripts", ".claude/scripts", ".claude/skills"];
const EXT = /\.(mjs|mts|js|cjs)$/;
const SKIP_DIR = new Set(["node_modules", ".git", "out", ".next", "dist"]);

// ビルド時生成など、リポジトリに実体が無くても正常なもの。
const ALLOW = [
  /\/pagefind\/pagefind\.js$/, // Pagefind がビルド時に out/ へ生成する
];

function walk(dir, acc = []) {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return acc;
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    if (SKIP_DIR.has(e.name) || e.name.startsWith(".") && e.name !== ".claude") continue;
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel, acc);
    else if (EXT.test(e.name)) acc.push(rel);
  }
  return acc;
}

// import/export ... from '...' / import('...') の相対パスだけを拾う。
const PATTERNS = [
  /(?:^|\s)(?:import|export)\s[^;'"]*?from\s*['"](\.[^'"]+)['"]/g,
  /(?:^|[^.\w])import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g,
];

/**
 * コメント行を空行へ潰す（行番号を保つ）。行ベースの単純判定にしている。
 *
 * これをしないと、ヘッダコメントの使用例（`import { x } from` に続く相対パス）を
 * 実 import と誤認して落ちる（自作直後に 4 件の偽陽性を出した）。
 *
 * 文字単位で状態機械を書くと**正規表現リテラルを文字列と誤認して壊れる**
 * （`['"]` の `'` を文字列開始と読んで以降が全部ずれた・実装直後に踏んだ）。
 * 実 import が「行頭が // や * の行」に現れることは無いので、行判定で十分。
 */
function stripComments(src) {
  return src
    .split("\n")
    .map((l) => {
      const t = l.trimStart();
      return t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") ? "" : l;
    })
    .join("\n");
}

const files = ROOTS.flatMap((r) => walk(r));

if (files.length === 0) {
  console.error("[check-script-imports] 検査不成立: 走査対象のスクリプトが 1 件も見つかりません。");
  console.error("  ROOTS の設定かディレクトリ構成の破損を疑ってください（「破損なし」ではありません）。");
  process.exit(1);
}

const broken = [];
let edges = 0;

for (const rel of files) {
  const abs = join(ROOT, rel);
  let src;
  try {
    src = readFileSync(abs, "utf-8");
  } catch {
    continue;
  }
  const lines = src.split("\n");
  const code = stripComments(src);
  for (const re of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(code))) {
      const spec = m[1];
      if (ALLOW.some((a) => a.test(spec))) continue;
      edges++;
      const target = resolve(dirname(abs), spec);
      if (existsSync(target) && statSync(target).isFile()) continue;
      // 拡張子省略（ESM では非推奨だが CJS 互換で書かれている場合がある）
      const guesses = [".mjs", ".mts", ".js", ".cjs", "/index.mjs", "/index.js"];
      if (guesses.some((g) => existsSync(target + g))) continue;
      const before = code.slice(0, m.index);
      const line = before.split("\n").length;
      void lines;
      broken.push({ file: rel, line: line || 0, spec });
    }
  }
}

console.log(`[check-script-imports] ${files.length} ファイル / 相対 import ${edges} 件を実検査`);

if (broken.length) {
  console.error(`\n[check-script-imports] FAIL: 解決できない相対 import が ${broken.length} 件あります。`);
  for (const b of broken) console.error(`  ${b.file}:${b.line}  →  ${b.spec}`);
  console.error(
    "\n  参照先の移動・削除に追随できていない可能性が高い。実行されなくなった経路は" +
      "\n  実行時エラーでも気づけないため、ここで止める（真実源: CLAUDE.md §9）。",
  );
  process.exit(1);
}

console.log("[check-script-imports] ✓ 相対 import の解決に失敗したものはありません");
process.exit(0);
