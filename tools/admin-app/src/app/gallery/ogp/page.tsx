import Link from 'next/link';
import Thumb from '@/components/Thumb';
import { PageHead } from '@/components/ui';
import { GROUP_LABEL, scanOgp } from '@/lib/gallery';

export const dynamic = 'force-dynamic';

export default async function OgpGallery({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; group?: string }>;
}) {
  const sp = await searchParams;
  const { items, catLabel } = scanOgp();

  const cats = [...new Set(items.map((i) => i.category))].sort();
  const activeCat = cats.includes(sp.cat ?? '') ? sp.cat! : 'all';
  const activeGroup = sp.group && GROUP_LABEL[sp.group] ? sp.group : 'all';

  const filtered = items.filter(
    (i) => (activeCat === 'all' || i.category === activeCat) && (activeGroup === 'all' || i.group === activeGroup),
  );

  const link = (cat: string, group: string) => {
    const q = new URLSearchParams();
    if (cat !== 'all') q.set('cat', cat);
    if (group !== 'all') q.set('group', group);
    const s = q.toString();
    return '/gallery/ogp' + (s ? `?${s}` : '');
  };

  return (
    <>
      <PageHead title="OGP ギャラリー" sub={`${items.length} 枚 · .local/r2/posts/**/ogp.png（表示中 ${filtered.length}）`} />

      <div className="filterbar">
        <Link href={link('all', activeGroup)} className={'chip' + (activeCat === 'all' ? ' active' : '')}>
          全資格
        </Link>
        {cats.map((c) => (
          <Link key={c} href={link(c, activeGroup)} className={'chip' + (activeCat === c ? ' active' : '')}>
            {catLabel[c] ?? c}
          </Link>
        ))}
      </div>
      <div className="filterbar">
        <Link href={link(activeCat, 'all')} className={'chip' + (activeGroup === 'all' ? ' active' : '')}>
          全分類
        </Link>
        {Object.entries(GROUP_LABEL).map(([g, label]) => (
          <Link key={g} href={link(activeCat, g)} className={'chip' + (activeGroup === g ? ' active' : '')}>
            {label}
          </Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty">該当なし</div>
      ) : (
        <div className="gallery">
          {filtered.map((i) => (
            <Thumb key={i.rel} url={i.url} name={i.rel.replace(/\/ogp\.png$/, '')}>
              <span className="badge neutral">{catLabel[i.category] ?? i.category}</span>
              <span className="badge accent">{GROUP_LABEL[i.group] ?? i.group}</span>
            </Thumb>
          ))}
        </div>
      )}
    </>
  );
}
