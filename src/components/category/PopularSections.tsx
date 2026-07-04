import Link from 'next/link';
import { type PopularDoc, popularWindow } from '@/lib/popular';

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

function RankBadge({ rank }: { rank: number }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--accent)] px-2 py-0.5 bg-[var(--accent-fill)] rounded-sm">
      人気 #{rank}
    </span>
  );
}

function ShowcaseCard({ item, lead = false }: { item: PopularDoc; lead?: boolean }) {
  const { doc, rank } = item;
  const title = doc.shortTitle || doc.title;
  const excerpt = doc.subtitle || doc.description;
  return (
    <Link
      href={`/docs/${doc.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-card-content border border-[var(--rule-soft)] bg-[var(--paper)] hover:border-[var(--accent)] hover:shadow-soft transition-all"
    >
      <span aria-hidden className="block h-[3px] w-full bg-[var(--color-brand)] opacity-70 group-hover:opacity-100 transition-opacity" />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <RankBadge rank={rank} />
        <h3
          className={`font-serif font-bold text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors leading-snug ${
            lead ? 'text-xl sm:text-2xl line-clamp-3' : 'text-lg line-clamp-2'
          }`}
        >
          {title}
        </h3>
        {excerpt && (
          <p className={`text-sm text-[var(--ink-muted)] ${lead ? 'line-clamp-3' : 'line-clamp-2'}`}>{excerpt}</p>
        )}
        <div className="mt-auto pt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)] group-hover:text-[var(--accent)] transition-colors">
          Read <span aria-hidden>→</span>
        </div>
      </div>
    </Link>
  );
}

/**
 * カテゴリ hub 上部の「よく読まれている記事」特集。GA4 実アクセス上位（直近 28 日）を提示する。
 * 注目フラグでなく実シグナル駆動。OGP がタイトル焼込み済のため画像でなくランクバッジ＋タイポで構成。
 * items が空なら描画しない（graceful）。socialplus 参考の image-led showcase を資産現実に合わせた版。
 */
export function PopularShowcase({ items }: { items: PopularDoc[] }) {
  const [lead, ...rest] = items;
  if (!lead) return null;
  const label = windowLabel();
  return (
    <section data-cta="nav" data-cta-label="popular-showcase">
      <div className="mb-6">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <h2 className="font-serif text-[22px] sm:text-[26px] font-black text-[var(--ink)]">よく読まれている記事</h2>
          {label && <span className="font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">{label}</span>}
        </div>
        <p className="text-[14px] text-[var(--ink-muted)] mt-1">アクセスの多い記事から探す</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1 md:row-span-2">
          <ShowcaseCard item={lead} lead />
        </div>
        {rest.map((item) => (
          <div key={item.doc.slug} className="md:col-span-2">
            <ShowcaseCard item={item} />
          </div>
        ))}
      </div>
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
    <div data-cta="nav" data-cta-label="popular-ranking" className="rounded-card-content border border-[var(--rule-soft)] bg-[var(--paper)] overflow-hidden">
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
              <span className="shrink-0 w-6 h-6 flex items-center justify-center font-mono text-xs font-bold text-[var(--accent)] bg-[var(--accent-fill)] rounded-sm">
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
