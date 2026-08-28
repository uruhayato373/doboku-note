#!/usr/bin/env node
/**
 * GFM テーブルが実際に table として描画されるかを、規則の再実装ではなく AST の実測で検査する。
 *
 * 背景: 2026-08-28、表が生のパイプ区切りテキストとして表示される事故が 2 原因で発生した。
 *   (1) 改行コードの \r\r\n 破損（過去問18本・micromark が行末を1つ多く解釈しヘッダ行と
 *       デリミタ行が分断される）
 *   (2) ヘッダ行とデリミタ行のセル数不一致（r02-primary・GFM はセル数一致を要求）
 * 原因ごとにルールを足すのではなく、症状（デリミタ行が table にならず text ノードとして
 * 生き残る）そのものを観測するので、まだ知らない第3の原因も同じ網で拾える。
 *
 * 検出ロジックは scripts/lib/table-rendering-rules.mjs（テストが直接 import する）。
 *
 * 使い方:
 *   node scripts/check-table-rendering.mjs            # 全量
 *   node scripts/check-table-rendering.mjs --staged   # staged のみ（pre-commit 用）
 *   node scripts/check-table-rendering.mjs --json     # 機械可読
 */

import { readFileSync, writeSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { findUnrenderedTables, stripFrontmatter } from "./lib/table-rendering-rules.mjs";

const args = process.argv.slice(2);
const STAGED = args.includes("--staged");
const JSON_OUT = args.includes("--json");

const ROOTS = ["content/site"];

/**
 * 既知の未修正。件数は必ず出力し、黙って隠さない（CLAUDE.md §9）。
 * ここに足すのは「直し方は判っているが別ゲートに阻まれて commit できない」場合だけ。
 */
const ALLOWLIST = new Map();

function listFiles() {
  if (STAGED) {
    const out = execFileSync(
      "git",
      ["diff", "--cached", "--name-only", "--diff-filter=ACM"],
      { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
    );
    return out
      .split("\n")
      .map((s) => s.trim())
      .filter((f) => f.endsWith(".mdx") && ROOTS.some((r) => f.startsWith(r)));
  }
  // fs.globSync は Node 22+ 専用。CI は Node 20 なので使えない
  // （使うと対象0件になり「検査不成立」で落ちる。2026-08-04 に CI で顕在化）。
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name.endsWith(".mdx")) out.push(p);
    }
  };
  ROOTS.forEach(walk);
  return out;
}

const files = listFiles();
const findings = [];
let parseFailed = 0;
let allowed = 0;

for (const file of files) {
  let raw;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    parseFailed++;
    continue;
  }
  const { body, offset } = stripFrontmatter(raw);
  const hits = findUnrenderedTables(body);
  if (hits === null) {
    parseFailed++;
    continue;
  }
  if (hits.length && ALLOWLIST.has(file)) {
    allowed += hits.length;
    continue;
  }
  for (const h of hits) {
    // 元ファイル上の行番号へ戻し、該当行の実テキストを添える
    const lineNo = h.line + offset;
    const srcLine = raw.split("\n")[lineNo - 1] ?? "";
    findings.push({ file, line: lineNo, text: srcLine.trim() });
  }
}

if (JSON_OUT) {
  writeSync(1, JSON.stringify({ scanned: files.length, findings }, null, 2) + "\n");
  process.exit(findings.length ? 1 : 0);
}

const label = STAGED ? "（staged）" : "";
const allowNote = allowed ? `・allowlist ${allowed} 件を除外` : "";

// 検査ゼロを PASS と呼ばない（CLAUDE.md §9）
if (files.length === 0) {
  if (STAGED) {
    console.log(`[check-table-rendering] skip（対象 .mdx が staged に無し）`);
    process.exit(0);
  }
  console.error(
    `[check-table-rendering] FAIL: 検査対象が 0 件。走査ルート ${ROOTS.join(", ")} を確認せよ（検査不成立）`,
  );
  process.exit(1);
}

if (parseFailed) {
  console.error(
    `[check-table-rendering] FAIL: ${parseFailed} 件がパース不能（検査不成立）`,
  );
  process.exit(1);
}

if (findings.length === 0) {
  console.log(
    `[check-table-rendering] OK（描画されない表なし${label}・${files.length} 記事を実検査${allowNote}）`,
  );
  process.exit(0);
}

console.error(
  `[check-table-rendering] ${findings.length} 件の表が描画されない${label}（${files.length} 記事を実検査）:`,
);
console.error("");
for (const f of findings.slice(0, 40)) {
  const excerpt = f.text.length > 110 ? `${f.text.slice(0, 110)}…` : f.text;
  console.error(`  ${f.file}:${f.line}`);
  console.error(`    ${excerpt}`);
}
if (findings.length > 40) {
  console.error(`  … 他 ${findings.length - 40} 件`);
}
console.error("");
console.error("  よくある原因:");
console.error("  1. ヘッダ行とデリミタ行のセル数不一致（GFM はセル数一致を要求する）");
console.error("  2. 改行コードの破損（連続 CR。node scripts/check-table-rendering.mjs で");
console.error("     見つかったら validate-mdx の line-ending 検査も確認する）");
console.error("  3. 直前の行と空行なしで繋がっている（ヘッダ行の直前には空行が要る）");
process.exit(1);
