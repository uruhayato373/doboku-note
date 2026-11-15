import type { DocMeta } from './docs';
import { articleSidebarPlan, articleSidebarGroupCount, type ArticleSidebarInput } from './article-sidebar-plan';
import { categoryNavLinkedSlugs } from './category-nav-plan';
import { PILLARS } from './pillar-nav';
import { discoveryGroups } from './sidebar-discovery';
import { rankRelated } from './related-score';
import { resolveTopicHubLinks } from './article-end-wiring';
import { getPopularDocs } from './popular';
import { getRelatedTools } from './tools';
import { getPublicDocPath } from './content-routes';
import { classifyDoc } from './doc-classifier';
import { findYearRelatives } from './exam-year-nav.mjs';
import { relatedTextbookSlugs } from './related-textbooks';
import { isCivilConstructionCategory } from './qualification-names';
import { ARTICLE_RAIL_FILL_SLOT, articleImagePlacements, articleRailFillColumn, articleRailSlot } from './article-affiliate-plan';
import type { ResolvedPlacements } from './affiliate-placement';
import { createCardPicker, interleaveFillGroups, type RailGroup, type RailLink, type RailSource as Source } from './rail-continuation';

export type { RailGroup } from './rail-continuation';

const PER_GROUP = 3;
const EXAM_GROUPS = ['primary', 'secondary', 'pastExam'];

/**
 * 上の束の行き先を除き、1 組 3 件（最後の組だけ 2 件）で下に続く束を作る。
 * 関連記事（上位 12 件）→ほかの種類→関連の続き…と交互に並べ、同じ種類を続けず、同じ記事を 2 回出さない。
 * 組の数は高さの見積もり（上限）と回遊の候補（実数）の小さいほう。広告の重複除外は既存の画像計画に一任。
 * 過去問（questionSeries）だけは、回遊の候補が尽きて見積もりに足りない組数を、バナーだけの組で埋めて
 * 回遊の組の間に均等に散らす（2026-11-16 運営者判断。fillGroups）。
 */
export function articleSidebarContinuation(
  input: ArticleSidebarInput,
  current: DocMeta,
  pool: DocMeta[],
  bodyLength: number,
  placements: ResolvedPlacements,
): RailGroup[] {
  const count = articleSidebarGroupCount(bodyLength, input.headings.filter(h => h.level === 2).length, input.docGroup);
  if (!count) return [];
  const upper = articleSidebarPlan(input);
  const used = new Set([current.slug]);
  if (upper.some(card => card.kind === 'category') && input.category) {
    categoryNavLinkedSlugs({ variant: 'sidebar', category: input.category, currentSlug: input.slugStr, docGroup: input.docGroup, categoryArticles: input.categoryArticles }).forEach(slug => used.add(slug));
  }
  if (upper.some(card => card.kind === 'pillar')) PILLARS.forEach(p => used.add(`pe-comprehensive-management-${p.slug}`));
  const usedHrefs = new Set([...used].map(getPublicDocPath));
  if (upper.some(card => card.kind === 'tools') && input.category) getRelatedTools(input.category, input.slugStr).forEach(tool => usedHrefs.add(tool.href));
  const eligible = pool.filter(doc => doc.published !== false && !doc.hideFromCategory && !doc.tags?.includes('模範論文'));
  const categoryDocs = eligible.filter(doc => doc.category === input.category);
  const bySlug = new Map(eligible.map(doc => [doc.slug, doc]));
  const docLinks = (docs: DocMeta[]): RailLink[] => docs.map(doc => ({ href: getPublicDocPath(doc.slug), title: doc.shortTitle || doc.title, doc }));
  const slugLinks = (slugs: string[]) => docLinks(slugs.flatMap(slug => { const doc = bySlug.get(slug); return doc ? [doc] : []; }));
  const isExam = EXAM_GROUPS.includes(input.docGroup);
  const related: Source = { label: 'rail-related', title: '関連記事', links: docLinks(rankRelated(current, eligible, 12, used)) };
  const examYears: Source = {
    label: 'rail-exam-years', title: '同じ試験の前後の年度・同じ年度',
    links: isExam ? slugLinks(findYearRelatives(current.slug, categoryDocs.filter(doc => EXAM_GROUPS.includes(classifyDoc(doc))).map(doc => doc.slug))) : [],
  };
  const textbooks: Source = {
    label: 'rail-textbooks', title: 'この試験で扱われた教科書',
    links: isCivilConstructionCategory(input.category) && ['primary', 'secondary'].includes(input.docGroup) ? slugLinks(relatedTextbookSlugs(current, categoryDocs)) : [],
  };
  const discovery: Source = { label: 'rail-discovery', title: '同じ分野・科目・年度', links: docLinks(input.category ? discoveryGroups(input.category, input.slugStr, categoryDocs).flatMap(group => group.docs) : []) };
  const topic: Source = { label: 'rail-topic', title: 'この記事のテーマ', links: slugLinks(resolveTopicHubLinks(current, eligible, { exclude: used }).flatMap(group => group.picks).map(doc => doc.slug)) };
  const popular: Source = { label: 'rail-popular', title: '同じ資格のよく読まれている記事', links: docLinks(getPopularDocs(categoryDocs.filter(doc => !used.has(doc.slug)), categoryDocs.length).map(item => item.doc)) };
  const stamp = (doc: DocMeta) => doc.publishedAt || doc.created || '';
  const latest: Source = { label: 'rail-latest', title: '同じ資格の新着記事', links: docLinks([...categoryDocs].filter(doc => !used.has(doc.slug)).sort((a, b) => stamp(b).localeCompare(stamp(a)) || a.slug.localeCompare(b.slug)).slice(0, 2 * PER_GROUP)) };
  const tools: Source = { label: 'rail-tools', title: '無料ツールで確認する', links: input.category ? getRelatedTools(input.category, input.slugStr).map(tool => ({ href: tool.href, title: tool.title })) : [] };
  const others = isExam ? [examYears, textbooks, discovery, topic, popular, latest, tools] : [discovery, topic, popular, latest, tools];

  const nextCard = createCardPicker({ first: related, others, usedHrefs });

  const images = articleImagePlacements(placements, [], upper.length + count);
  const groups: RailGroup[] = [];
  for (let index = 0; index < count; index++) {
    const card = nextCard(index);
    const slot = articleRailSlot(upper.length + index);
    const banner = images.find(image => image.placement.slot === slot)?.placement;
    if (card || banner) groups.push({ slot, card, banner });
  }
  return input.questionSeries ? fillGroups(groups, count - groups.length, placements, upper.length) : groups;
}

/** 過去問の埋める組の案件は右の欄に出ている案件（上の束＋回遊の組）を順に繰り返す。 */
function fillGroups(groups: RailGroup[], fill: number, placements: ResolvedPlacements, upperCount: number): RailGroup[] {
  if (fill <= 0) return groups;
  const rail = articleImagePlacements(placements, [], upperCount, groups.map(group => group.slot)).filter(image => image.placement.slot.startsWith('article-rail'));
  return interleaveFillGroups(groups, fill, articleRailFillColumn(rail), ARTICLE_RAIL_FILL_SLOT);
}
