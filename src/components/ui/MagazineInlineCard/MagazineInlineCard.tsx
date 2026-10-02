import { brandOf } from '@/lib/exam-brand';
import { getMagazine, type MagazineId } from '@/lib/note-magazines';
import { noteCtaCopy } from '@/lib/note-cta-copy';
import NotePopCta from '@/components/ui/NotePopCta/NotePopCta';
interface MagazineInlineCardProps {
  readonly url: string; readonly title: string; readonly description: string;
  readonly magazineId: string; readonly badge: string; readonly trackLabel?: string; readonly placement?: string;
}
/** 複数商品を比較するコンパクトPOP。 */
export default function MagazineInlineCard({ url, title, description, magazineId, badge, trackLabel, placement = 'article-body' }: MagazineInlineCardProps) {
  const brand = brandOf(magazineId);
  const product = getMagazine(magazineId as MagazineId);
  const copy = product ? noteCtaCopy(product) : null;
  return <NotePopCta href={url} qualification={brand.label} title={copy?.title ?? title} subtitle={copy?.subtitle ?? description}
    badge={badge} button="教材の内容を見る" themeVar={brand.themeVar} format="compact"
    trackLabel={`${magazineId}:${trackLabel ?? 'unknown'}`} placement={placement} className="my-6 w-full max-w-2xl" />;
}
