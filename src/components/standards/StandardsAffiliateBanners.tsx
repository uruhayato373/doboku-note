import SidebarAdBanner from '@/components/ui/SidebarAdBanner';
import { resolvePlacements, type ResolvedPlacement } from '@/lib/affiliate-placement';
import { slotCreatives, type SlotCreative } from '@/lib/affiliate-slot-creatives';

/**
 * 基準書（/standards）の転職アフィリエイトの画像バナー（2026-11-13 運営者指示）。
 * どの面にどの案件を出すかは config/affiliate-placements.json（standards-* の面）、
 * 面で使うサイズは config/cta-placements.json の sizes（PC・スマホ別）、素材は data/affiliate/catalog.json の creatives が決める。
 * ここは描画とピクセルの割り振りだけ持つ。
 *
 * - 右の欄（PC）: 3 枠（300×250）。
 * - 章の本文中: 横長 1 枠（PC 728×90・スマホ 320×50 など）。
 * - 本文末: 1 枠。モバイルは右の欄が無いので、右の欄の残りの案件も本文末に続けて出す。
 * - ピクセルは 1 ページ・1 案件・1 発。どの幅でも出る面（本文末 → 本文中）を優先し、右の欄だけの案件はその枠が持つ。
 *   PC 用とスマホ用の 2 つを描く面は、ピクセルを片方にだけ付ける（隠れている方の画像も読み込まれるので、どちらに付けても 1 発）。
 */

type StandardsPageKind = 'standards' | 'standards-list';

const SLOTS: Record<StandardsPageKind, { sidebar: string[]; end: string; inline: string | null }> = {
  standards: { sidebar: ['standards-sidebar', 'standards-sidebar-2', 'standards-sidebar-3'], end: 'standards-end', inline: 'standards-inline' },
  'standards-list': { sidebar: ['standards-list-sidebar', 'standards-list-sidebar-2', 'standards-list-sidebar-3'], end: 'standards-list-end', inline: null },
};

function placementsOf(pageKind: StandardsPageKind) {
  const resolved = resolvePlacements({ pageKind });
  const slots = SLOTS[pageKind];
  const end = resolved[slots.end];
  const inline = slots.inline ? resolved[slots.inline] : undefined;
  const sidebar = slots.sidebar
    .map((slot) => resolved[slot])
    .filter((placement): placement is ResolvedPlacement => Boolean(placement));
  // 案件 → ピクセルを持つ面。どの幅でも出る面（本文末・本文中）から先に取る
  const owner = new Map<string, string>();
  for (const placement of [end, inline, ...sidebar]) {
    if (placement && !owner.has(placement.program)) owner.set(placement.program, placement.slot);
  }
  return { end, inline, sidebar, owner, endSlot: slots.end };
}

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
function ResponsiveBanner({ placement, creativeSlot = placement.slot, withPixel, only }: {
  placement: ResolvedPlacement;
  creativeSlot?: string;
  withPixel: boolean;
  only?: 'pc' | 'mobile';
}) {
  const { pc, mobile } = slotCreatives(placement.program, creativeSlot);
  const showPc = only !== 'mobile' ? pc : null;
  const showMobile = only !== 'pc' ? mobile : null;
  if (!showPc && !showMobile) return null;
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

/** 右の欄（PC）の 3 枠。ピクセルは本文末・本文中に同じ案件が無いときだけ */
export function StandardsSidebarBanners({ pageKind }: { pageKind: StandardsPageKind }) {
  const { sidebar, owner } = placementsOf(pageKind);
  if (sidebar.length === 0) return null;
  return (
    <div className="space-y-3" data-standards-affiliate="sidebar">
      {sidebar.map((placement) => (
        <ResponsiveBanner key={placement.slot} placement={placement} withPixel={owner.get(placement.program) === placement.slot} />
      ))}
    </div>
  );
}

/** 章の本文中の横長 1 枠（PC 728×90・スマホ 320×50 など）。合う素材が無ければ出さない */
export function StandardsInlineBanner({ className = 'my-8' }: { className?: string }) {
  const { inline, owner } = placementsOf('standards');
  if (!inline) return null;
  return (
    <div className={`not-prose mx-auto ${className}`} data-standards-affiliate="inline" data-pagefind-ignore>
      <ResponsiveBanner placement={inline} withPixel={owner.get(inline.program) === inline.slot} />
    </div>
  );
}

/**
 * 本文末の 1 枠（どの幅でも出る）。モバイル（右の欄が無い幅）では、右の欄の残りの案件も本文末のサイズで続けて出す（ピクセルなし）。
 */
export function StandardsEndBanner({ pageKind, className = 'mt-10' }: { pageKind: StandardsPageKind; className?: string }) {
  const { end, inline, sidebar, owner, endSlot } = placementsOf(pageKind);
  if (!end) return null;
  const shown = new Set([end.program, ...(inline ? [inline.program] : [])]);
  const mobileExtra = sidebar.filter((placement) => {
    if (shown.has(placement.program)) return false;
    shown.add(placement.program);
    return true;
  });
  return (
    <div className={`mx-auto max-w-[740px] space-y-3 ${className}`} data-standards-affiliate="end" data-pagefind-ignore>
      <ResponsiveBanner placement={end} withPixel={owner.get(end.program) === end.slot} />
      {mobileExtra.map((placement) => (
        <ResponsiveBanner key={placement.slot} placement={placement} creativeSlot={endSlot} withPixel={false} only="mobile" />
      ))}
    </div>
  );
}
