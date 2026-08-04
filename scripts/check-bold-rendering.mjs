#!/usr/bin/env node
/**
 * 太字（**...**）が実際に描画されるかを、規則の再実装ではなく AST の実測で検査する。
 *
 * 背景: CommonMark の right-flanking 規則により、閉じ ** の直前が約物で直後が
 * 文字だと ** は閉じデリミタとして認識されず、太字にならずアスタリスクが
 * そのまま画面に出る（例: `**標準貫入試験（SPT）**である`）。
 *
 * pre-commit-mdx.mjs の checkBoldEndingParen は「）」』】）」の5文字だけを見る
 * 近似ルールで、`**用語。**です` `**A・B**では` のような他の約物を取りこぼす。
 * ここでは remark で実際にパースし、text ノードに `**` が生き残っていたら
 * 「太字にならなかった」と判定する（＝描画結果そのものが根拠）。
 *
 * 使い方:
 *   node scripts/check-bold-rendering.mjs            # 全量
 *   node scripts/check-bold-rendering.mjs --staged   # staged のみ（pre-commit 用）
 *   node scripts/check-bold-rendering.mjs --json     # 機械可読（fixer が読む）
 */

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { globSync } from "node:fs";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const args = process.argv.slice(2);
const STAGED = args.includes("--staged");
const JSON_OUT = args.includes("--json");

const ROOTS = [".local/r2/posts"];

/**
 * 既知の未修正。件数は必ず出力し、黙って隠さない（CLAUDE.md §9）。
 * ここに足すのは「直し方は判っているが別ゲートに阻まれて commit できない」場合だけ。
 */
const ALLOWLIST = new Map([
  [
    ".local/r2/posts/pe-comprehensive-management/primary-statistics-2026/article.mdx",
    "check-guide-length（本文2713字<3000）がこのファイルを触る commit を全て弾くため未修正。" +
      "字数を満たすためだけの水増しはしない。記事を加筆して 3000 字に達したら修正して本行を削除する。",
  ],
]);

/** frontmatter を除去し、本文と「本文1行目が元ファイルの何行目か」を返す */
function stripFrontmatter(raw) {
  if (!raw.startsWith("---")) return { body: raw, offset: 0 };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { body: raw, offset: 0 };
  const head = raw.slice(0, end);
  const nl = head.split("\n").length + 1; // 閉じ --- の行
  const rest = raw.slice(end + 4).replace(/^[^\n]*\n?/, "");
  return { body: rest, offset: nl };
}

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

/** text ノードだけを走査して `**` の残存を拾う */
function findUnrendered(body) {
  let tree;
  try {
    tree = processor.parse(body);
  } catch {
    return null; // パース不能は呼び出し側で skip 集計
  }
  const hits = [];
  const walk = (node) => {
    if (node.type === "text" && node.value.includes("**")) {
      hits.push({
        line: node.position?.start?.line ?? 0,
        value: node.value,
      });
    }
    // code / inlineCode / math は太字対象外なので降りない
    if (node.type === "code" || node.type === "inlineCode") return;
    if (node.type === "math" || node.type === "inlineMath") return;
    (node.children ?? []).forEach(walk);
  };
  walk(tree);
  return hits;
}

function listFiles() {
  if (STAGED) {
    const out = execFileSync(
      "git",
      ["diff", "--cached", "--name-only", "--diff-filter=ACM"],
      { encoding: "utf8" },
    );
    return out
      .split("\n")
      .map((s) => s.trim())
      .filter((f) => f.endsWith(".mdx") && ROOTS.some((r) => f.startsWith(r)));
  }
  return ROOTS.flatMap((r) =>
    globSync(`${r}/**/*.mdx`, { withFileTypes: false }),
  ).map((p) => String(p).split("\\").join("/"));
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
  const hits = findUnrendered(body);
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
  console.log(JSON.stringify({ scanned: files.length, findings }, null, 2));
  process.exit(findings.length ? 1 : 0);
}

const label = STAGED ? "（staged）" : "";
const allowNote = allowed ? `・allowlist ${allowed} 件を除外` : "";

// 検査ゼロを PASS と呼ばない（CLAUDE.md §9）
if (files.length === 0) {
  if (STAGED) {
    console.log(`[check-bold-rendering] skip（対象 .mdx が staged に無し）`);
    process.exit(0);
  }
  console.error(
    `[check-bold-rendering] FAIL: 検査対象が 0 件。走査ルート ${ROOTS.join(", ")} を確認せよ（検査不成立）`,
  );
  process.exit(1);
}

if (parseFailed) {
  console.error(
    `[check-bold-rendering] FAIL: ${parseFailed} 件がパース不能（検査不成立）`,
  );
  process.exit(1);
}

if (findings.length === 0) {
  console.log(
    `[check-bold-rendering] OK（描画されない太字なし${label}・${files.length} 記事を実検査${allowNote}）`,
  );
  process.exit(0);
}

console.error(
  `[check-bold-rendering] ${findings.length} 件の太字が描画されない${label}（${files.length} 記事を実検査）:`,
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
console.error(
  "  原因: 閉じ ** の直前が約物・直後が文字だと CommonMark の right-flanking が",
);
console.error(
  "  成立せず、太字にならずアスタリスクがそのまま表示される。約物を ** の外へ出す。",
);
console.error("  例: **標準貫入試験（SPT）**である → **標準貫入試験**（SPT）である");
console.error("  一括修正: node scripts/fix-bold-rendering.mjs --commit");
process.exit(1);
