import Link from 'next/link';
import Thumb from '@/components/Thumb';
import { PageHead } from '@/components/ui';
import { scanFigures } from '@/lib/gallery';

export const dynamic = 'force-dynamic';

export default async function FiguresGallery({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; kind?: string }>;
}) {
  const sp = await searchParams;
  const { items } = scanFigures();

  const cats = [...new Set(items.map((i) => i.category))].sort();
  const activeCat = cats.includes(sp.cat ?? '') ? sp.cat! : 'all';
  const activeKind = sp.kind === 'svg' || sp.kind === 'raster' ? sp.kind : 'all';

  const filtered = items.filter(
    (i) => (activeCat === 'all' || i.category === activeCat) && (activeKind === 'all' || i.kind === activeKind),
  );

  const link = (cat: string, kind: string) => {
    const q = new URLSearchParams();
    if (cat !== 'all') q.set('cat', cat);
    if (kind !== 'all') q.set('kind', kind);
    const s = q.toString();
    return '/gallery/figures' + (s ? `?${s}` : '');
  };

  return (
    <>
      <PageHead
        title="記事図版ギャラリー"
        sub={`${items.length} 枚 · .local/r2/posts/**/img/*（表示中 ${filtered.length}）`}
      />

      <div className="filterbar">
        <Link href={link('all', activeKind)} className={'chip' + (activeCat === 'all' ? ' active' : '')}>
          全資格
        </Link>
        {cats.map((c) => (
          <Link key={c} href={link(c, activeKind)} className={'chip' + (activeCat === c ? ' active' : '')}>
            {c}
          </Link>
        ))}
      </div>
      <div className="filterbar">
        {['all', 'svg', 'raster'].map((k) => (
          <Link key={k} href={link(activeCat, k)} className={'chip' + (activeKind === k ? ' active' : '')}>
            {k === 'all' ? '全種別' : k === 'svg' ? 'SVG図版' : 'ラスタ図'}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">該当なし</div>
      ) : (
        <div className="gallery small">
          {filtered.map((i) => (
            <Thumb key={i.rel} url={i.url} name={i.name}>
              <span className="badge neutral">{i.category}</span>
              <span className={'badge ' + (i.kind === 'svg' ? 'accent' : 'neutral')}>{i.kind}</span>
            </Thumb>
          ))}
        </div>
      )}
    </>
  );
}
