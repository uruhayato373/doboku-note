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
}
/** 空の商品の枠・設問ナビ・節ナビを含めない実カードの順序。 */
export function articleSidebarPlan(p: ArticleSidebarInput) {
 const cards: Array<{ kind: 'author' | 'hub' | 'product' | 'toc' | 'questions' | 'category' | 'pillar' | 'tools'; index?: number }> = [{ kind: 'author' }];
 const current = p.categoryArticles.find(d => d.slug === p.slugStr);
 if (p.sidebarMokuji) cards.push({ kind: 'hub' });
 else if (p.category && current && sidebarProduct(p.category, current, p.content)) cards.push({ kind: 'product' });
 const cluster = ['pastExam','primary','secondary'].includes(p.docGroup) ? p.docGroup === 'primary' || p.hasCategoryNavCard || p.showPillarNav : true;
 if (cluster) {
  if (p.showTableOfContents) cards.push({ kind: 'toc' });
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
 };
}
