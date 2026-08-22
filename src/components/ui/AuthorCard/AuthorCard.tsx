import Link from "next/link";
import { AUTHOR } from "@/config/author";
import MetaCard from "@/components/ui/MetaCard/MetaCard";

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
    <MetaCard as="aside" ariaLabel="執筆者情報" className="mt-10">
      <h2 className="text-lg font-bold text-[var(--ink)] mb-4">執筆者</h2>
      <div className="flex items-start gap-4">
        <Link href="/about" className="shrink-0">
          <img
            src={AUTHOR.imageUrl}
            alt={`${AUTHOR.name}のプロフィール画像`}
            width={64}
            height={64}
            className="w-16 h-16 rounded-full border border-[var(--rule-soft)]"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href="/about"
            className="text-base font-bold text-[var(--ink)] hover:text-[var(--accent)]"
          >
            {AUTHOR.name}
          </Link>
          <p className="mt-2 text-sm text-[var(--ink-body)] leading-relaxed">
            {AUTHOR.tagline}
          </p>
          <div className="mt-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--ink-muted)] mb-1">
              保有資格
            </div>
            <p className="text-xs text-[var(--ink-body)] leading-relaxed">
              {AUTHOR.qualifications.join("・")}
            </p>
          </div>
          {(published || updated || lastReviewed) && (
            <div className="mt-3 text-xs text-[var(--ink-muted)] flex flex-wrap gap-x-4 gap-y-1">
              {published && <span>公開日: {published}</span>}
              {updated && updated !== published && <span>最終更新: {updated}</span>}
              {lastReviewed &&
                lastReviewed !== published &&
                lastReviewed !== updated && (
                  <span>最終レビュー: {lastReviewed}</span>
                )}
            </div>
          )}
          <a
            href={AUTHOR.noteCta.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-md bg-[var(--accent)] text-white text-sm font-bold shadow-sm hover:bg-[var(--accent)] transition-colors"
          >
            {AUTHOR.noteCta.label}
          </a>
          <Link
            href="/about"
            className="mt-2 block text-xs text-[var(--ink-muted)] hover:text-[var(--accent)] hover:underline"
          >
            運営者・編集方針について →
          </Link>
        </div>
      </div>
    </MetaCard>
  );
}
