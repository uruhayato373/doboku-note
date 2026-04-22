import Link from "next/link";
import { AUTHOR } from "@/config/author";

interface AuthorCardProps {
  publishedAt?: string;
  updatedAt?: string;
  lastRewrittenAt?: string;
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  } catch {
    return null;
  }
}

export default function AuthorCard({
  publishedAt,
  updatedAt,
  lastRewrittenAt,
}: AuthorCardProps) {
  const published = formatDate(publishedAt);
  const updated = formatDate(updatedAt);
  const lastReviewed = formatDate(lastRewrittenAt);

  return (
    <aside
      className="mt-10 rounded-card-section shadow-card-section border border-gray-200/60 dark:border-gray-700/60 bg-white dark:bg-gray-800 p-6 sm:p-8"
      aria-label="執筆者情報"
    >
      <div className="flex items-start gap-4">
        <Link href="/about" className="shrink-0">
          <img
            src={AUTHOR.imageUrl}
            alt={`${AUTHOR.name}のプロフィール画像`}
            width={64}
            height={64}
            className="w-16 h-16 rounded-full border border-gray-200 dark:border-gray-700"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <Link
              href="/about"
              className="text-base font-bold text-gray-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400"
            >
              {AUTHOR.name}
            </Link>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {AUTHOR.jobTitle}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {AUTHOR.bio}
          </p>
          {(published || updated || lastReviewed) && (
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-x-4 gap-y-1">
              {published && <span>公開日: {published}</span>}
              {updated && updated !== published && <span>最終更新: {updated}</span>}
              {lastReviewed &&
                lastReviewed !== published &&
                lastReviewed !== updated && (
                  <span>最終レビュー: {lastReviewed}</span>
                )}
            </div>
          )}
          <Link
            href="/about"
            className="mt-3 inline-block text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            運営者・編集方針について →
          </Link>
        </div>
      </div>
    </aside>
  );
}
