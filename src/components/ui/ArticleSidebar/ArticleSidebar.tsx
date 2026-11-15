import { articleSidebarPlan, type ArticleSidebarInput } from '@/lib/article-sidebar-plan';
import { Fragment } from 'react';
import type { RailGroup } from '@/lib/article-sidebar-continuation';
import RailArticleList from '@/components/ui/RelatedArticles/RailArticleList';
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

/** 上の束は上詰め、下の組は本文の残りの高さへ均等に配分する。 */
export default function ArticleSidebar({ cards, groups = [], placements }: { cards: React.ReactElement[]; groups?: RailGroup[]; placements: ResolvedPlacements }) {
  const images = articleImagePlacements(placements, [], cards.length);
  return <div className="flex h-full flex-1 flex-col" data-article-sidebar-cards={cards.length + groups.filter(group => group.card).length}>
    <div className="space-y-3">
      {cards.map((card, index) => <Fragment key={index}>
        <ArticleBanner placement={images.find(image => image.placement.slot === articleRailSlot(index))?.placement} kind="rail" />
        <div data-article-sidebar-card>{card}</div>
      </Fragment>)}
    </div>
    {groups.length > 0 && <div className="flex flex-1 flex-col justify-around gap-6 pt-6" data-article-sidebar-continuation>
      {groups.map(group => <div key={group.slot} className="space-y-3" data-article-sidebar-group data-article-sidebar-ad-only={!group.card || undefined}>
        <ArticleBanner placement={group.banner} kind="rail" />
        {group.card && <div data-article-sidebar-card><RailArticleList card={group.card} /></div>}
      </div>)}
    </div>}
  </div>;
}
