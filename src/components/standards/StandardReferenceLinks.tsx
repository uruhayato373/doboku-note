import Link from 'next/link';
import { standardDocumentPath, type StandardDocument } from '@/lib/standards';

/** 本文が言及している基準のうち、全文ライブラリに収録済みのものへ案内する */
export default function StandardReferenceLinks({ documents }: { documents: StandardDocument[] }) {
  if (documents.length === 0) return null;

  return (
    <aside className="mt-8 border-y border-(--rule-soft) py-5" aria-labelledby="standard-referenced-documents">
      <h2 id="standard-referenced-documents" className="text-lg font-bold text-(--ink)">
        この章が参照する基準
      </h2>
      <p className="mt-1 text-[13px] leading-[1.7] text-(--ink-muted)">
        本文で言及している基準の全文文字起こしです。規格値・測定基準は原典PDFのページと照らして確認できます。
      </p>
      <ul className="mt-3 space-y-2">
        {documents.map((document) => (
          <li key={`${document.agencyId}/${document.documentId}`}>
            <Link
              href={standardDocumentPath(document)}
              className="focus-ring inline-flex min-h-11 items-center text-[14px] font-bold text-(--accent) hover:underline"
            >
              {document.agencyName}「{document.title}」→
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
