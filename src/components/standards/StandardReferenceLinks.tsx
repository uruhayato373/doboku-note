import { ButtonLink } from '@/components/ui/Button/Button';
import Arrow from '@/components/ui/Arrow/Arrow';
import { standardDocumentPath, type StandardDocument } from '@/lib/standards';

/** 本文が言及している基準のうち、全文ライブラリに収録済みのものへ案内する */
export default function StandardReferenceLinks({ documents }: { documents: StandardDocument[] }) {
  if (documents.length === 0) return null;

  return (
    <aside className="mt-8 border-y border-(--rule-soft) py-5" aria-labelledby="standard-referenced-documents">
      <h2 id="standard-referenced-documents" className="text-lg font-bold text-(--ink)">
        この章が参照する基準
      </h2>
      <ul className="mt-3 space-y-2">
        {documents.map((document) => (
          <li key={`${document.agencyId}/${document.documentId}`}>
            <ButtonLink href={standardDocumentPath(document)} variant="text">
              {document.agencyName}「{document.title}」<Arrow />
            </ButtonLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}
