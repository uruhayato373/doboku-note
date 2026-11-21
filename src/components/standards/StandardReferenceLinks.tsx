import { ButtonLink } from '@/components/ui/Button/Button';
import Arrow from '@/components/ui/Arrow/Arrow';
import { standardDocumentPath, type StandardDocument } from '@/lib/standards';
import StandardAside from './StandardAside';

/** 本文が言及している基準のうち、全文ライブラリに収録済みのものへ案内する */
export default function StandardReferenceLinks({ documents }: { documents: StandardDocument[] }) {
  if (documents.length === 0) return null;

  return (
    <StandardAside id="standard-referenced-documents" title="この章が参照する基準">
      <ul className="mt-3 space-y-2">
        {documents.map((document) => (
          <li key={`${document.agencyId}/${document.documentId}`}>
            <ButtonLink href={standardDocumentPath(document)} variant="text">
              {document.agencyName}「{document.title}」<Arrow />
            </ButtonLink>
          </li>
        ))}
      </ul>
    </StandardAside>
  );
}
