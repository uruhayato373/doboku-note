import { articleSidebarPlan, type ArticleSidebarInput } from '@/lib/article-sidebar-plan';
import { Fragment } from 'react';
import type { RailGroup } from '@/lib/article-sidebar-continuation';
import RailContinuation from '@/components/ui/RailContinuation/RailContinuation';
import { ArticleBanner, articleRailSlot, articleImagePlacements } from '@/components/docs/ArticleAffiliateBanners';
import type { ResolvedPlacements } from '@/lib/affiliate-placement';
import AuthorSidebarCard from '@/components/ui/AuthorSidebarCard';
import HubCtaBanner from '@/components/ui/HubCtaBanner/HubCtaBanner';
import ExamQuestionNav from '@/components/ui/ExamQuestionNav';
import { categoryNavCards } from '@/components/ui/CategoryNavCard/CategoryNavCard';
import PillarNavCard from '@/components/ui/PillarNavCard';
import { SidebarProduct } from '@/components/ui/SidebarDiscovery';
import RelatedTools from '@/components/ui/RelatedTools';


/** 記事右欄の上の束。目次は本文上部、年度別の設問ナビはここに残す。 */
export function buildArticleSidebarCards({
  sidebarMokuji,
  headings,
  category,
  docGroup,
  slugStr,
  content,
  sectionStr,
  categoryArticles,
  hasCategoryNavCard,
  showPillarNav,
  showTableOfContents,
}: ArticleSidebarInput) {
  const p = { sidebarMokuji, headings, category, docGroup, slugStr, content, sectionStr, categoryArticles, hasCategoryNavCard, showPillarNav, showTableOfContents };
  const navigation = category ? categoryNavCards({ variant: 'sidebar', category, currentSlug: slugStr, docGroup, categoryArticles }) : [];
  return articleSidebarPlan(p).map(card => {
    switch (card.kind) {
      case 'author': return <AuthorSidebarCard />;
      case 'hub': return <HubCtaBanner cta={sidebarMokuji!} placement="article-sidebar" />;
      case 'product': return <SidebarProduct category={category!} doc={categoryArticles.find(d => d.slug === slugStr)!} placement="article-sidebar" content={content} />;
      case 'questions': return <ExamQuestionNav headings={headings} variant="sidebar" />;
      case 'category': return navigation[card.index!]!;
      case 'pillar': return <PillarNavCard variant="sidebar" currentSection={sectionStr} />;
      case 'tools': return <RelatedTools category={category!} slug={slugStr} compact />;
    }
  });
}

/** 上の束は上詰め、下の組は本文の残りの高さへ均等に配分する。過去問（questionSeries）だけ、組の間をバナーだけの組で埋める。 */
export default function ArticleSidebar({ cards, groups = [], placements, questionSeries = false }: { cards: React.ReactElement[]; groups?: RailGroup[]; placements: ResolvedPlacements; questionSeries?: boolean }) {
  const images = articleImagePlacements(placements, [], cards.length);
  return <div className="flex h-full flex-1 flex-col" data-article-sidebar-cards={cards.length + groups.filter(group => group.card).length} data-article-question-series={questionSeries || undefined}>
    <div className="space-y-3">
      {cards.map((card, index) => <Fragment key={index}>
        <ArticleBanner placement={images.find(image => image.placement.slot === articleRailSlot(index))?.placement} kind="rail" />
        <div data-article-sidebar-card>{card}</div>
      </Fragment>)}
    </div>
    <RailContinuation groups={groups} />
  </div>;
}
