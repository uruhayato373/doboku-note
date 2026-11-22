import type { RailGroup } from '@/lib/rail-continuation';
import RailArticleList from '@/components/ui/RelatedArticles/RailArticleList';
import { ArticleBanner } from '@/components/ui/ArticleAffiliateBanners/ArticleAffiliateBanners';
import AdSlot from '@/components/ads/AdSlot';

/**
 * 右の欄の下に続く束（回遊カード＋転職バナーの組）。RailStack の下半分（記事・基準書の章と節・資格トップが共有する）。
 * 1 つ 1 つに種類（data-rail-kind・src/lib/rail-kinds.mjs）を付ける。
 * 上の束の下へ上詰めで並べる（sticky・欄内スクロールは使わない）。
 * 検査（scripts/checks/check-cta-density.mjs）は data-article-sidebar-* を読む: バナーの直後は実カード、
 * バナーだけの組は作らない（上詰めで広告が続くため・2026-11-16）。
 */
export default function RailContinuation({ groups }: { groups: RailGroup[] }) {
  if (groups.length === 0) return null;
  const packed = groups.filter(group => !group.lower);
  const lower = groups.filter(group => group.lower);
  // 上詰め（2026-11-16 運営者判断: 均等割りは組の間に大きな余白が出た）。2 組目は転職バナーの代わりに AdSense。
  // 上詰めの組の下に残る空き（本文の横）には AdSense だけを、組の直後から 1,200px 間隔で並べる（2026-11-22 運営者判断: 均等に散らすと
  // 枠の上下に 700〜1,400px の空白が出て、続けて詰めると長いページで 5 枠が並んだ後に 4 万 px 空いた）。何枠出すかは空きの高さで決める
  // （globals.css の rail-lower-ads。各枠の箱の高さが間隔になるので gap は付けない）
  return <div className="flex flex-1 flex-col" data-article-sidebar-continuation>
    {packed.length > 0 && <div className="flex flex-col gap-6 pt-6">
      {packed.map((group, index) => <div key={`${group.slot}-${index}`} className="space-y-3" data-article-sidebar-group data-article-sidebar-fill={group.fill || undefined} data-article-sidebar-ad-only={(!group.card && !group.fill && !group.adsense) || undefined}>
        {group.adsense ? <div data-rail-kind="adsense"><AdSlot slot="rail" /></div> : <div data-rail-kind="career"><ArticleBanner placement={group.banner} kind="rail" /></div>}
        {group.card && <div data-article-sidebar-card data-rail-kind={group.card.plain ? 'nav' : 'thumbs'}><RailArticleList card={group.card} /></div>}
      </div>)}
    </div>}
    {lower.length > 0 && <div className="rail-lower-ads flex flex-1 flex-col justify-start pt-6" data-article-sidebar-lower-ads>
      {lower.map((group, index) => <div key={group.slot} data-lower-ad={index + 1} data-rail-kind="adsense"><AdSlot slot="rail" /></div>)}
    </div>}
  </div>;
}
