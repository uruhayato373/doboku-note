import ResponsiveBanner from '@/components/ui/SidebarAdBanner/ResponsiveAffiliateBanner';
import { resolvePlacements, type ResolvedPlacement } from '@/lib/affiliate-placement';

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
