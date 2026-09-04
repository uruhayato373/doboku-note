import Link from 'next/link';
import { getPublicDocPath } from '@/lib/content-routes';
import { ArrowRight } from 'lucide-react';
import type { LatestArticle } from './LatestArticles';

function formatDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export default function RecentUpdatesStrip({ articles }: { articles: LatestArticle[] }) {
  if (articles.length === 0) return null;

  return (
    <section
      aria-labelledby="recent-updates-title"
      data-cta="nav"
      data-cta-label="home-recent-updates"
      className="border-b border-[var(--rule-soft)] bg-[var(--paper)]"
    >
      <div className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between gap-4">
          <h2 id="recent-updates-title" className="font-serif text-[17px] font-bold text-[var(--ink)] sm:text-[19px]">
            最近更新
          </h2>
          <Link
            href="#latest"
            className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-card-inline px-2 text-[12px] font-medium text-[var(--accent)]"
          >
            最新記事を見る
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2 sm:gap-4">
          {articles.slice(0, 6).map((article) => {
            const date = formatDate(article.date);
            return (
              <li key={article.slug} className="min-w-0">
                <Link
                  href={getPublicDocPath(article.slug)}
                  className="focus-ring group flex min-h-11 items-center gap-2 rounded-card-inline px-2 transition-colors hover:bg-[var(--accent-fill)]"
                >
                  {date && (
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-[var(--ink-muted)]">
                      {date}
                    </span>
                  )}
                  <span className="min-w-0 truncate text-[13px] text-[var(--ink-body)] group-hover:text-[var(--accent)] sm:text-[14px]">
                    {article.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
