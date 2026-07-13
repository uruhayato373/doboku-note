// katex-audit.mjs — MDX 本文の数式を KaTeX strict モードで検査する純ロジック。
//
// build（rehype-katex, 既定 strict:'warn'）が出す KaTeX 警告を、ビルド前に
// ファイル/行/数式/警告コード単位で可視化するための共通ロジック。
//
// 抽出は build と同じ remark-math パイプラインで行う（正規表現ではない）ため、
// 「本文の $100 と $200」のように remark-math が数式と解釈する箇所も build と
// 1:1 で一致する（＝これらは真の警告であり、修正は prose 側の \$ エスケープ）。
//
// エクスポート:
//   stripFrontmatter(raw) -> { fmBlock, body, fmLineCount }
//   extractMathNodes(body) -> [{ type, value, startOffset, endOffset, line }]
//   auditMathValue(value, displayMode) -> [{ code, message }]
//   auditContent(raw) -> [{ line, displayMode, code, message, math }]
//   safeFixMath(math) -> string    // 数式内限定の低リスク記号置換
//   SAFE_MATH_REPLACEMENTS

import katex from 'katex';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMath from 'remark-math';
import { visit } from 'unist-util-visit';

// 数式の意味を変えない低リスク置換（全角演算子・全角記号・U+2212・% コメント）。
// 数式スパン内のみに適用する（prose には触れない）。
export const SAFE_MATH_REPLACEMENTS = [
  [/＝/g, '='],
  [/＜/g, '<'],
  [/＞/g, '>'],
  [/＋/g, '+'],
  [/－/g, '-'],   // U+FF0D 全角ハイフンマイナス
  [/−/g, '-'],    // U+2212 minus sign（unknownSymbol の主因）
  [/／/g, '/'],
  [/×/g, '\\times '],
  [/÷/g, '\\div '],
  [/％/g, '\\%'],           // 全角パーセント
  [/(?<!\\)%/g, '\\%'],     // 既に \% になっていない % のみ（コメント化を防ぐ）
];

/**
 * frontmatter ブロックを本文から分離する。offset/行番号の補正に使う。
 * @param {string} raw
 * @returns {{ fmBlock: string, body: string, fmLineCount: number }}
 */
export function stripFrontmatter(raw) {
  const m = raw.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n?)/);
  const fmBlock = m ? m[1] : '';
  const body = raw.slice(fmBlock.length);
  const fmLineCount = fmBlock ? fmBlock.split('\n').length - 1 : 0;
  return { fmBlock, body, fmLineCount };
}

/**
 * remark-math で本文から数式ノードを抽出する（build と同一の解釈）。
 * @param {string} body frontmatter を除いた本文
 * @returns {{ type: 'math'|'inlineMath', value: string, startOffset: number, endOffset: number, line: number }[]}
 */
export function extractMathNodes(body) {
  const tree = unified().use(remarkParse).use(remarkMath).parse(body);
  const nodes = [];
  visit(tree, (node) => {
    if (node.type === 'math' || node.type === 'inlineMath') {
      nodes.push({
        type: node.type,
        value: node.value,
        startOffset: node.position?.start?.offset ?? -1,
        endOffset: node.position?.end?.offset ?? -1,
        line: node.position?.start?.line ?? -1,
      });
    }
  });
  return nodes;
}

/**
 * 1 つの数式文字列を KaTeX strict で描画し、警告を収集する。
 * strict コールバックは 'ignore' を返し、KaTeX 自身の console.warn を抑止しつつ
 * 警告だけを配列に収集する（build と同じ katex.renderToString を使用）。
 * @param {string} value
 * @param {boolean} displayMode
 * @returns {{ code: string, message: string }[]}
 */
export function auditMathValue(value, displayMode) {
  const warnings = [];
  try {
    katex.renderToString(value, {
      throwOnError: false,
      displayMode,
      strict: (code, message) => {
        warnings.push({ code, message: String(message) });
        return 'ignore';
      },
    });
  } catch (err) {
    warnings.push({ code: 'renderError', message: String(err?.message || err) });
  }
  return warnings;
}

/**
 * MDX raw 全体を検査し、警告の一覧を返す（行番号は元ファイル基準）。
 * @param {string} raw
 * @returns {{ line: number, displayMode: boolean, code: string, message: string, math: string }[]}
 */
export function auditContent(raw) {
  const { body, fmLineCount } = stripFrontmatter(raw);
  const nodes = extractMathNodes(body);
  const findings = [];
  for (const node of nodes) {
    const displayMode = node.type === 'math';
    const warnings = auditMathValue(node.value, displayMode);
    for (const w of warnings) {
      findings.push({
        line: fmLineCount + node.line,
        displayMode,
        code: w.code,
        message: w.message,
        math: node.value,
      });
    }
  }
  return findings;
}

/**
 * 数式文字列に低リスク置換を適用する（意味は不変）。
 * @param {string} math
 * @returns {string}
 */
export function safeFixMath(math) {
  let out = math;
  for (const [re, rep] of SAFE_MATH_REPLACEMENTS) {
    out = out.replace(re, rep);
  }
  return out;
}

/**
 * raw に低リスク置換を適用した新しい raw を返す（数式スパン内のみ置換）。
 * 変更が無ければ null を返す。
 * @param {string} raw
 * @returns {string | null}
 */
export function applySafeFix(raw) {
  const { fmBlock, body } = stripFrontmatter(raw);
  const nodes = extractMathNodes(body)
    .filter((n) => n.startOffset >= 0 && n.endOffset >= 0)
    .sort((a, b) => b.startOffset - a.startOffset); // 後ろから splice して offset を保つ

  let newBody = body;
  let changed = false;
  for (const node of nodes) {
    const span = newBody.slice(node.startOffset, node.endOffset);
    const fixed = safeFixMath(span);
    if (fixed !== span) {
      newBody = newBody.slice(0, node.startOffset) + fixed + newBody.slice(node.endOffset);
      changed = true;
    }
  }
  if (!changed) return null;
  return fmBlock + newBody;
}
