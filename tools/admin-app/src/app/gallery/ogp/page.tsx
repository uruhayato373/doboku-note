import { StatusBadge, FilterBar, FilterChip } from '@/components/admin';
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
      <PageHead title="OGP ギャラリー" sub={`${items.length} 枚（表示中 ${filtered.length}）`} />

      <FilterBar>
        <FilterChip href={link('all', activeGroup)} active={activeCat === 'all'}>
          全資格
        </FilterChip>
        {cats.map((c) => (
          <FilterChip key={c} href={link(c, activeGroup)} active={activeCat === c}>
            {catLabel[c] ?? c}
          </FilterChip>
        ))}
      </FilterBar>
      <FilterBar>
        <FilterChip href={link(activeCat, 'all')} active={activeGroup === 'all'}>
          全分類
        </FilterChip>
        {Object.entries(GROUP_LABEL).map(([g, label]) => (
          <FilterChip key={g} href={link(activeCat, g)} active={activeGroup === g}>
            {label}
          </FilterChip>
        ))}
      </FilterBar>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">該当なし</p>
      ) : (
        <div className="gallery">
          {filtered.map((i) => (
            <Thumb key={i.rel} url={i.url} name={i.rel.replace(/\/ogp\.png$/, '')}>
              <StatusBadge tone="neutral">{catLabel[i.category] ?? i.category}</StatusBadge>
              <StatusBadge tone="info">{GROUP_LABEL[i.group] ?? i.group}</StatusBadge>
            </Thumb>
          ))}
        </div>
      )}
    </>
  );
}
