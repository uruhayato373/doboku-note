import Link from 'next/link';
import Thumb from '@/components/Thumb';
import { PageHead } from '@/components/ui';
import { scanFigures } from '@/lib/gallery';

export const dynamic = 'force-dynamic';

/** 記事図版の目視確認用ギャラリー。品質の判定・進捗は機械（audit-figures）側で持ち、ここには出さない。 */
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

  const link = (patch: Partial<{ cat: string; kind: string }>) => {
    const cat = patch.cat ?? activeCat;
    const kind = patch.kind ?? activeKind;
    const q = new URLSearchParams();
    if (cat !== 'all') q.set('cat', cat);
    if (kind !== 'all') q.set('kind', kind);
    const s = q.toString();
    return '/gallery/figures' + (s ? `?${s}` : '');
  };

  return (
    <>
      <PageHead title="記事図版" sub={`${filtered.length} 枚`} />

      <div className="filterbar">
        <Link href={link({ cat: 'all' })} className={'chip' + (activeCat === 'all' ? ' active' : '')}>
          全資格
        </Link>
        {cats.map((c) => (
          <Link key={c} href={link({ cat: c })} className={'chip' + (activeCat === c ? ' active' : '')}>
            {c}
          </Link>
        ))}
      </div>

      <div className="filterbar">
        {['all', 'svg', 'raster'].map((k) => (
          <Link key={k} href={link({ kind: k })} className={'chip' + (activeKind === k ? ' active' : '')}>
            {k === 'all' ? '全種別' : k === 'svg' ? 'SVG' : '画像'}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">該当なし</p>
      ) : (
        <div className="gallery small">
          {filtered.map((i) => (
            <Thumb key={i.rel} url={i.url} name={i.name} href={i.url} paper />
          ))}
        </div>
      )}
    </>
  );
}
