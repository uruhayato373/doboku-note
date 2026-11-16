import LinkRow from '@/components/ui/LinkRow/LinkRow';
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
    <LinkRow
      href={standardDocumentPath(document)}
      title={document.title}
      description={meta}
      headingLevel="h3"
      tone="ink"
      data={{ 'data-cta': 'nav', 'data-cta-label': 'standards-document' }}
    />
  );
}
