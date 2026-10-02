import { brandOf } from '@/lib/exam-brand';
import { getMagazine, type MagazineId } from '@/lib/note-magazines';
import { noteCtaCopy } from '@/lib/note-cta-copy';
import NotePopCta from '@/components/ui/NotePopCta/NotePopCta';
interface MagazineTopBannerProps {
  readonly magazineId: string; readonly url: string; readonly title: string;
  readonly price?: string | undefined; readonly badge: string; readonly trackLabel?: string;
}
/** 記事冒頭のコンパクトPOP。本文を読み始める位置の高さを抑える。 */
export default function MagazineTopBanner({ magazineId, url, title, price, badge, trackLabel }: MagazineTopBannerProps) {
  const brand = brandOf(magazineId);
  const product = getMagazine(magazineId as MagazineId);
  const copy = product ? noteCtaCopy(product) : null;
  return <NotePopCta href={url} qualification={brand.label} title={copy?.title ?? title} price={copy?.price ?? price} badge={badge}
    button="教材の内容を見る" themeVar={brand.themeVar} format="compact"
    trackLabel={`${magazineId}:${trackLabel ?? 'unknown'}`} placement="article-top" className="mb-8" />;
}
