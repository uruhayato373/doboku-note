import { notFound } from 'next/navigation';
import { standardTreeToc, treeNavDocumentKeys, usesTreeNav } from '@/lib/standards-tree-nav';

type Params = { agency: string; document: string };

// 静的書き出しで JSON ファイルとして出す（out/standards/{agency}/{document}/toc.json）。
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams(): Params[] {
  return treeNavDocumentKeys();
}

/** 右の目次で、表示中でない章を開いたときに読む節の一覧。 */
export async function GET(_request: Request, { params }: { params: Promise<Params> }) {
  const { agency, document } = await params;
  const entry = { agencyId: agency, documentId: document };
  if (!usesTreeNav(entry)) notFound();
  return Response.json(standardTreeToc(entry));
}
