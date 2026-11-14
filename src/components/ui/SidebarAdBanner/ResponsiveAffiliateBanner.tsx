import SidebarAdBanner from './index';
import type { ResolvedPlacement } from '@/lib/affiliate-placement';
import { slotCreatives, type SlotCreative } from '@/lib/affiliate-slot-creatives';

function Banner({ creative, placement, withPixel }: { creative: SlotCreative; placement: ResolvedPlacement; withPixel: boolean }) {
  return (
    <SidebarAdBanner
      href={creative.href}
      imageSrc={creative.imageSrc}
      alt={creative.alt}
      width={creative.width}
      height={creative.height}
      pixelSrc={withPixel && creative.pixelSrc ? creative.pixelSrc : undefined}
      trackLabel={placement.trackLabel}
      placement={placement.slot}
      forceImage
    />
  );
}

/**
 * 1 つの面の PC 用・スマホ用。両方あれば幅で出し分け、片方だけならその幅でだけ出す。
 * creativeSlot は素材のサイズを決める面（モバイルの本文末に右の欄の案件を出すときは本文末のサイズで選ぶ）。
 */
export default function ResponsiveAffiliateBanner({ placement, creativeSlot = placement.slot, withPixel, only }: {
  placement: ResolvedPlacement;
  creativeSlot?: string;
  withPixel: boolean;
  only?: 'pc' | 'mobile';
}) {
  const fallback = () => <SidebarAdBanner {...placement.banner} pixelSrc={withPixel ? placement.banner.pixelSrc : undefined} trackLabel={placement.trackLabel} placement={placement.slot} />;
  if (placement.secondary || placement.alternate) return fallback();
  const { pc, mobile } = slotCreatives(placement.program, creativeSlot);
  const showPc = only !== 'mobile' ? pc : null;
  const showMobile = only !== 'pc' ? mobile : null;
  if (!showPc && !showMobile) {
    return <div className={only === 'pc' ? 'hidden zenn-desktop:block' : only === 'mobile' ? 'zenn-desktop:hidden' : ''}>{fallback()}</div>;
  }
  // PC とスマホで同じ素材なら 1 枚だけ（幅で出し分けない）
  if (showPc && showMobile && showPc.asp === showMobile.asp && showPc.materialId === showMobile.materialId) {
    return <Banner creative={showPc} placement={placement} withPixel={withPixel} />;
  }
  return (
    <>
      {showPc && (
        <div className={showMobile || only === 'pc' ? 'hidden zenn-desktop:block' : ''}>
          <Banner creative={showPc} placement={placement} withPixel={withPixel} />
        </div>
      )}
      {showMobile && (
        <div className={showPc || only === 'mobile' ? 'zenn-desktop:hidden' : ''}>
          <Banner creative={showMobile} placement={placement} withPixel={withPixel && !showPc} />
        </div>
      )}
    </>
  );
}

