import type { RailGroup } from '@/lib/rail-continuation';
import RailArticleList from '@/components/ui/RelatedArticles/RailArticleList';
import { ArticleBanner } from '@/components/docs/ArticleAffiliateBanners';
import AdSlot from '@/components/ads/AdSlot';

/**
 * 右の欄の下に続く束（回遊カード＋転職バナーの組）。記事・基準書の章と節・資格トップが共有する。
 * 上の束の下へ上詰めで並べる（sticky・欄内スクロールは使わない）。
 * 検査（scripts/check-cta-density.mjs）は data-article-sidebar-* を読む: バナーの直後は実カード、
 * バナーだけの組は作らない（上詰めで広告が続くため・2026-11-16）。
 */
export default function RailContinuation({ groups }: { groups: RailGroup[] }) {
  if (groups.length === 0) return null;
  // 上詰め（2026-11-16 運営者判断: 均等割りは組の間に大きな余白が出た）。2 組目は転職バナーの代わりに AdSense
  return <div className="flex flex-col gap-6 pt-6" data-article-sidebar-continuation>
    {groups.map((group, index) => <div key={`${group.slot}-${index}`} className="space-y-3" data-article-sidebar-group data-article-sidebar-fill={group.fill || undefined} data-article-sidebar-ad-only={(!group.card && !group.fill && !group.adsense) || undefined}>
      {group.adsense ? <AdSlot slot="rail" /> : <ArticleBanner placement={group.banner} kind="rail" />}
      {group.card && <div data-article-sidebar-card><RailArticleList card={group.card} /></div>}
    </div>)}
  </div>;
}
