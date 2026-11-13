import SidebarAdBanner from '@/components/ui/SidebarAdBanner';
import { resolvePlacements, type ResolvedPlacement } from '@/lib/affiliate-placement';

/**
 * 基準書（/standards）の転職アフィリエイトの画像バナー（2026-11-13 運営者指示「バナー画像をできるだけ多く」）。
 * どの面にどの案件を出すかは config/affiliate-placements.json（standards-* の面）が決め、ここは描画とピクセルの割り振りだけ持つ。
 *
 * - 右の欄（PC）: 3 枠。案件はルールの順（standards-sidebar → -2 → -3）。
 * - 本文末: 1 枠（モバイルでも出る）。モバイルは右の欄が無いので、右の欄の残りの案件も本文末に続けて出す（href のみ）。
 * - ピクセルは 1 ページ・1 案件・1 発。本文末の案件は本文末が持ち（モバイルでも表示される面）、
 *   右の欄の案件は本文末と同じ案件なら href だけ、違う案件ならその枠が持つ。
 * 支給の画像バナーをそのまま出す（SidebarAdBanner の forceImage。登録済みの案件でも小型カードに替えない）。
 */

type StandardsPageKind = 'standards' | 'standards-list';

const SLOTS: Record<StandardsPageKind, { sidebar: string[]; end: string }> = {
  standards: { sidebar: ['standards-sidebar', 'standards-sidebar-2', 'standards-sidebar-3'], end: 'standards-end' },
  'standards-list': { sidebar: ['standards-list-sidebar', 'standards-list-sidebar-2', 'standards-list-sidebar-3'], end: 'standards-list-end' },
};

function placementsOf(pageKind: StandardsPageKind) {
  const resolved = resolvePlacements({ pageKind });
  const slots = SLOTS[pageKind];
  const end = resolved[slots.end];
  const sidebar = slots.sidebar
    .map((slot) => resolved[slot])
    .filter((placement): placement is ResolvedPlacement => Boolean(placement));
  return { end, sidebar };
}

function Banner({ placement, withPixel }: { placement: ResolvedPlacement; withPixel: boolean }) {
  const { banner } = placement;
  return (
    <SidebarAdBanner
      href={banner.href}
      imageSrc={banner.imageSrc}
      alt={banner.alt}
      width={banner.width}
      height={banner.height}
      pixelSrc={withPixel ? banner.pixelSrc : undefined}
      trackLabel={placement.trackLabel}
      placement={placement.slot}
      forceImage
    />
  );
}

/** 右の欄（PC）の 3 枠。本文末と同じ案件はピクセルを付けない */
export function StandardsSidebarBanners({ pageKind }: { pageKind: StandardsPageKind }) {
  const { end, sidebar } = placementsOf(pageKind);
  if (sidebar.length === 0) return null;
  const seen = new Set(end ? [end.program] : []);
  return (
    <div className="space-y-3" data-standards-affiliate="sidebar">
      {sidebar.map((placement) => {
        const withPixel = !seen.has(placement.program);
        seen.add(placement.program);
        return <Banner key={placement.slot} placement={placement} withPixel={withPixel} />;
      })}
    </div>
  );
}

/**
 * 本文末の 1 枠（モバイルでも出る）。この案件のピクセルはここが持つ。
 * モバイル（右の欄が無い幅）では、右の欄の残りの案件も続けて出す（href のみ。ピクセルは右の欄の枠が持つ）。
 */
export function StandardsEndBanner({ pageKind, className = 'mt-10' }: { pageKind: StandardsPageKind; className?: string }) {
  const { end, sidebar } = placementsOf(pageKind);
  if (!end) return null;
  const mobileExtra = sidebar.filter((placement, index, all) =>
    placement.program !== end.program && all.findIndex((other) => other.program === placement.program) === index);
  return (
    <div className={`mx-auto max-w-[316px] space-y-3 ${className}`} data-standards-affiliate="end">
      <Banner placement={end} withPixel />
      {mobileExtra.map((placement) => (
        <div key={placement.slot} className="zenn-desktop:hidden">
          <Banner placement={placement} withPixel={false} />
        </div>
      ))}
    </div>
  );
}
