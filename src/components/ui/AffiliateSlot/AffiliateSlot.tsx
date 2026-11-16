import ResponsiveAffiliateBanner from "@/components/ui/SidebarAdBanner/ResponsiveAffiliateBanner";
import { pixelFor, resolvePlacements, type PlacementPage } from "@/lib/affiliate-placement";
import { CTA_STACK_CLASS, CTA_STACK_START_CLASS } from "@/lib/cta-stack";

/**
 * 1 ページに転職アフィリエイトの面が 1 つだけのページ（公的基準・トピック・トップ・ツール）の枠。
 *
 * どの案件を出すかは配置ルール（config/affiliate-placements.json）が決め、ルールが無ければ何も描かない
 * （黙って別の案件に倒さない）。面が 1 つなので、この枠が 1 ページ 1 ピクセルの発火源になる（config/cta-placements.json の pixelPriority）。
 * 記事ページ（本文カード・中間・記事末）とカテゴリページは DocPage・CategoryPage が面を並べて発火源を決めるので、ここは使わない。
 */
export default function AffiliateSlot({
  page,
  slot,
  className,
  framed = false,
  alignStart = false,
}: {
  readonly page: PlacementPage;
  /** 面（config/cta-placements.json のキー＝GA4 の cta_placement） */
  readonly slot: string;
  readonly className?: string;
  /** 全幅の枠の中央にバナーを置く（トップ: 上の全幅の見出し画像と左右の端をそろえる） */
  readonly framed?: boolean;
  /** 区画の左端にそろえる（テーマのページ: ほかの区画が左寄せ） */
  readonly alignStart?: boolean;
}) {
  const resolved = resolvePlacements(page);
  const placement = resolved[slot];
  if (!placement) return null;
  const pixel = pixelFor(resolved, [slot]);
  return (
    <div className={className}>
      {/* 横長バナーの幅の正本（本文の列で縦に続く導線とそろえる・src/lib/cta-stack.ts） */}
      {framed ? (
        <div data-cta-stack className="rounded-card-section border border-(--rule-soft) bg-(--paper) px-4 py-6 shadow-card-content dark:border-(--rule)">
          <div className={CTA_STACK_CLASS}><ResponsiveAffiliateBanner placement={placement} withPixel={Boolean(pixel)} /></div>
        </div>
      ) : (
        <div data-cta-stack className={alignStart ? CTA_STACK_START_CLASS : CTA_STACK_CLASS}>
          <ResponsiveAffiliateBanner placement={placement} withPixel={Boolean(pixel)} />
        </div>
      )}
    </div>
  );
}
