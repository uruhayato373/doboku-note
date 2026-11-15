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
import type { ResolvedPlacement, ResolvedPlacements } from './affiliate-placement';

interface RailLink {
  href: string;
  title: string;
  doc?: DocMeta;
}
export interface RailCard {
  label: 'rail-related' | 'rail-exam-years' | 'rail-textbooks' | 'rail-discovery' | 'rail-topic' | 'rail-popular' | 'rail-latest' | 'rail-tools';
  title: string;
  links: RailLink[];
}
export interface RailGroup {
  slot: string;
  card: RailCard | null;
  banner: ResolvedPlacement | undefined;
  /** 過去問だけ。回遊の組の間をバナーだけで埋める組（card なし・面は article-rail-fill） */
  fill?: boolean;
}

const PER_GROUP = 3;
const EXAM_GROUPS = ['primary', 'secondary', 'pastExam'];

interface Source { label: RailCard['label']; title: string; links: RailLink[] }

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

  const available = (source: Source) => source.links.filter(link => !usedHrefs.has(link.href));
  const taken = new Map<Source, number>();
  let cursor = 0;
  let last: Source | null = null;
  let closed = false;
  const nextCard = (index: number): RailCard | null => {
    if (closed) return null;
    const rotated = [...others.slice(cursor), ...others.slice(0, cursor)];
    const order = index % 2 === 0 ? [related, ...rotated] : [...rotated, related];
    for (const need of [PER_GROUP, 2]) {
      const source = order.find(candidate => candidate !== last && available(candidate).length >= need);
      if (!source) continue;
      const links = available(source).slice(0, PER_GROUP);
      links.forEach(link => usedHrefs.add(link.href));
      const round = taken.get(source) ?? 0;
      taken.set(source, round + 1);
      if (others.includes(source)) cursor = (others.indexOf(source) + 1) % others.length;
      if (links.length < PER_GROUP) closed = true;
      last = source;
      return { label: source.label, title: round ? `${source.title}（続き）` : source.title, links };
    }
    closed = true;
    return null;
  };

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

/**
 * 回遊の組（と広告だけの組）の間へ、バナーだけの組を fill 個、均等に挟む（累積が整数を跨ぐ位置に置く）。
 * 案件は右の欄に出ている案件の列を順に繰り返し、前後の組のバナーと同じ案件は列に別の案件がある限り避ける。
 */
function fillGroups(groups: RailGroup[], fill: number, placements: ResolvedPlacements, upperCount: number): RailGroup[] {
  if (fill <= 0) return groups;
  const rail = articleImagePlacements(placements, [], upperCount, groups.map(group => group.slot)).filter(image => image.placement.slot.startsWith('article-rail'));
  const column = articleRailFillColumn(rail);
  if (!column.length) return groups;
  const total = groups.length + fill;
  const isFill = (i: number) => Math.floor(((i + 1) * fill) / total) > Math.floor((i * fill) / total);
  const order: Array<RailGroup | null> = [];
  let next = 0;
  for (let i = 0; i < total; i++) order.push(isFill(i) ? null : groups[next++]!);
  const picked: RailGroup[] = [];
  let cursor = 0;
  return order.map((group, i) => {
    if (group) { picked[i] = group; return group; }
    const avoid = new Set([picked[i - 1]?.banner?.program, order[i + 1]?.banner?.program]);
    const rotated = [...column.slice(cursor), ...column.slice(0, cursor)];
    const banner = rotated.find(candidate => !avoid.has(candidate.program)) ?? rotated[0]!;
    cursor = (column.indexOf(banner) + 1) % column.length;
    return (picked[i] = { slot: ARTICLE_RAIL_FILL_SLOT, card: null, banner, fill: true });
  });
}
