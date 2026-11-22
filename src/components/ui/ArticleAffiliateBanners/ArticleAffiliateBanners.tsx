import ResponsiveAffiliateBanner from '@/components/ui/SidebarAdBanner/ResponsiveAffiliateBanner';
import type { ResolvedPlacement } from '@/lib/affiliate-placement';
import { slotCreatives } from '@/lib/affiliate-slot-creatives';
import { CTA_STACK_CLASS } from '@/lib/cta-stack';
export { articleRailSlot, articleImagePlacements, articlePixelCandidates } from '@/lib/article-affiliate-plan';

export function ArticleBanner({ placement, kind }: { placement: ResolvedPlacement | undefined; kind: 'inline' | 'rail' | 'end' }) {
  if (!placement) return null;
  const c = slotCreatives(placement.program, placement.slot);
  if (!c.pc && !c.mobile) return null;
  const visibility = !c.pc ? ' zenn-desktop:hidden' : !c.mobile ? ' hidden zenn-desktop:block' : '';
  // 記事末（end）は記事カードの外なので、スマホ幅では記事と同じ余白を外側に付ける（note・ココナラと左右の端をそろえる）
  const banner = <div data-article-affiliate={kind} data-pagefind-ignore {...(kind === 'rail' ? {} : { 'data-cta-stack': '' })} className={kind === 'rail' ? 'hidden zenn-desktop:block' : `${CTA_STACK_CLASS} my-8${visibility}`}>
    <ResponsiveAffiliateBanner placement={placement} withPixel={false} strictImage {...(kind === 'rail' ? { only: 'pc' as const } : {})} />
  </div>;
  return kind === 'end' ? <div className="max-zenn-sp:px-(--article-gutter-sp)">{banner}</div> : banner;
}
