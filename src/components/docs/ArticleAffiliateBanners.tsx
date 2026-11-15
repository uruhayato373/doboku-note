import ResponsiveAffiliateBanner from '@/components/ui/SidebarAdBanner/ResponsiveAffiliateBanner';
import type { ResolvedPlacement } from '@/lib/affiliate-placement';
import { slotCreatives } from '@/lib/affiliate-slot-creatives';
export { articleRailSlot, articleImagePlacements, articlePixelCandidates } from '@/lib/article-affiliate-plan';

export function ArticleBanner({ placement, kind }: { placement: ResolvedPlacement | undefined; kind: 'inline' | 'rail' | 'end' }) {
  if (!placement) return null;
  const c = slotCreatives(placement.program, placement.slot);
  if (!c.pc && !c.mobile) return null;
  return <div data-article-affiliate={kind} data-pagefind-ignore className={kind === 'rail' ? 'hidden zenn-desktop:block' : 'not-prose mx-auto my-8 max-w-[740px]'}>
    {placement.program === 'dainishinsotsu-agent-neo' && <p className="mb-2 text-center text-xs text-ink-muted">20代・第二新卒向け</p>}
    <ResponsiveAffiliateBanner placement={placement} withPixel={false} strictImage {...(kind === 'rail' ? { only: 'pc' as const } : {})} />
  </div>;
}
