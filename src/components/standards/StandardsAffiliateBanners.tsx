import ResponsiveBanner from '@/components/ui/SidebarAdBanner/ResponsiveAffiliateBanner';
import { resolvePlacements, type ResolvedPlacement } from '@/lib/affiliate-placement';
import { CTA_STACK_CLASS } from '@/lib/cta-stack';

/**
 * 基準書の画像バナー。案件は affiliate-placements.json、サイズは cta-placements.json が決める。
 * ピクセルは 1 ページ・1 案件・1 発。どの幅でも出る本文末 → 実際の本文中 → PC の右欄の順に持たせる。
 * モバイル追加分にはピクセルを付けない。
 */
type StandardsPageKind = 'standards' | 'standards-list';
type PlacementProps = { pageKind: StandardsPageKind; inlineSlots?: readonly string[] };

const SLOTS: Record<StandardsPageKind, { rail: string[]; end: string; inline: string[] }> = {
  standards: { rail: ['standards-rail', 'standards-rail-2', 'standards-rail-3'], end: 'standards-end', inline: ['standards-inline', 'standards-inline-2', 'standards-inline-3'] },
  'standards-list': { rail: ['standards-list-rail', 'standards-list-rail-2'], end: 'standards-list-end', inline: [] },
};

function placementsOf(pageKind: StandardsPageKind, inlineSlots: readonly string[]) {
  const resolved = resolvePlacements({ pageKind });
  const slots = SLOTS[pageKind];
  const end = resolved[slots.end];
  const inline = slots.inline.filter((slot) => inlineSlots.includes(slot))
    .map((slot) => resolved[slot])
    .filter((placement): placement is ResolvedPlacement => Boolean(placement));
  const rail = slots.rail.map((slot) => resolved[slot])
    .filter((placement): placement is ResolvedPlacement => Boolean(placement));
  const owner = new Map<string, string>();
  for (const placement of [end, ...inline, ...rail]) {
    if (!placement) continue;
    if (!owner.has(placement.program)) owner.set(placement.program, placement.slot);
  }
  return { end, inline, rail, owner, endSlot: slots.end };
}

/** 本文末 → 本文中 → 右欄の順で決めた持ち主だけがピクセルを出す。 */
function PlacementBanner({ placement, owner, creativeSlot, mobileExtra = false }: {
  placement: ResolvedPlacement;
  owner: Map<string, string>;
  creativeSlot?: string;
  mobileExtra?: boolean;
}) {
  return <ResponsiveBanner placement={placement} creativeSlot={creativeSlot ?? placement.slot} withPixel={!mobileExtra && owner.get(placement.program) === placement.slot} {...(mobileExtra ? { only: 'mobile' as const } : {})} />;
}

/** PC の右欄の指定した面を描く。 */
export function StandardsRailBanner({ slot, pageKind, inlineSlots = [] }: PlacementProps & { slot: string }) {
  const { rail, owner } = placementsOf(pageKind, inlineSlots);
  const placement = rail.find((entry) => entry.slot === slot);
  if (!placement) return null;
  return (
    <div className="hidden zenn-desktop:block" data-standards-affiliate="rail" data-pagefind-ignore>
      <PlacementBanner placement={placement} owner={owner} />
    </div>
  );
}

export function StandardsInlineBanner({ slot, inlineSlots = [slot], className = 'my-8' }: { slot: string; inlineSlots?: readonly string[]; className?: string }) {
  const { inline, owner } = placementsOf('standards', inlineSlots);
  const placement = inline.find((entry) => entry.slot === slot);
  if (!placement) return null;
  return (
    <div data-cta-stack className={`${CTA_STACK_CLASS} ${className}`} data-standards-affiliate="inline" data-pagefind-ignore>
      <PlacementBanner placement={placement} owner={owner} />
    </div>
  );
}

/** 本文末と、モバイルでは本文にまだ出ていない右欄の案件を出す。 */
export function StandardsEndBanner({ pageKind, inlineSlots = [], className = 'mt-10' }: PlacementProps & { className?: string }) {
  const { end, inline, rail, owner, endSlot } = placementsOf(pageKind, inlineSlots);
  const shown = new Set([end, ...inline].filter((p): p is ResolvedPlacement => Boolean(p)).map((p) => p.program));
  const mobileExtras = rail.filter((placement) => {
    if (shown.has(placement.program)) return false;
    shown.add(placement.program);
    return true;
  });
  if (!end && mobileExtras.length === 0) return null;
  return (
    <div data-cta-stack className={`${CTA_STACK_CLASS} space-y-3 ${className}`} data-standards-affiliate="end" data-pagefind-ignore>
      {end && <PlacementBanner placement={end} owner={owner} />}
      {mobileExtras.map((placement) => (
        <div key={placement.slot} className="zenn-desktop:hidden">
          <PlacementBanner placement={placement} owner={owner} creativeSlot={endSlot} mobileExtra />
        </div>
      ))}
    </div>
  );
}
