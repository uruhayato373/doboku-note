/** 記事の安全な root 境界を AST で選び、基準書と同じ字数規則へ渡す。解析失敗は呼び出し側へ返す。 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { planInlineSlots, measureLines } from './standards-inline-slots.mjs';
import { BODY_AD_RULES } from './body-ad-rules.mjs';

export const ADSENSE_GAP_CHARS = BODY_AD_RULES.article.gapChars;
export const ADSENSE_INTERVAL_CHARS = BODY_AD_RULES.article.intervalChars;
export const ADSENSE_MAX_SLOTS = BODY_AD_RULES.article.maxSlots;
export const QUESTIONS_PER_AD = BODY_AD_RULES.questionSeries.questionsPerAd;
export const QUESTION_AD_MAX_SLOTS = BODY_AD_RULES.questionSeries.maxSlots;
const QUESTION_HEADING = /(?:問題|問\s*\d|第\s*\d+\s*問|No\.?\s*\d|[ⅠⅡⅢIV]+[-－]\d)/i;

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
    if (questionSeries && !isQuestionHeading(next)) continue;
    // 候補行は前ブロックの終了後〜次の開始まで。JSX/details/数式/コード/表/リスト内部には到達しない。
    for (let line = prev.position.end.line; line <= starts[i]; line++) {
      if (line === starts[i] || !lines[line]?.trim()) allowedLines.push(line);
    }
  }
  const plan = planInlineSlots(markdown, { slotPrefix: 'article-banner', allowedLines, forbiddenRanges, occupiedLines });
  // 注入位置は次の root ノードへ正規化する（空行自身は AST ノードを持たない）。
  const normalize = s => ({ ...s, line: starts.find(line => line >= s.line) ?? s.line });
  // AdSense の本文枠（決まりは body-ad-rules.mjs）。転職バナーの候補位置（素材の有無に関わらず）と CTA から離す。
  // 過去問は設問の境目に問題の数で、それ以外は字数で割る。
  const taken = [...occupiedLines, ...plan.insertAt.map(s => s.line)];
  const ads = questionSeries
    ? planQuestionAds(blocks.filter(isQuestionHeading).map(n => n.position.start.line - 1), taken.map(line => normalize({ line }).line), forbiddenRanges, measureLines(markdown, BODY_AD_RULES.article.lineChars).cumulative)
    : planInlineSlots(markdown, {
      slotPrefix: 'adsense', allowedLines, forbiddenRanges, occupiedLines: taken,
      firstChars: ADSENSE_GAP_CHARS, intervalChars: ADSENSE_INTERVAL_CHARS, maxSlots: ADSENSE_MAX_SLOTS, lineChars: BODY_AD_RULES.article.lineChars,
    }).insertAt;
  return { ...plan, hasRuledCareerCard, renderedMidIndexes: midPositions.flatMap((n, i) => h2[n + 1] ? [i] : []), insertAt: plan.insertAt.map(normalize), adInsertAt: ads.map(normalize) };
}

function isQuestionHeading(node) {
  return node.type === 'heading' && node.depth === 2 && QUESTION_HEADING.test(textOf(node));
}

/**
 * 過去問の AdSense の枠。設問の見出しの直前にだけ置き、直前の転職・AdSense・CTA から QUESTIONS_PER_AD 問以上あける。
 * 1 問が長い試験（二次の記述）は問題の数では間が空きすぎるので、直前の枠から記事の字数の間隔（ADSENSE_INTERVAL_CHARS）を超えた設問の前にも置く。
 * @param {number[]} questionLines 設問の見出しの行（0 始まり・本文の順）
 * @param {number[]} takenLines 転職の枠・CTA が入る行（設問の見出しへ正規化済み）
 * @param {Array<{start: number, end: number}>} forbiddenRanges
 * @param {number[]} cumulative 行ごとの累計の字数（measureLines）
 */
function planQuestionAds(questionLines, takenLines, forbiddenRanges, cumulative) {
  const taken = new Set(takenLines);
  const insertAt = [];
  // since は直前の枠（転職・AdSense・CTA）から数えた設問の数（枠の入った設問を 1 問目と数える）、last はその枠の行
  let since = 0;
  let last = -1;
  for (const line of questionLines) {
    if (insertAt.length >= QUESTION_AD_MAX_SLOTS) break;
    if (taken.has(line)) { since = 1; last = line; continue; }
    const longEnough = last >= 0 && cumulative[line] - cumulative[last] >= ADSENSE_INTERVAL_CHARS;
    if ((since >= QUESTIONS_PER_AD || longEnough) && !forbiddenRanges.some(r => line >= r.start && line <= r.end)) {
      insertAt.push({ line, slot: insertAt.length ? `adsense-${insertAt.length + 1}` : 'adsense' });
      since = 0;
      last = line;
    }
    since++;
  }
  return insertAt;
}

/** 単一 MDX コンパイル内で注入し、本文・見出し ID の採番を変えない。 */
export function remarkArticleBanners({ insertAt = [] } = {}) {
  return tree => {
    for (const item of [...insertAt].sort((a, b) => a.line - b.line).reverse()) {
      const index = tree.children.findIndex(n => n.position?.start.line - 1 >= item.line);
      if (index < 0) throw new Error(`記事バナーの境界がない: ${item.line}`);
      tree.children.splice(index, 0, { type: 'mdxJsxFlowElement', name: item.slot.startsWith('adsense') ? 'ArticleInlineAd' : 'ArticleInlineBanner', attributes: [{ type: 'mdxJsxAttribute', name: 'slot', value: item.slot }], children: [] });
    }
  };
}
