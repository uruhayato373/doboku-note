import { type NoteMagazine, buildMagazineUrl } from '@/lib/note-magazines';
import { brandOf } from '@/lib/exam-brand';
import { noteCtaCopy } from '@/lib/note-cta-copy';
import NotePopCta from './NotePopCta/NotePopCta';
/** サイドバーと資格トップの教材CTA。本文は横長、サイドバーは6:5。 */
export default function NoteProductCard({ product, category, placement }: { product: NoteMagazine; category: string; placement: string; }) {
  const brand = brandOf(product.id);
  const copy = noteCtaCopy(product);
  return <NotePopCta href={buildMagazineUrl(product, `${category}-${placement}`)}
    qualification={brand.label} title={copy.title} subtitle={copy.subtitle} price={copy.price}
    badge={product.badge} button="教材の内容を見る" themeVar={brand.themeVar} pose={product.ctaPose ?? 'pointing'}
    format={placement.includes('sidebar') ? 'tile' : 'body'} trackLabel={product.id} placement={placement} />;
}
