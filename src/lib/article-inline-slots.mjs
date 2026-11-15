/** 記事の安全な root 境界を AST で選び、基準書と同じ字数規則へ渡す。解析失敗は呼び出し側へ返す。 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { planInlineSlots } from './standards-inline-slots.mjs';

const parser = unified().use(remarkParse).use(remarkMdx).use(remarkGfm).use(remarkMath);
const ctaNames = new Set(['CareerAffiliate', 'MagazineCard', 'NoteLink', 'MagazineHeroCta', 'MidArticleCta', 'CareerMultiRegister']);
const textOf = node => node.value ?? (node.children ?? []).map(textOf).join('');

/** midPositions は既存 rehypeMidCta と同じ「n+1 番目の h2 の直前」。
 * @param {string} markdown
 * @param {{midPositions?: number[], reservedStudySlot?: boolean, questionSeries?: boolean}} [options]
 */
export function planArticleInlineSlots(markdown, { midPositions = [], reservedStudySlot = false, questionSeries = false } = {}) {
  const tree = parser.parse(markdown);
  const blocks = tree.children.filter(n => n.position);
  const starts = blocks.map(n => n.position.start.line - 1);
  const h2 = blocks.filter(n => n.type === 'heading' && n.depth === 2);
  const occupiedLines = midPositions.flatMap(n => h2[n + 1] ? [h2[n + 1].position.start.line - 1] : []);
  // 学習枠は広告がなくても従来の中央 h2 境界を予約する。
  if (reservedStudySlot && h2.length >= 3) occupiedLines.push(h2[Math.min(Math.max(1, Math.round(h2.length / 2)), h2.length - 2) + 1].position.start.line - 1);
  const forbiddenRanges = [];
  let hasRuledCareerCard = false;
  const visit = node => {
    if (node.name === 'CareerAffiliate' && node.attributes?.some(a => a.name === 'program' && a.value === 'career')) hasRuledCareerCard = true;
    if ((ctaNames.has(node.name) || (node.type === 'link' && /^https:\/\/note\.com\//.test(node.url ?? ''))) && node.position) {
      occupiedLines.push(node.position.start.line - 1, node.position.end.line - 1);
    }
    (node.children ?? []).forEach(visit);
  };
  visit(tree);
  for (const line of occupiedLines) {
    const at = Math.max(0, blocks.findIndex(n => n.position.end.line - 1 >= line));
    forbiddenRanges.push({ start: starts[Math.max(0, at - 1)], end: blocks[Math.min(blocks.length - 1, at + 1)].position.end.line });
  }
  const allowedLines = [];
  const lines = markdown.split('\n');
  for (let i = 1; i < blocks.length; i++) {
    const prev = blocks[i - 1], next = blocks[i];
    if (prev.type === 'heading' || next.name === 'SourceRef') continue;
    if (questionSeries && !(next.type === 'heading' && next.depth === 2 && /(?:問題|問\s*\d|第\s*\d+\s*問|No\.?\s*\d|[ⅠⅡⅢIV]+[-－]\d)/i.test(textOf(next)))) continue;
    // 候補行は前ブロックの終了後〜次の開始まで。JSX/details/数式/コード/表/リスト内部には到達しない。
    for (let line = prev.position.end.line; line <= starts[i]; line++) {
      if (line === starts[i] || !lines[line]?.trim()) allowedLines.push(line);
    }
  }
  const plan = planInlineSlots(markdown, { slotPrefix: 'article-banner', allowedLines, forbiddenRanges, occupiedLines });
  // 注入位置は次の root ノードへ正規化する（空行自身は AST ノードを持たない）。
  return { ...plan, hasRuledCareerCard, renderedMidIndexes: midPositions.flatMap((n, i) => h2[n + 1] ? [i] : []), insertAt: plan.insertAt.map(s => ({ ...s, line: starts.find(line => line >= s.line) ?? s.line })) };
}

/** 単一 MDX コンパイル内で注入し、本文・見出し ID の採番を変えない。 */
export function remarkArticleBanners({ insertAt = [] } = {}) {
  return tree => {
    for (const item of [...insertAt].reverse()) {
      const index = tree.children.findIndex(n => n.position?.start.line - 1 >= item.line);
      if (index < 0) throw new Error(`記事バナーの境界がない: ${item.line}`);
      tree.children.splice(index, 0, { type: 'mdxJsxFlowElement', name: 'ArticleInlineBanner', attributes: [{ type: 'mdxJsxAttribute', name: 'slot', value: item.slot }], children: [] });
    }
  };
}
