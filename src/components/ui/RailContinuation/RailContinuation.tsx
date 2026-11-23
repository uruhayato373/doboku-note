import type { RailGroup } from '@/lib/rail-continuation';
import RailArticleList from '@/components/ui/RelatedArticles/RailArticleList';
import AdSlot from '@/components/ads/AdSlot';

/**
 * 右の欄の下に続く束（回遊カードの組・1 組おきに AdSense）。RailStack の下半分（記事・基準書の章と節・資格トップが共有する）。
 * 1 つ 1 つに種類（data-rail-kind・src/lib/rail-kinds.mjs）を付ける。
 * 上の束の下へ上詰めで並べる（流れる。追従するのは欄の最後の RailFollow だけ・欄内スクロールは使わない）。
 * 検査（scripts/checks/check-cta-density.mjs）は data-article-sidebar-* を読む。転職バナーは置かない（上の束の 2 つまで・RAIL_AFFILIATE_MAX）。
 */
export default function RailContinuation({ groups }: { groups: RailGroup[] }) {
  if (groups.length === 0) return null;
  // 上詰め（2026-11-16 運営者判断: 均等割りは組の間に大きな余白が出た）。1 組目と 3 組目のカードの上に AdSense（withRailAdSense）。
  // 組の下の空きは、欄の最後の追従ブロック（RailFollow）が受け持つ（2026-11-23。以前は縦長の AdSense を 1,000px ごとに最大 40 枠並べていた）
  return <div className="flex flex-col gap-6 pt-6" data-article-sidebar-continuation>
    {groups.map((group, index) => <div key={`${group.slot}-${index}`} className="space-y-3" data-article-sidebar-group>
      {group.adsense && <div data-rail-kind="adsense"><AdSlot slot="rail" /></div>}
      {group.card && <div data-article-sidebar-card data-rail-kind={group.card.plain ? 'nav' : 'thumbs'}><RailArticleList card={group.card} /></div>}
    </div>)}
  </div>;
}
