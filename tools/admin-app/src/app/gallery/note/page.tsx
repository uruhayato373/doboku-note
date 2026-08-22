import Link from 'next/link';
import Thumb from '@/components/Thumb';
import { PageHead } from '@/components/ui';
import { scanNoteImages } from '@/lib/gallery';

export const dynamic = 'force-dynamic';

export default async function NoteGallery({
  searchParams,
}: {
  searchParams: Promise<{ seg?: string; kind?: string }>;
}) {
  const sp = await searchParams;
  const { items, segs } = scanNoteImages();

  const activeSeg = segs.includes(sp.seg ?? '') ? sp.seg! : 'all';
  const activeKind = sp.kind === 'cover' || sp.kind === 'figure' ? sp.kind : 'all';

  const filtered = items.filter(
    (i) => (activeSeg === 'all' || i.seg === activeSeg) && (activeKind === 'all' || i.kind === activeKind),
  );

  const link = (seg: string, kind: string) => {
    const q = new URLSearchParams();
    if (seg !== 'all') q.set('seg', seg);
    if (kind !== 'all') q.set('kind', kind);
    const s = q.toString();
    return '/gallery/note' + (s ? `?${s}` : '');
  };

  return (
    <>
      <PageHead
        title="note 画像ギャラリー"
        sub={`${items.length} 枚 · content/note/**/img/{cover*,figure-*}（表示中 ${filtered.length}）`}
      />

      <div className="filterbar">
        <Link href={link('all', activeKind)} className={'chip' + (activeSeg === 'all' ? ' active' : '')}>
          全ディレクトリ
        </Link>
        {segs.map((s) => (
          <Link key={s} href={link(s, activeKind)} className={'chip' + (activeSeg === s ? ' active' : '')}>
            {s}
          </Link>
        ))}
      </div>
      <div className="filterbar">
        {['all', 'cover', 'figure'].map((k) => (
          <Link key={k} href={link(activeSeg, k)} className={'chip' + (activeKind === k ? ' active' : '')}>
            {k === 'all' ? '全種別' : k === 'cover' ? 'カバー' : '図版'}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">該当なし</div>
      ) : (
        <div className="gallery">
          {filtered.map((i) => (
            <Thumb key={i.rel} url={i.url} name={i.name} tall={i.kind === 'cover'} offloaded={i.state === 'offloaded'} bucket={i.bucket}>
              <span className="badge neutral">{i.seg}</span>
              <span className={'badge ' + (i.kind === 'cover' ? 'accent' : 'neutral')}>{i.kind}</span>
            </Thumb>
          ))}
        </div>
      )}
    </>
  );
}
