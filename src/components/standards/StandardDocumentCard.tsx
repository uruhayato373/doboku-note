import Link from 'next/link';
import LinkTile from '@/components/ui/LinkTile/LinkTile';
import type { StandardDocument } from '@/lib/standards';
import { standardDocumentPath } from '@/lib/standards';

export default function StandardDocumentCard({
  document,
  variant = 'card',
  chapterCount = 0,
}: {
  document: StandardDocument;
  variant?: 'card' | 'row';
  chapterCount?: number;
}) {
  const meta = [
    variant === 'card' ? document.agencyName : null,
    document.edition || null,
    chapterCount > 0 ? `${chapterCount}章` : `${document.pages.toLocaleString('ja-JP')}頁`,
  ].filter(Boolean).join(' · ');
  if (variant === 'card') {
    return (
      <LinkTile
        href={standardDocumentPath(document)}
        title={document.title}
        meta={meta}
        headingLevel="h3"
        data={{ 'data-cta': 'nav', 'data-cta-label': 'standards-document' }}
      />
    );
  }
  return (
    <Link
      href={standardDocumentPath(document)}
      data-cta="nav"
      data-cta-label="standards-document"
      className="focus-ring block border-b border-(--rule-soft) py-2.5 transition-colors hover:bg-(--accent-fill)"
    >
      <h3 className="text-[15px] font-bold leading-[1.5] text-(--ink)">{document.title}</h3>
      <p className="mt-0.5 text-[12px] leading-[1.6] text-(--ink-muted)">{meta}</p>
    </Link>
  );
}
