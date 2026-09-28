import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHead } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
      <p className="mb-4 flex items-center gap-2">
        <Link href="/content/kindle">← Kindle</Link>
        <Badge variant="outline">{v.status}</Badge>
        {v.pages && <span className="text-xs text-muted-foreground">{v.pages.length} ページ・{v.generatedAt?.slice(0, 16).replace('T', ' ')}</span>}
      </p>

      {v.matchesEpub === false && (
        <Card className="mb-4 py-3">
          <CardContent className="px-3 text-sm text-(--warn)">EPUB が更新されています。再生成: <code>{command}</code></CardContent>
        </Card>
      )}
      {!v.pages && (
        <Card className="mb-4 py-3">
          <CardContent className="px-3 text-sm">プレビュー未生成: <code>{command}</code></CardContent>
        </Card>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
        {v.coverUrl && (
          <figure className="m-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.coverUrl} alt="表紙" className="w-full border" />
            <figcaption className="text-xs text-muted-foreground">表紙</figcaption>
          </figure>
        )}
        {v.pages?.map((p, i) => (
          <figure key={p.url} className="m-0">
            <a href={p.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`${i + 1} ページ`} loading="lazy" className="w-full border" />
            </a>
            <figcaption className="text-xs text-muted-foreground">{i + 1}・{p.item.split('/').pop()}</figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
