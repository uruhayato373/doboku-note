import CareerAffiliate from "@/components/ui/CareerAffiliate/CareerAffiliate";
import { pixelFor, resolvePlacements, type PlacementPage } from "@/lib/affiliate-placement";

/**
 * 1 ページに転職アフィリエイトの面が 1 つだけのページ（公的基準・トピック・トップ・ツール）の枠。
 *
 * どの案件を出すかは配置ルール（config/affiliate-placements.json）が決め、ルールが無ければ何も描かない
 * （黙って別の案件に倒さない）。面が 1 つなので、この枠が 1 ページ 1 ピクセルの発火源になる（config/cta-placements.json の pixelPriority）。
 * 記事ページ（本文カード・中間・記事末）とカテゴリページは DocPage・CategoryPage が面を並べて発火源を決めるので、ここは使わない。
 * ファーストビューには置かない（affiliate-operations.md「6. 配置ポリシー」）。
 */
export default function AffiliateSlot({
  page,
  slot,
  className,
}: {
  readonly page: PlacementPage;
  /** 面（config/cta-placements.json のキー＝GA4 の cta_placement） */
  readonly slot: string;
  readonly className?: string;
}) {
  const resolved = resolvePlacements(page);
  const placement = resolved[slot];
  if (!placement) return null;
  const pixel = pixelFor(resolved, [slot]);
  const card = placement.card();
  return (
    <div className={className}>
      <CareerAffiliate
        service={card.service}
        category={card.category}
        program="career"
        inlineCard={placement}
        placement={slot}
        {...(pixel ? { trackingPixelUrl: pixel.pixelSrc } : {})}
      />
    </div>
  );
}
