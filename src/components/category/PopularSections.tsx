import Link from 'next/link';
import Image from 'next/image';
import { type PopularDoc, popularWindow } from '@/lib/popular';
import { getOgpImageUrl } from '@/lib/r2-image-loader';

/** 集計窓を「YYYY.MM.DD–MM.DD」で短く表示。窓不明なら null。 */
function windowLabel(): string | null {
  if (!popularWindow?.start || !popularWindow?.end) return null;
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };
  return `${fmt(popularWindow.start)}〜${fmt(popularWindow.end)}`;
}

/** 人気記事リストの1行（サムネ左＋ランク番号＋タイトル/抜粋のブログ型）。OGP を 1200:630 サムネにし、
 *  行の高さは line-clamp で揃える。ランクは OGP のタイトル焼込みと重ならないようタイトル側に置く。 */
function PopularListRow({ item }: { item: PopularDoc }) {
  const { doc, rank } = item;
  const title = doc.shortTitle || doc.title;
  const excerpt = doc.subtitle || doc.description;
  return (
    <li className="border-b border-[var(--rule-soft)] last:border-b-0">
      <Link
        href={`/docs/${doc.slug}`}
        className="group flex gap-3 sm:gap-4 py-4 first:pt-0"
      >
        <div className="relative aspect-[1200/630] w-[124px] sm:w-[168px] shrink-0 overflow-hidden border border-[var(--rule-soft)] bg-[var(--bg)]">
          <Image
            src={getOgpImageUrl(doc.slug)}
            alt=""
            width={336}
            height={176}
            unoptimized
            loading="lazy"
            sizes="(max-width: 640px) 124px, 168px"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex min-w-0 flex-1 gap-2.5">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-card-inline bg-[var(--accent-fill)] font-mono text-xs font-bold tabular-nums text-[var(--accent)]">
            {rank}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="font-serif text-[15px] sm:text-lg font-bold leading-snug text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
              {title}
            </h3>
            {excerpt && (
              <p className="text-[13px] sm:text-sm text-[var(--ink-muted)] line-clamp-2">{excerpt}</p>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

/**
 * カテゴリ hub 上部の「よく読まれている記事」特集。GA4 実アクセス上位（直近 28 日）を提示する。
 * 注目フラグでなく実シグナル駆動。各記事の OGP（R2 配信・全 published で CI 実在保証）をサムネにした
 * ブログ型の縦リストで、サイズを揃えて回遊させる。items が空なら描画しない（graceful）。
 */
export function PopularShowcase({ items }: { items: PopularDoc[] }) {
  if (items.length === 0) return null;
  return (
    <section data-cta="nav" data-cta-label="popular-showcase">
      <h2 className="font-serif text-[22px] sm:text-[26px] font-black text-[var(--ink)] mb-5">よく読まれている記事</h2>
      <ol className="flex flex-col">
        {items.map((item) => (
          <PopularListRow key={item.doc.slug} item={item} />
        ))}
      </ol>
    </section>
  );
}

/**
 * サイドバー「人気記事ランキング」。GA4 実アクセス上位（直近 28 日）を番号付きリストで提示。
 * items が空なら描画しない（graceful）。socialplus 参考の閲覧ランキングウィジェット。
 */
export function PopularRanking({ items }: { items: PopularDoc[] }) {
  if (items.length === 0) return null;
  const label = windowLabel();
  return (
    <div data-cta="nav" data-cta-label="popular-ranking" className="card-surface-content overflow-hidden shadow-none">
      <div className="px-4 py-3 border-b border-[var(--rule-soft)] flex items-baseline justify-between gap-2">
        <h3 className="font-serif font-bold text-[var(--ink)] text-sm">人気記事</h3>
        {label && <span className="font-mono text-[10px] text-[var(--ink-muted)] tabular-nums">{label}</span>}
      </div>
      <ol className="flex flex-col">
        {items.map((item) => (
          <li key={item.doc.slug}>
            <Link
              href={`/docs/${item.doc.slug}`}
              className="group flex gap-3 px-4 py-3 border-b border-[var(--rule-soft)] last:border-b-0 hover:bg-[var(--accent-fill)] transition-colors"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-card-inline bg-[var(--accent-fill)] font-mono text-xs font-bold text-[var(--accent)]">
                {item.rank}
              </span>
              <span className="font-serif text-[13px] font-bold leading-tight text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                {item.doc.shortTitle || item.doc.title}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
