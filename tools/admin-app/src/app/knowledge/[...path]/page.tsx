import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadKnowledgeDocument } from '@/lib/knowledge';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ path: string[] }> };

export default async function KnowledgeDetailPage({ params }: Props) {
  const { path } = await params;
  const document = loadKnowledgeDocument(path);
  if (!document) notFound();

  return (
    <>
      <div className="knowledge-detail-head">
        <div>
          <Link href="/knowledge">← ナレッジ一覧</Link>
          <h1>{document.title}</h1>
          <code>{document.file}</code>
        </div>
      </div>
      <article className="knowledge-document">
        {document.json ? (
          <pre>
            <code>{document.json}</code>
          </pre>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: document.html }} />
        )}
      </article>
    </>
  );
}
