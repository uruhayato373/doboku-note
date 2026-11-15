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
import { articleImagePlacements, articleRailSlot } from './article-affiliate-plan';
import type { ResolvedPlacement, ResolvedPlacements } from './affiliate-placement';

interface RailLink {
  href: string;
  title: string;
  doc?: DocMeta;
}
export interface RailCard {
  label: 'rail-related' | 'rail-discovery' | 'rail-topic' | 'rail-popular' | 'rail-tools';
  title: string;
  links: RailLink[];
}
export interface RailGroup {
  slot: string;
  card: RailCard | null;
  banner: ResolvedPlacement | undefined;
}

/** 上の束の行き先を除き、候補の順番を保って空の面を飛ばす。広告の重複除外は既存の画像計画に一任。 */
export function articleSidebarContinuation(
  input: ArticleSidebarInput,
  current: DocMeta,
  pool: DocMeta[],
  bodyLength: number,
  placements: ResolvedPlacements,
): RailGroup[] {
  const count = articleSidebarGroupCount(bodyLength, input.headings.filter(h => h.level === 2).length);
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
  const related = rankRelated(current, eligible, 8, used);
  const categoryDocs = eligible.filter(doc => doc.category === input.category);
  const docLinks = (docs: DocMeta[]): RailLink[] => docs.map(doc => ({ href: getPublicDocPath(doc.slug), title: doc.shortTitle || doc.title, doc }));
  const bySlug = new Map(eligible.map(doc => [doc.slug, doc]));
  const candidates: RailCard[] = [
    { label: 'rail-related', title: '関連記事', links: docLinks(related.slice(0, 4)) },
    { label: 'rail-discovery', title: '同じ分野・科目・年度', links: docLinks(input.category ? discoveryGroups(input.category, input.slugStr, categoryDocs).flatMap(group => group.docs) : []) },
    { label: 'rail-topic', title: 'この記事のテーマ', links: docLinks(resolveTopicHubLinks(current, eligible, { exclude: used }).flatMap(group => group.picks).flatMap(doc => { const meta = bySlug.get(doc.slug); return meta ? [meta] : []; })) },
    { label: 'rail-popular', title: '同じ資格のよく読まれている記事', links: docLinks(getPopularDocs(categoryDocs.filter(doc => !used.has(doc.slug)), categoryDocs.length).map(item => item.doc)) },
    { label: 'rail-tools', title: '無料ツールで確認する', links: input.category ? getRelatedTools(input.category, input.slugStr).map(tool => ({ href: tool.href, title: tool.title })) : [] },
    { label: 'rail-related', title: 'あわせて読みたい記事', links: docLinks(related.slice(4)) },
  ];
  const images = articleImagePlacements(placements, [], upper.length + count);
  const groups: RailGroup[] = [];
  let cursor = 0;
  for (let index = 0; index < count; index++) {
    let card: RailCard | null = null;
    while (cursor < candidates.length && !card) {
      const candidate = candidates[cursor++]!;
      const links: RailLink[] = [];
      for (const link of candidate.links) {
        if (usedHrefs.has(link.href)) continue;
        usedHrefs.add(link.href);
        links.push(link);
        if (links.length === 4) break;
      }
      if (links.length) card = { ...candidate, links };
    }
    const slot = articleRailSlot(upper.length + index);
    const banner = images.find(image => image.placement.slot === slot)?.placement;
    if (card || banner) groups.push({ slot, card, banner });
  }
  return groups;
}
