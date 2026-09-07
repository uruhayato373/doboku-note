import Link from 'next/link';
import { Braces, Download } from 'lucide-react';
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
    <aside
      aria-label="機械可読データ"
      className="mt-6 border-l-4 border-[var(--accent)] bg-[var(--accent-fill)] px-4 py-4"
    >
      <div className="flex items-start gap-3">
        <Braces aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-[var(--ink)]">機械可読データ</h2>
          <p className="mt-1 text-[13px] leading-[1.7] text-[var(--ink-body)]">
            出典・原本ハッシュ・編章節条の階層を保持した加工データを利用できます。
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {downloads.map((download) => (
              <a
                key={download.href}
                href={download.href}
                download
                data-cta="standards-data"
                data-cta-label={download.key}
                data-cta-placement={chapter ? 'standards-chapter' : 'standards-document'}
                className="focus-ring inline-flex min-h-11 items-center gap-1.5 text-[13px] font-bold text-[var(--accent)] hover:underline"
              >
                <Download aria-hidden="true" className="h-4 w-4" />
                {download.label}
              </a>
            ))}
            <Link
              href="/standards/data"
              className="focus-ring inline-flex min-h-11 items-center text-[13px] font-bold text-[var(--accent)] hover:underline"
            >
              データ仕様・利用条件 →
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
