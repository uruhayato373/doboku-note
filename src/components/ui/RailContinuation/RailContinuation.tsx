import type { RailGroup } from '@/lib/rail-continuation';
import RailArticleList from '@/components/ui/RelatedArticles/RailArticleList';
import { ArticleBanner } from '@/components/docs/ArticleAffiliateBanners';

/**
 * 右の欄の下に続く束（回遊カード＋転職バナーの組）。記事・基準書の章と節・資格トップが共有する。
 * 上の束の下へ、本文の残りの高さに均等に並べる（親は flex-col・ここは flex-1。sticky・欄内スクロールは使わない）。
 * 検査（scripts/check-cta-density.mjs）は data-article-sidebar-* を読む: バナーの直後は実カード、
 * バナーだけの組は data-article-sidebar-fill（過去問・基準書・資格トップだけ）。
 */
export default function RailContinuation({ groups }: { groups: RailGroup[] }) {
  if (groups.length === 0) return null;
  return <div className="flex flex-1 flex-col justify-around gap-6 pt-6" data-article-sidebar-continuation>
    {groups.map((group, index) => <div key={`${group.slot}-${index}`} className="space-y-3" data-article-sidebar-group data-article-sidebar-fill={group.fill || undefined} data-article-sidebar-ad-only={(!group.card && !group.fill) || undefined}>
      <ArticleBanner placement={group.banner} kind="rail" />
      {group.card && <div data-article-sidebar-card><RailArticleList card={group.card} /></div>}
    </div>)}
  </div>;
}
