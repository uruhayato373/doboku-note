import ArticleThumbRow from "@/components/ui/RelatedArticles/ArticleThumbRow";
import { ArrowRight, Hash } from "lucide-react";
import { getPublicDocPath } from '@/lib/content-routes';
import { formatDotDate } from "@/lib/display-date";
import { WIDE_CONTAINER } from '@/components/layout/container';
import type { CardImage } from '@/lib/site-thumbnail';

export interface LatestArticle {
  slug: string;
  title: string;
  category?: string | undefined;
  categoryLabel?: string | undefined;
  date?: string | undefined;
  tags?: string[] | undefined;
  image?: CardImage | undefined;
}

interface LatestArticlesProps {
  articles: LatestArticle[];
}

const formatDate = (iso?: string): string | null => formatDotDate(iso);

export default function LatestArticles({ articles }: LatestArticlesProps) {
  if (!articles || articles.length === 0) return null;
  return (
    <section id="latest" className={`scroll-mt-24 ${WIDE_CONTAINER} py-8 sm:py-10`} data-cta="nav" data-cta-label="home-latest">
      <div className="flex items-end justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-black text-(--ink)">最新の記事</h2>
          <p className="text-[14px] text-(--ink-muted) mt-1.5">現場と参考書から抽出した論点を、定期的に更新</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {articles.map((a) => {
          const date = formatDate(a.date);
          return (
            <ArticleThumbRow
              key={a.slug}
              variant="feed"
              framed
              thumb="wide"
              href={getPublicDocPath(a.slug)}
              title={a.title}
              image={a.image}
              eyebrow={(a.categoryLabel || date) && <span className="flex flex-wrap items-center gap-2">
                {a.categoryLabel && <span className="rounded-card-inline bg-(--accent-fill) px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-(--accent)">{a.categoryLabel}</span>}
                {date && <span className="font-mono text-[10px] tabular-nums">{date}</span>}
              </span>}
              meta={<>
                {a.tags && a.tags.length > 0 && (
                  <span className="mt-2 flex flex-wrap gap-3">
                    {a.tags.slice(0, 4).map((t) => (
                      <span key={t} className="flex items-center gap-1 font-mono text-[10px] text-(--ink-muted)"><Hash className="h-2.5 w-2.5" />{t}</span>
                    ))}
                  </span>
                )}
                <span className="mt-2 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-(--ink-muted) transition-colors group-hover:text-(--accent)">
                  <span>Read</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </>}
            />
          );
        })}
      </div>
    </section>
  );
}
