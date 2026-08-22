import Link from 'next/link';
import Thumb from '@/components/Thumb';
import { PageHead } from '@/components/ui';
import { scanSnsPacks } from '@/lib/gallery';

export const dynamic = 'force-dynamic';

export default async function SnsGallery({
  searchParams,
}: {
  searchParams: Promise<{ ch?: string }>;
}) {
  const sp = await searchParams;
  const { packs } = scanSnsPacks();

  const activeCh = sp.ch === 'instagram' || sp.ch === 'x' ? sp.ch : 'all';
  const filtered = packs.filter((p) => activeCh === 'all' || p.channel === activeCh);
  const totalImages = filtered.reduce((s, p) => s + p.images.length, 0);

  const link = (ch: string) => '/gallery/sns' + (ch === 'all' ? '' : `?ch=${ch}`);

  return (
    <>
      <PageHead
        title="SNS パックギャラリー"
        sub={`${packs.length} パック · content/sns/instagram, x/draft（表示中 ${filtered.length} パック / ${totalImages} 点）`}
      />

      <div className="filterbar">
        {['all', 'instagram', 'x'].map((c) => (
          <Link key={c} href={link(c)} className={'chip' + (activeCh === c ? ' active' : '')}>
            {c === 'all' ? '全チャネル' : c === 'instagram' ? 'Instagram' : 'X'}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">該当なし</div>
      ) : (
        filtered.map((p) => (
          <div className="card" key={p.rel}>
            <h2>
              {p.label}
              <span className="sub">
                <span className={'badge ' + (p.channel === 'instagram' ? 'accent' : 'neutral')}>{p.channel}</span>{' '}
                {p.images.length} 点 · {p.rel}
              </span>
            </h2>
            <div className="gallery small">
              {p.images.slice(0, 24).map((img) => (
                <Thumb key={img.url || img.name} url={img.url} name={img.name} video={img.video} offloaded={img.state === 'offloaded'} bucket={img.bucket} />
              ))}
            </div>
            {p.images.length > 24 ? <p className="muted small">他 {p.images.length - 24} 点…</p> : null}
          </div>
        ))
      )}
    </>
  );
}
