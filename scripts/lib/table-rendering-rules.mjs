/**
 * GFM テーブルが実際に table としてパースされたかを AST で判定する純関数群。
 *
 * 背景: 表がテーブルにならず生のパイプ区切りテキストとして表示される事故が
 * 2026-08-28 に 2 原因で発生した。
 *   (1) 改行コードが \r\r\n に破損（micromark が行末トークンを1つ多く解釈し、
 *       全行間に空行が挿入された扱いになってヘッダ行とデリミタ行が分断される）
 *   (2) ヘッダ行とデリミタ行のセル数不一致（GFM はセル数一致を要求する）
 *
 * どちらも「原因」は違うが「症状」は同じ＝デリミタ行が table にならず text ノードとして
 * 生き残る。原因ごとにルールを足すのではなく、症状そのものを AST で観測する。
 *
 * scripts/check-bold-rendering.mjs と同じ設計（規則の再実装をせず remark で実パース）。
 * テストから import できるよう検出ロジックだけをここに置く。
 */

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

/**
 * GFM テーブルのデリミタ行パターン。
 * `|---|---|` `|:---|---:|` `---|---`（先頭パイプ省略）等にマッチする。
 * m フラグ付きで text ノードの複数行の値にも当てる。
 */
export const DELIMITER_ROW_PATTERN = /^\s*\|?\s*:?-{3,}:?\s*\|/m;

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMath);

/**
 * frontmatter を除去し、本文と「本文1行目が元ファイルの何行目か」を返す。
 * check-bold-rendering.mjs の stripFrontmatter と同一仕様。
 */
export function stripFrontmatter(raw) {
  if (!raw.startsWith("---")) return { body: raw, offset: 0 };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { body: raw, offset: 0 };
  const head = raw.slice(0, end);
  const nl = head.split("\n").length + 1; // 閉じ --- の行
  const rest = raw.slice(end + 4).replace(/^[^\n]*\n?/, "");
  return { body: rest, offset: nl };
}

/**
 * 本文を実パースし、text ノードに残ったデリミタ行を拾う。
 *
 * @param {string} body frontmatter を除いた本文
 * @returns {Array<{line: number, value: string}> | null} パース不能なら null
 */
export function findUnrenderedTables(body) {
  let tree;
  try {
    tree = processor.parse(body);
  } catch {
    return null; // パース不能は呼び出し側で skip 集計
  }
  const hits = [];
  const walk = (node) => {
    if (node.type === "text" && DELIMITER_ROW_PATTERN.test(node.value)) {
      hits.push({
        line: node.position?.start?.line ?? 0,
        value: node.value,
      });
    }
    // code / inlineCode / math はテーブル対象外なので降りない
    // （コードブロック内のパイプ区切りを誤検出しないため）
    if (node.type === "code" || node.type === "inlineCode") return;
    if (node.type === "math" || node.type === "inlineMath") return;
    (node.children ?? []).forEach(walk);
  };
  walk(tree);
  return hits;
}
