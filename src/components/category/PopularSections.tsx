import Link from 'next/link';
import { type PopularDoc, popularWindow } from '@/lib/popular';
import { OgpThumbRow } from '@/components/category/CategorySections';

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

/**
 * カテゴリ hub 上部の「よく読まれている記事」特集。GA4 実アクセス上位（直近 28 日）を提示する。
 * 注目フラグでなく実シグナル駆動。各記事の OGP（R2 配信・全 published で CI 実在保証）をサムネにした
 * ブログ型の縦リストで、サイズを揃えて回遊させる。行は OgpThumbRow（rank 付き）で共通化。
 * ランクは OGP のタイトル焼込みと重ならないようタイトル側に置く。items が空なら描画しない（graceful）。
 */
export function PopularShowcase({ items }: { items: PopularDoc[] }) {
  if (items.length === 0) return null;
  return (
    <section data-cta="nav" data-cta-label="popular-showcase">
      <h2 className="font-serif text-[22px] sm:text-[26px] font-black text-[var(--ink)] mb-5">よく読まれている記事</h2>
      <ol className="flex flex-col">
        {items.map((item) => (
          <OgpThumbRow key={item.doc.slug} doc={item.doc} rank={item.rank} eager />
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
