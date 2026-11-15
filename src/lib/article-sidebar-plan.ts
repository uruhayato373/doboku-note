import type { DocMeta } from './docs';
import type { DocGroupKey } from './doc-classifier';
import type { TocHeading } from './toc';
import { resolveHubCta, type ResolvedHubCta } from './hub-cta';
import { isCareerDoc } from './doc-classifier';
import type { planArticleCtas } from './article-cta-plan';
import { sidebarProduct } from './sidebar-discovery';
import { categoryNavPlan } from './category-nav-plan';
import { parseQuestionNo } from './exam-question-number';
import { getRelatedTools } from './tools';

export interface ArticleSidebarInput {
 sidebarMokuji: ResolvedHubCta | null; headings: TocHeading[]; category: DocMeta['category']; docGroup: DocGroupKey;
 slugStr: string; content: string; sectionStr: string | undefined; categoryArticles: DocMeta[];
 hasCategoryNavCard: boolean; showPillarNav: boolean; showTableOfContents: boolean;
 /** 過去問（一次・二次の年度別・総監など）。右の欄の下に続く束で、組の間をバナーで埋める */
 questionSeries?: boolean;
}
/** 空の商品の枠・設問ナビ・節ナビを含めない実カードの順序。 */
export function articleSidebarPlan(p: ArticleSidebarInput) {
 const cards: Array<{ kind: 'author' | 'hub' | 'product' | 'questions' | 'category' | 'pillar' | 'tools'; index?: number }> = [{ kind: 'author' }];
 const current = p.categoryArticles.find(d => d.slug === p.slugStr);
 if (p.sidebarMokuji) cards.push({ kind: 'hub' });
 else if (p.category && current && sidebarProduct(p.category, current, p.content)) cards.push({ kind: 'product' });
 const cluster = ['pastExam','primary','secondary'].includes(p.docGroup) ? p.docGroup === 'primary' || p.hasCategoryNavCard || p.showPillarNav : true;
 if (cluster) {
  if (p.docGroup === 'primary' && p.headings.some(h => parseQuestionNo(h.text) !== null)) cards.push({ kind: 'questions' });
  if (p.hasCategoryNavCard && p.category) categoryNavPlan({ variant: 'sidebar', category: p.category, currentSlug: p.slugStr, docGroup: p.docGroup, categoryArticles: p.categoryArticles }).forEach((_, index) => cards.push({ kind: 'category', index }));
  if (p.showPillarNav) cards.push({ kind: 'pillar' });
  if (p.category && p.docGroup !== 'career' && getRelatedTools(p.category, p.slugStr).length) cards.push({ kind: 'tools' });
 }
 return cards;
}

export function articleSidebarInput(meta: DocMeta, plan: ReturnType<typeof planArticleCtas>, categoryArticles: DocMeta[]): ArticleSidebarInput {
 const { category, slug } = meta;
 const hubStage = category === 'civil-construction-1' && ['textbook', 'primary'].includes(plan.docGroup) ? 'first' as const : undefined;
 return {
  sidebarMokuji: category && !isCareerDoc(meta) ? resolveHubCta(category, { utmSuffix: 'docs-sb', stage: hubStage }) : null,
  headings: plan.headings, category, docGroup: plan.docGroup, slugStr: slug, content: plan.strippedContent, sectionStr: meta.section as string | undefined, categoryArticles,
  hasCategoryNavCard: Boolean(category), showPillarNav: category === 'pe-comprehensive-management' && plan.docGroup === 'keyword',
  showTableOfContents: !plan.isQuestionSeries && plan.headings.some(h => h.level === 2),
  questionSeries: plan.isQuestionSeries,
 };
}

/**
 * 右の欄の本文高さの係数（px/字）。DN-1218 の全ページ実測（本番 PC・記事 1,588 ページ）で、上の束の下に残った空き
 * （railEmptyPx＋目次を本文へ移した分）を 字数×係数＋H2×80 で当てた中央値。過去問一次・二次は本文の字数に
 * 問題の部品が多く入り、画面の高さは 1.3 倍の見積もりより低い（0.6〜0.7）。短い記事を詰めすぎないため
 * キーワード・過去問（総監など）は下位四分位に寄せる。
 */
const RAIL_PX_PER_CHAR: Record<DocGroupKey, number> = {
 guide: 1.15, career: 1.15, textbook: 1.2, primary: 0.7, secondary: 0.75, pastExam: 0.6, keyword: 0.75, pillar: 0.5,
};
const GROUP_SPACING_PX = 2000;
const FIRST_GROUP_MIN_PX = 3000;
const MAX_GROUPS = 12;
/** 過去問は本文が長く（年度別の一次は 4 万 px 前後）、回遊の組の間を転職バナーで埋める（2026-11-16 運営者判断）ので上限を上げる */
const MAX_GROUPS_QUESTION = 20;
const QUESTION_GROUPS: ReadonlySet<DocGroupKey> = new Set<DocGroupKey>(['primary', 'secondary', 'pastExam']);

/**
 * 下に続く束の組の数の見積もり（SSR の段階で決まる字数と H2 から）。空きが 3,000px 未満なら 0 組、
 * それ以上なら約 2,000px ごとに 1 組（安全の上限 12・過去問は 20）。実際の間隔は flex で均等配分する。
 * 実際に並ぶ数は、さらに回遊の候補で埋められる組数で決まる。
 */
export function articleSidebarGroupCount(bodyLength: number, h2Count: number, docGroup: DocGroupKey = 'guide'): number {
 const free = Math.max(0, bodyLength) * RAIL_PX_PER_CHAR[docGroup] + Math.max(0, h2Count) * 80;
 const max = QUESTION_GROUPS.has(docGroup) ? MAX_GROUPS_QUESTION : MAX_GROUPS;
 return free < FIRST_GROUP_MIN_PX ? 0 : Math.min(max, Math.floor(free / GROUP_SPACING_PX));
}
