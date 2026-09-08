import MetaCard from './MetaCard/MetaCard';
import { type NoteMagazine, buildMagazineUrl } from '@/lib/note-magazines';
import { brandOf } from '@/lib/exam-brand';

/** 公開済み教材のサイト用プレビュー。note表紙の保存場所や再生成には依存しない。 */
export default function NoteProductCard({ product, category, placement }: {
  product: NoteMagazine; category: string; placement: string;
}) {
  const brand = brandOf(product.id);
  const image = brand.previewImage || brand.ctaBg;
  const url = buildMagazineUrl(product, `${category}-${placement}`);
  const tracking = { 'data-cta': 'note', 'data-cta-label': product.id, 'data-cta-placement': placement };
  return <MetaCard padding="none" className="p-2" ariaLabel="学習教材">
    {image && <a href={url} target="_blank" rel="noopener noreferrer" {...tracking}
      aria-label={`${product.shortTitle || product.title}の内容をnoteで見る`}
      className="focus-ring group mx-auto block w-full max-w-[300px] overflow-hidden">
      <div className="relative aspect-[6/5] overflow-hidden bg-[var(--paper)]">
        <img src={image} alt="" width={300} height={250} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 border-t border-[var(--rule-soft)] bg-[var(--paper)] px-3 py-2">
          <span className="block text-xs text-[var(--ink-muted)]">{brand.label} · note教材</span>
          <span className="mt-1 block text-sm font-bold leading-snug text-[var(--ink)] group-hover:text-[var(--accent)]">{product.shortTitle || product.title}</span>
        </div>
      </div>
    </a>}
    <div className="px-2 pb-3 pt-3">
    <p className="text-sm text-[var(--ink-muted)]">note 有料教材</p>
    <h2 className="mt-2 text-lg font-bold text-[var(--ink)]">{product.shortTitle || product.title}</h2>
    <p className="mt-2 text-sm leading-relaxed text-[var(--ink-body)]">{product.shortDescription || product.description}</p>
    <p className="mt-2 text-sm font-bold text-[var(--ink)]">{product.price}</p>
    <a href={url} target="_blank" rel="noopener noreferrer" {...tracking}
      className="focus-ring mt-3 flex min-h-11 items-center justify-center border border-[var(--accent)] bg-[var(--accent-fill)] p-2 text-sm font-bold text-[var(--accent)] hover:underline">教材の内容を見る（note） →</a>
    </div>
  </MetaCard>;
}
