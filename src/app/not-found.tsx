import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 bg-[var(--bg)]">
      <div className="font-mono text-[11px] uppercase tracking-widest text-[var(--ink-muted)] mb-2">404 — Not Found</div>
      <h1 className="font-serif font-black text-[var(--ink)] text-6xl sm:text-7xl tracking-tight">404</h1>
      <h2 className="mt-4 font-serif text-xl font-bold text-[var(--ink-body)]">
        ページが見つかりません
      </h2>
      <p className="text-[var(--ink-muted)] mt-2 text-sm">
        お探しのページは移動または削除された可能性があります。
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/search"
          className="inline-flex items-center gap-2 rounded-card-inline border border-[var(--rule-soft)] px-4 py-2 text-sm font-bold text-[var(--ink-body)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          記事を検索
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-card-inline bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-opacity"
        >
          <span>ホーム（資格一覧）へ</span>
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
