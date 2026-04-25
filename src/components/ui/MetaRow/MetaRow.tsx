import Link from "next/link";

interface MetaRowProps {
  tags?: string[] | undefined;
  readMinutes?: number | undefined;
  publishedAt?: string | undefined;
  updatedAt?: string | undefined;
  category?: string | undefined;
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function MetaRow({
  tags,
  readMinutes,
  publishedAt,
  updatedAt,
  category,
}: MetaRowProps) {
  const updated = formatDate(updatedAt);
  const published = formatDate(publishedAt);
  const dateLabel = updated || published;
  const datePrefix = updated ? "更新" : "公開";

  const visibleTags = tags?.filter((t) => t && !["primary", "secondary", "past-questions", "guide", "textbook", "keyword"].includes(t)) ?? [];

  if (visibleTags.length === 0 && !readMinutes && !dateLabel) return null;

  return (
    <div className="mt-8 pt-4 border-t border-[var(--rule-soft)] flex items-center gap-3 flex-wrap">
      {visibleTags.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {visibleTags.map((tag) => (
            <Link
              key={tag}
              href={category ? `/category/${category}?tag=${encodeURIComponent(tag)}` : `/search?q=${encodeURIComponent(tag)}`}
              className="font-mono text-[11px] text-[var(--accent)] bg-[var(--accent-fill)] hover:bg-[var(--accent)] hover:text-white px-2.5 py-0.5 rounded-full transition-colors"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}
      <div className="ml-auto flex items-center gap-3 font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
        {readMinutes && <span>読了 約 {readMinutes} 分</span>}
        {dateLabel && readMinutes && <span aria-hidden>·</span>}
        {dateLabel && <span>{datePrefix} {dateLabel}</span>}
      </div>
    </div>
  );
}
