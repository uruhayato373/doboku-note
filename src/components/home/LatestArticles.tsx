import Link from "next/link";
import { ArrowRight, Hash } from "lucide-react";

export interface LatestArticle {
  slug: string;
  title: string;
  category?: string | undefined;
  categoryLabel?: string | undefined;
  date?: string | undefined;
  tags?: string[] | undefined;
  image?: string | undefined;
}

interface LatestArticlesProps {
  articles: LatestArticle[];
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function LatestArticles({ articles }: LatestArticlesProps) {
  if (!articles || articles.length === 0) return null;
  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      <div className="flex items-end justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-black text-[var(--ink)]">最新の記事</h2>
          <p className="text-[14px] text-[var(--ink-muted)] mt-1.5">現場と参考書から抽出した論点を、定期的に更新</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {articles.map((a) => {
          const date = formatDate(a.date);
          return (
            <Link
              key={a.slug}
              href={`/docs/${a.slug}`}
              className="group flex flex-col overflow-hidden bg-[var(--paper)] border border-[var(--rule-soft)] rounded-card-section hover:border-[var(--accent)] hover:shadow-soft transition-all"
            >
              {/* サムネ（記事別 OGP＝1200:630・資格別テーマ色＋タグ焼き込み。RelatedArticleCard と同系統）。
                  資格別写真プール（guide-covers）は猫/場違い画像の混入により 2026-07-07 に廃止し OGP へ一本化。 */}
              <div className="relative aspect-[1200/630] overflow-hidden bg-[var(--accent-fill)]">
                {a.image && (
                  <img
                    src={a.image}
                    alt=""
                    aria-hidden="true"
                    width={1024}
                    height={576}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                )}
              </div>
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {a.categoryLabel && (
                    <span className="rounded-card-inline bg-[var(--accent-fill)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--accent)]">
                      {a.categoryLabel}
                    </span>
                  )}
                  {date && <span className="font-mono text-[10px] text-[var(--ink-muted)] tabular-nums">{date}</span>}
                </div>
                <h3 className="font-serif font-bold text-base sm:text-lg text-[var(--ink)] leading-snug group-hover:text-[var(--accent)] transition-colors">
                  {a.title}
                </h3>
                {a.tags && a.tags.length > 0 && (
                  <div className="flex gap-3 mt-3 flex-wrap">
                    {a.tags.slice(0, 4).map((t) => (
                      <span key={t} className="font-mono text-[10px] text-[var(--ink-muted)] flex items-center gap-1">
                        <Hash className="w-2.5 h-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)] group-hover:text-[var(--accent)] transition-colors">
                  <span>Read</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
