import { getMagazine, buildMagazineUrl, type MagazineId } from '@/lib/note-magazines';
import { brandOf } from '@/lib/exam-brand';
import { noteCtaCopy } from '@/lib/note-cta-copy';
import NotePopCta from '@/components/ui/NotePopCta/NotePopCta';
interface MagazineHeroCtaProps { readonly id: MagazineId; readonly utmContent: string; readonly placement?: string; }
/** 本文の主商品CTA。カタログを共通POP表示へ渡す。 */
export default function MagazineHeroCta({ id, utmContent, placement = 'article-body' }: MagazineHeroCtaProps) {
  const product = getMagazine(id);
  if (!product) return null;
  const brand = brandOf(id);
  const copy = noteCtaCopy(product);
  return <NotePopCta href={buildMagazineUrl(product, utmContent)} qualification={brand.label}
    title={copy.title} subtitle={product.ctaCatch ?? copy.subtitle} price={copy.price} badge={product.badge}
    button={product.ctaButton ?? '教材の内容を見る'} themeVar={brand.themeVar}
    pose={product.ctaPose ?? 'pointing'} trackLabel={`${id}:${utmContent}`}
    placement={placement} className="my-6 w-full max-w-2xl" />;
}
