import ResponsiveBanner from '@/components/ui/SidebarAdBanner/ResponsiveAffiliateBanner';
import { resolvePlacements, type ResolvedPlacement } from '@/lib/affiliate-placement';

/**
 * 基準書の画像バナー。案件は affiliate-placements.json、サイズは cta-placements.json が決める。
 * ピクセルは 1 ページ・1 案件・1 発。どの幅でも出る本文末 → 実際の本文中 → PC の右欄の順に持たせる。
 * 出し分けは既存の data-program-split-arm を使い、モバイル追加分にはピクセルを付けない。
 */
type StandardsPageKind = 'standards' | 'standards-list';
type PlacementProps = { pageKind: StandardsPageKind; inlineSlots?: readonly string[] };

const SLOTS: Record<StandardsPageKind, { rail: string; end: string; inline: string[] }> = {
  standards: { rail: 'standards-rail', end: 'standards-end', inline: ['standards-inline', 'standards-inline-2', 'standards-inline-3'] },
  'standards-list': { rail: 'standards-list-rail', end: 'standards-list-end', inline: [] },
};

/** primary と alternate のどちらも面のサイズで描くため、出し分けの情報を外して渡す。 */
function armsOf(placement: ResolvedPlacement) {
  const { alternate, ...primary } = placement;
  return {
    primary,
    alternate: alternate ? { ...primary, program: alternate.program, banner: alternate.banner, trackLabel: alternate.trackLabel, card: alternate.card } : null,
  };
}

function placementsOf(pageKind: StandardsPageKind, inlineSlots: readonly string[]) {
  const resolved = resolvePlacements({ pageKind });
  const slots = SLOTS[pageKind];
  const end = resolved[slots.end];
  const inline = slots.inline.filter((slot) => inlineSlots.includes(slot))
    .map((slot) => resolved[slot])
    .filter((placement): placement is ResolvedPlacement => Boolean(placement));
  const rail = resolved[slots.rail];
  const owner = new Map<string, string>();
  for (const placement of [end, ...inline, rail]) {
    if (!placement) continue;
    for (const arm of Object.values(armsOf(placement))) {
      if (arm && !owner.has(arm.program)) owner.set(arm.program, placement.slot);
    }
  }
  return { end, inline, rail, owner, endSlot: slots.end };
}

/** 各案件の持ち主を独立に決める。本文中の buildjob があっても、右欄の DX のピクセルは失わない。 */
function PlacementBanner({ placement, owner, creativeSlot, mobileExtra = false, shown = new Set<string>() }: {
  placement: ResolvedPlacement;
  owner: Map<string, string>;
  creativeSlot?: string;
  mobileExtra?: boolean;
  shown?: Set<string>;
}) {
  const arms = armsOf(placement);
  const render = (arm: ResolvedPlacement | null) => {
    if (!arm || shown.has(arm.program)) return null;
    return <ResponsiveBanner placement={arm} creativeSlot={creativeSlot ?? arm.slot} withPixel={!mobileExtra && owner.get(arm.program) === arm.slot} {...(mobileExtra ? { only: 'mobile' as const } : {})} />;
  };
  if (!arms.alternate) return render(arms.primary);
  return (
    <>
      <div data-program-split-arm="primary">{render(arms.primary)}</div>
      <div data-program-split-arm="alternate">{render(arms.alternate)}</div>
    </>
  );
}

/** PC の右欄はスクロール箱の外に 1 枠置く。 */
export function StandardsRailBanner({ pageKind, inlineSlots = [] }: PlacementProps) {
  const { rail, owner } = placementsOf(pageKind, inlineSlots);
  if (!rail) return null;
  return (
    <div className="hidden zenn-desktop:block" data-standards-affiliate="rail" data-pagefind-ignore>
      <PlacementBanner placement={rail} owner={owner} />
    </div>
  );
}

export function StandardsInlineBanner({ slot, inlineSlots = [slot], className = 'my-8' }: { slot: string; inlineSlots?: readonly string[]; className?: string }) {
  const { inline, owner } = placementsOf('standards', inlineSlots);
  const placement = inline.find((entry) => entry.slot === slot);
  if (!placement) return null;
  return (
    <div className={`not-prose mx-auto ${className}`} data-standards-affiliate="inline" data-pagefind-ignore>
      <PlacementBanner placement={placement} owner={owner} />
    </div>
  );
}

/** 本文末と、モバイルでは本文にまだ出ていない右欄の案件を出す。 */
export function StandardsEndBanner({ pageKind, inlineSlots = [], className = 'mt-10' }: PlacementProps & { className?: string }) {
  const { end, inline, rail, owner, endSlot } = placementsOf(pageKind, inlineSlots);
  const shown = new Set([end, ...inline].filter((p): p is ResolvedPlacement => Boolean(p)).map((p) => p.program));
  if (!end && !rail) return null;
  return (
    <div className={`mx-auto max-w-[740px] space-y-3 ${className}`} data-standards-affiliate="end" data-pagefind-ignore>
      {end && <PlacementBanner placement={end} owner={owner} />}
      {rail && (
        <div className="zenn-desktop:hidden">
          <PlacementBanner placement={rail} owner={owner} creativeSlot={endSlot} mobileExtra shown={shown} />
        </div>
      )}
    </div>
  );
}
