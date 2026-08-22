import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHead } from '@/components/ui';
import { listDirectory, loadDocument } from '@/lib/document-store';
import { rootById, sourceByPrefix } from '@/lib/document-roots';

export const dynamic = 'force-dynamic';

/**
 * /content の第 2 段以降。`{filePrefix}~{相対パス}` で「どのルートの」「どこ」かを持つ。
 *
 * ディレクトリならメタデータだけを列挙し、**バイナリを本文として読まない**。
 * 文書（許可拡張子）のときだけ document-store で読み、root 外は prefix + realpath で弾く。
 */
export default async function ContentDetailPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const head = decodeURIComponent(path[0] ?? '');
  const [prefix, firstSeg] = head.split('~');
  const d = rootById('content')!;
  const src = prefix ? sourceByPrefix(d, prefix) : null;
  if (!src) notFound();

  const rel = [firstSeg, ...path.slice(1).map((s) => decodeURIComponent(s))].filter(Boolean).join('/');
  const listing = listDirectory(src, rel);

  if (listing) {
    const hrefFor = (name: string) =>
      `/content/${encodeURIComponent(head)}/${[...path.slice(1), encodeURIComponent(name)].join('/')}`;
    return (
      <>
        <PageHead title={rel || prefix} sub={`${prefix}/${rel}（read-only・メタデータ表示）`} />
        <nav className="project-crumbs" aria-label="パンくず">
          <Link href="/content">コンテンツ</Link>
        </nav>
        <div className="card">
          <ul className="content-listing">
            {listing.dirs.map((name) => (
              <li key={name}><Link href={hrefFor(name)}>{name}/</Link></li>
            ))}
            {listing.files.map((f) => (
              <li key={f.name}>
                {f.isDoc ? (
                  <Link href={hrefFor(f.name.replace(/\.md$/, ''))}>{f.name}</Link>
                ) : (
                  <span className="muted">{f.name}</span>
                )}
                <span className="muted"> · {Math.max(1, Math.round(f.size / 1024))} KB</span>
              </li>
            ))}
          </ul>
          {listing.dirs.length === 0 && listing.files.length === 0 && <p className="muted">空のディレクトリです。</p>}
        </div>
      </>
    );
  }

  const document = loadDocument(src, rel.split('/'));
  if (!document) notFound();
  return (
    <>
      <div className="knowledge-detail-head">
        <div>
          <nav className="project-crumbs" aria-label="パンくず">
            <Link href="/content">コンテンツ</Link>
          </nav>
          <h1>{document.title}</h1>
          <code>{document.file}</code>
        </div>
      </div>
      <article className="knowledge-document">
        <div dangerouslySetInnerHTML={{ __html: document.html }} />
      </article>
    </>
  );
}
