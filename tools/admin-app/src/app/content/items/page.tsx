import Link from 'next/link';
import { DataTable, Facet, FacetHead, FacetShell, StatusBadge, type DataTableRow, type FacetItem } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { longformPlanHref } from '@/lib/content-plan-links';
import { examLabel, FLAG_ORDER, loadItemList, matchingItemPublications, type ItemRow } from '@/lib/content-items';

export const dynamic = 'force-dynamic';

/**
 * /content/items — 作品と公開の一覧（read-only・content-registry.md「承認」）。
 * 絞り込みは searchParams だけ（リンクで動く）。行の組み立ては scripts/lib/media-review.mjs の listView。
 */

type Query = { e?: string; c?: string; s?: string; f?: string; m?: string };

const flagTone = (f: string) => (f === '要復元' ? 'bad' : f === '承認待ち' ? 'info' : 'warn');

function href(now: Query, patch: Query): string {
  const merged = { ...now, ...patch };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
  const s = params.toString();
  return s ? `/content/items?${s}` : '/content/items';
}

function facetItems(now: Query, param: keyof Query, active: string | null, total: number, items: { key: string; label: string; count: number }[]): FacetItem[] {
  return [
    { key: '__all', label: 'すべて', count: total, href: href(now, { [param]: undefined }), active: !active },
    ...items.map((i) => ({ ...i, href: href(now, { [param]: i.key }), active: active === i.key })),
  ];
}

export default async function ItemsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || null;
  const e = one(sp.e);
  const c = one(sp.c);
  const s = one(sp.s);
  const f = one(sp.f);
  const m = one(sp.m);
  const now: Query = { e: e ?? undefined, c: c ?? undefined, s: s ?? undefined, f: f ?? undefined, m: m ?? undefined };

  const { rows: all, counts } = loadItemList();
  const publications = (r: ItemRow, skip?: keyof Query): ItemRow['publications'] => matchingItemPublications(r, {
    channel: skip === 'c' ? undefined : c,
    status: skip === 's' ? undefined : s,
    month: skip === 'm' ? undefined : m,
  });
  const match = (r: ItemRow, skip?: keyof Query) =>
    (skip === 'e' || !e || r.exam === e) &&
    (((skip === 'c' || !c) && (skip === 's' || !s) && (skip === 'm' || !m)) || publications(r, skip).length > 0) &&
    (skip === 'f' || !f || r.flags.includes(f));
  const rows = all.filter((r) => match(r));

  const tally = (skip: keyof Query, keysOf: (r: ItemRow) => Iterable<string>) => {
    const m = new Map<string, number>();
    for (const r of all) if (match(r, skip)) for (const k of keysOf(r)) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };
  const scope = (skip: keyof Query) => all.filter((r) => match(r, skip)).length;
  const items = (m: Map<string, number>, label: (k: string) => string, order?: readonly string[]) =>
    [...m.entries()]
      .sort((a, b) => (order ? order.indexOf(a[0]) - order.indexOf(b[0]) : a[0].localeCompare(b[0])))
      .map(([key, count]) => ({ key, label: label(key), count }));

  const dataRows: DataTableRow[] = rows.map((r) => ({
    id: `${r.exam}/${r.id}`,
    values: {
      cover: r.coverSrc ? 1 : 0,
      title: r.title,
      exam: examLabel(r.exam),
      kind: r.format ? `${r.kind}・${r.format}` : r.kind,
      flags: r.flags.length,
    },
    cells: {
      cover: r.coverSrc ? (
        <img src={r.coverSrc} alt="" width={96} loading="lazy" className="w-24 border" />
      ) : (
        <span className="text-xs text-muted-foreground">表紙なし</span>
      ),
      title: <Link href={r.href}>{r.title}</Link>,
      flags: r.flags.length ? (
        <span className="flex flex-wrap gap-1">
          {r.flags.map((x) => <StatusBadge key={x} tone={flagTone(x)}>{x}</StatusBadge>)}
        </span>
      ) : '—',
    },
  }));

  const publicationKeys = (r: ItemRow, param: 'c' | 's' | 'm') => new Set(publications(r, param)
    .map((p) => param === 'c' ? p.channel : param === 's' ? p.status : p.month ?? 'undated'));
  const months = items(tally('m', (r) => publicationKeys(r, 'm')), (k) =>
    k === 'undated' ? '予定日未設定' : `${k.slice(0, 4)}年${Number(k.slice(5))}月`)
    .sort((a, b) => a.key === 'undated' ? 1 : b.key === 'undated' ? -1 : b.key.localeCompare(a.key));
  const filtered = Boolean(e || c || s || f || m);
  const rail = (
    <>
      <FacetHead clearHref={filtered ? '/content/items' : null} />
      <Facet title="公開予定月（JST）" items={facetItems(now, 'm', m, scope('m'), months)} />
      <Facet title="資格" items={facetItems(now, 'e', e, scope('e'), items(tally('e', (r) => [r.exam]), examLabel))} />
      <Facet title="チャネル" items={facetItems(now, 'c', c, scope('c'), items(tally('c', (r) => publicationKeys(r, 'c')), (k) => k))} />
      <Facet title="状態" items={facetItems(now, 's', s, scope('s'), items(tally('s', (r) => publicationKeys(r, 's')), (k) => k))} />
      <Facet title="印" items={facetItems(now, 'f', f, scope('f'), items(tally('f', (r) => r.flags), (k) => k, FLAG_ORDER))} />
    </>
  );

  const main = (
    <DataTable
      columns={[
        { key: 'cover', label: '表紙', sortable: false },
        { key: 'title', label: '題名', wrap: true },
        { key: 'exam', label: '資格' },
        { key: 'kind', label: '種類' },
        { key: 'flags', label: '印' },
      ]}
      rows={dataRows}
      filter="題名・資格で絞り込み"
      emptyText="この条件に該当する作品はありません。"
    />
  );

  return (
    <>
      <PageHead title="作品と公開" sub={`作品 ${counts.works} 件 · 公開 ${counts.publications} 件（表示中の作品 ${rows.length}）`} />
      <nav className="project-crumbs"><Link href={longformPlanHref({ e: e ?? undefined, m: m && m !== 'undated' ? m : undefined })}>通常動画の制作・公開管理</Link></nav>
      <FacetShell main={main} rail={rail} />
    </>
  );
}
