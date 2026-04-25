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
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--accent)] hover:underline"
      >
        <span>Back to home</span>
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
