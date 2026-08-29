import Link from 'next/link';
import type { StandardDocument } from '@/lib/standards';
import { standardDocumentPath } from '@/lib/standards';

export default function StandardDocumentCard({ document }: { document: StandardDocument }) {
  return (
    <Link
      href={standardDocumentPath(document)}
      className="focus-ring card-interactive block border border-[var(--rule-soft)] bg-[var(--paper)] p-5 transition-[border-color,box-shadow] hover:border-[var(--accent)]"
    >
      <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--ink-muted)]">
        <span>{document.role === 'common' ? 'COMMON SPEC' : 'COMPANION'}</span>
        <span aria-hidden>·</span>
        <span>{document.pages.toLocaleString('ja-JP')}ページ</span>
        {document.unreadableRanges.length > 0 && (
          <span className="text-[var(--color-warn)]">原本画質注記 {document.unreadableRanges.length}</span>
        )}
      </div>
      <h3 className="mt-2 font-serif text-lg font-bold leading-[1.55] text-[var(--ink)]">
        {document.title}
      </h3>
      <p className="mt-2 text-[13px] leading-[1.75] text-[var(--ink-muted)]">
        全{document.partCount}分冊・文字化け置換文字 {document.replacementCharacters}件
      </p>
    </Link>
  );
}
