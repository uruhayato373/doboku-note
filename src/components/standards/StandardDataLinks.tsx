import Link from 'next/link';
import type { StandardChapter } from '@/lib/standards-articles';
import type { StandardDocument } from '@/lib/standards';
import {
  standardsDataPath,
  standardsDocumentDataPath,
} from '@/lib/standards-structured-data';

type Props = {
  document: StandardDocument;
  chapter?: StandardChapter;
};

const linkClass = 'focus-ring inline-flex min-h-11 items-center text-[13px] font-bold text-(--accent) hover:underline';

export default function StandardDataLinks({ document, chapter }: Props) {
  const downloads = chapter
    ? [
        { label: 'Markdown', key: 'chapter-markdown', href: standardsDataPath(document, chapter, 'md') },
        { label: 'JSON-LD', key: 'chapter-jsonld', href: standardsDataPath(document, chapter, 'jsonld') },
      ]
    : [
        { label: '文書索引 JSON', key: 'document-index-json', href: standardsDocumentDataPath(document, 'json') },
        { label: '文書 JSON-LD', key: 'document-jsonld', href: standardsDocumentDataPath(document, 'jsonld') },
      ];

  return (
    <nav aria-label="機械可読データ" className="mt-6 flex flex-wrap items-center gap-x-5 border-t border-(--rule-soft)">
      <span className="text-[13px] text-(--ink-muted)">データ</span>
      {downloads.map((download) => (
        <a
          key={download.href}
          href={download.href}
          download
          data-cta="standards-data"
          data-cta-label={download.key}
          data-cta-placement={chapter ? 'standards-chapter' : 'standards-document'}
          className={linkClass}
        >
          {download.label}
        </a>
      ))}
      <Link href="/standards/data" className={linkClass}>仕様・利用条件</Link>
    </nav>
  );
}
