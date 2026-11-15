import { articleSidebarPlan, type ArticleSidebarInput } from '@/lib/article-sidebar-plan';
import { Fragment } from 'react';
import { ArticleBanner, articleRailSlot, articleImagePlacements } from '@/components/docs/ArticleAffiliateBanners';
import type { ResolvedPlacements } from '@/lib/affiliate-placement';
import AuthorSidebarCard from '@/components/ui/AuthorSidebarCard';
import HubCtaBanner from '@/components/ui/HubCtaBanner/HubCtaBanner';
import TableOfContents from '@/components/ui/TableOfContents';
import ExamQuestionNav from '@/components/ui/ExamQuestionNav';
import { categoryNavCards } from '@/components/ui/CategoryNavCard/CategoryNavCard';
import PillarNavCard from '@/components/ui/PillarNavCard';
import { SidebarProduct } from '@/components/ui/SidebarDiscovery';
import RelatedTools from '@/components/ui/RelatedTools';


/**
 * docs 記事の右サイドバー（PC ≥993px）。
 *
 * 2 ブロック構成:
 *  1. 通常フロー（追従させない）: 運営者プロフィール → note もくじタイル。
 *     転職画像は 2026-11-15 運営者指示で先頭・全カード間へ追加（DN-1215）。
 *     ピクセルは DocPage が案件ごとに 1 発へ集約する。
 *  2. ナビ群: TOC / 設問ナビ → カテゴリナビ → ピラーナビ。
 *
 * 経緯: 2026-06-27 に全体 sticky を解除 → 2026-07 に「TOC+ナビのみ」を sticky＋欄の中のスクロールで限定復活 →
 * 2026-11-15 運営者指示で全ページの右サイドバーから固定と欄の中のスクロールを撤去（ページと一緒に流す・DN-1214）。
 * note もくじタイル: 2026-07-06 に一旦撤去したが全ページ統一の一環で復活（記事末尾と同一もくじを PC で併掲・
 * utm -docs-sb で面分離）。sidebarMokuji が null（非 HUB 資格・career）のときは枠ごと非表示。
 */
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
      case 'toc': return <TableOfContents headings={headings} />;
      case 'questions': return <ExamQuestionNav headings={headings} variant="sidebar" />;
      case 'category': return navigation[card.index!]!;
      case 'pillar': return <PillarNavCard variant="sidebar" currentSection={sectionStr} />;
      case 'tools': return <RelatedTools category={category!} slug={slugStr} compact />;
    }
  });
}

/** 先頭と実カードの全間隔。末尾に追加しない。固定や欄内スクロールは持たない。 */
export default function ArticleSidebar({ cards, placements }: { cards: React.ReactElement[]; placements: ResolvedPlacements }) {
  const images = articleImagePlacements(placements, [], cards.length);
  return <div className="space-y-3" data-article-sidebar-cards={cards.length}>
    {cards.map((card, index) => <Fragment key={index}>
      <ArticleBanner placement={images.find(image => image.placement.slot === articleRailSlot(index))?.placement} kind="rail" />
      <div data-article-sidebar-card>{card}</div>
    </Fragment>)}
  </div>;
}
