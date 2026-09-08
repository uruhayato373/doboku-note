import Link from 'next/link';
import type { StandardDocument } from '@/lib/standards';
import { standardDocumentPath } from '@/lib/standards';

export default function StandardDocumentCard({ document, variant = 'card' }: { document: StandardDocument; variant?: 'card' | 'row' }) {
  return (
    <Link
      href={standardDocumentPath(document)}
      className={variant === 'row'
        ? 'focus-ring block border-b border-[var(--rule-soft)] py-4 transition-colors hover:bg-[var(--accent-fill)]'
        : 'focus-ring card-interactive block border border-[var(--rule-soft)] bg-[var(--paper)] p-5 transition-[border-color,box-shadow] hover:border-[var(--accent)]'}
    >
      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)]">
        <span>{document.role === 'common' ? '共通仕様書' : '必携・参考資料'}</span>
        <span aria-hidden>·</span>
        <span>{document.edition || '年度は詳細で確認'}</span>

      </div>
      <h3 className="mt-2 text-lg font-bold leading-[1.55] text-[var(--ink)]">
        {document.title}
      </h3>
      <p className="mt-2 text-[13px] leading-[1.75] text-[var(--ink-muted)]">
        {variant === 'card' && `${document.agencyName} · `}{document.pages.toLocaleString('ja-JP')}ページ <span aria-hidden="true">→</span>
      </p>
    </Link>
  );
}
