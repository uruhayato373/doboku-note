import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHead } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { loadKindlePreview } from '@/lib/kindle';

export const dynamic = 'force-dynamic';

/**
 * /content/kindle/<id> — 提出前の目視確認用に、表紙と EPUB のページ画像を並べる。
 * 画像は node scripts/render-kindle-preview.mjs --id <id> が .tmp/kindle-preview/<id>/ に出す。
 */
export default async function KindlePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = loadKindlePreview(decodeURIComponent(id));
  if (!v) notFound();
  const command = `node scripts/render-kindle-preview.mjs --id ${v.id}`;

  return (
    <>
      <PageHead title={v.title} sub={v.id} />
      <p style={{ marginBottom: 16 }}>
        <Link href="/content/kindle">← Kindle</Link> <Badge variant="outline">{v.status}</Badge>{' '}
        {v.pages && <span className="small muted">{v.pages.length} ページ・{v.generatedAt?.slice(0, 16).replace('T', ' ')}</span>}
      </p>

      {v.matchesEpub === false && (
        <div className="card">
          <p className="small project-warning-text">EPUB が更新されています。再生成: <code>{command}</code></p>
        </div>
      )}
      {!v.pages && (
        <div className="card">
          <p className="small">プレビュー未生成: <code>{command}</code></p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
        {v.coverUrl && (
          <figure style={{ margin: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.coverUrl} alt="表紙" className="w-full border" />
            <figcaption className="small muted">表紙</figcaption>
          </figure>
        )}
        {v.pages?.map((p, i) => (
          <figure key={p.url} style={{ margin: 0 }}>
            <a href={p.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`${i + 1} ページ`} loading="lazy" className="w-full border" />
            </a>
            <figcaption className="small muted">{i + 1}・{p.item.split('/').pop()}</figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
