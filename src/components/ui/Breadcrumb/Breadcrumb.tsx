import Link from 'next/link';

export interface Crumb {
  readonly label: string;
  readonly href?: string | undefined;
}

/**
 * パンくず（見た目だけ。構造化データの BreadcrumbList は StructuredData が別に出す）。
 * 2026-11-17 に PageHeader・ArticleHeader・StandardsArticleHeader・CategoryPage の 4 実装をまとめた。区切りは «›»、最後の段（リンクなし）は 1 行で切る。
 */
export default function Breadcrumb({ items, className = 'mb-3' }: { readonly items: readonly Crumb[]; readonly className?: string }) {
  return (
    <nav aria-label="breadcrumb" className={`flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] uppercase tracking-widest text-(--ink-muted) ${className}`}>
      {items.map((c, i) => (
        <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-2">
          {i > 0 && <span aria-hidden="true" className="opacity-60">›</span>}
          {c.href
            ? <Link href={c.href} className="focus-ring transition-colors hover:text-(--accent)">{c.label}</Link>
            : <span className="truncate">{c.label}</span>}
        </span>
      ))}
    </nav>
  );
}
