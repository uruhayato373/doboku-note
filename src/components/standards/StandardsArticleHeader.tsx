import Link from 'next/link';

type StandardsCrumb = {
  label: string;
  href?: string;
};

type StandardsArticleHeaderProps = {
  breadcrumb: StandardsCrumb[];
  label: string;
  title: string;
  lead?: string;
  meta?: string;
};

/**
 * 基準類の章記事・逐語文字起こしで使う記事内ヘッダー。
 * 通常記事の ArticleHeader と同じ文字組み・読み始め位置へ揃えつつ、
 * 発行機関・原本ページ等の資料固有メタデータを保持する。
 */
export default function StandardsArticleHeader({
  breadcrumb,
  label,
  title,
  lead,
  meta,
}: StandardsArticleHeaderProps) {
  return (
    <header className="border-b border-[var(--rule-soft)] pb-6">
      <nav
        aria-label="breadcrumb"
        className="mb-4 flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-wide text-[var(--ink-muted)]"
      >
        {breadcrumb.map((crumb, index) => (
          <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-2">
            {index > 0 && <span aria-hidden="true" className="opacity-60">›</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="focus-ring hover:text-[var(--accent)]">
                {crumb.label}
              </Link>
            ) : (
              <span className="truncate">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="mb-1 text-[11px] font-bold tracking-[0.06em] text-[var(--accent)]">
        {label}
      </div>
      <h1
        className="m-0 text-balance font-sans text-[26px] font-bold leading-[1.4] tracking-[0.02em] text-[var(--ink)] [word-break:auto-phrase] sm:text-[28px]"
        style={{ fontFeatureSettings: '"palt" 1' }}
      >
        {title}
      </h1>
      {lead && (
        <p className="mt-3 max-w-[62ch] text-[15px] leading-[1.85] text-[var(--ink-body)]">
          {lead}
        </p>
      )}
      {meta && (
        <div className={`${lead ? 'mt-3' : 'mt-2'} font-mono text-[11px] leading-5 text-[var(--ink-muted)]`}>
          {meta}
        </div>
      )}
    </header>
  );
}
