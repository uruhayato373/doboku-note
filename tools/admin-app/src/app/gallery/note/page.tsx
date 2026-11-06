import { StatusBadge, FilterBar, FilterChip } from '@/components/admin';
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
        sub={`${items.length} 枚（表示中 ${filtered.length}）`}
      />

      <FilterBar>
        <FilterChip href={link('all', activeKind)} active={activeSeg === 'all'}>
          全ディレクトリ
        </FilterChip>
        {segs.map((s) => (
          <FilterChip key={s} href={link(s, activeKind)} active={activeSeg === s}>
            {s}
          </FilterChip>
        ))}
      </FilterBar>
      <FilterBar>
        {['all', 'cover', 'figure'].map((k) => (
          <FilterChip key={k} href={link(activeSeg, k)} active={activeKind === k}>
            {k === 'all' ? '全種別' : k === 'cover' ? 'カバー' : '図版'}
          </FilterChip>
        ))}
      </FilterBar>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">該当なし</p>
      ) : (
        <div className="gallery">
          {filtered.map((i) => (
            <Thumb key={i.rel} url={i.url} name={i.name} tall={i.kind === 'cover'} offloaded={i.state === 'offloaded'} bucket={i.bucket}>
              <StatusBadge tone="neutral">{i.seg}</StatusBadge>
              <StatusBadge tone={i.kind === 'cover' ? 'info' : 'neutral'}>{i.kind}</StatusBadge>
            </Thumb>
          ))}
        </div>
      )}
    </>
  );
}
