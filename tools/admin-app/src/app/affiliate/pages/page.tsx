import Link from 'next/link';
import { DataTable, FilterBar, FilterChip, PanelCard, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { Stack } from '@/components/layout';
import { num } from '@/lib/format';
import { getCategoryLabel, getAllCategories } from '../../../../../../src/lib/categories';
import { getAffiliatePages } from '@/lib/affiliate-pages';

export const dynamic = 'force-dynamic';

export default async function AffiliatePagesPage({ searchParams }: { searchParams: Promise<{ filter?: string; agency?: string; kind?: string; category?: string; page?: string }> }) {
  const params = await searchParams;
  const data = await getAffiliatePages();
  const filter = ['inline-zero', 'impression-zero'].includes(params.filter ?? '') ? params.filter! : '';
  const agency = params.agency ?? '';
  const kind = params.kind ?? '';
  const category = params.category ?? '';
  const categorySet = new Set(data.pages.filter(p => !kind || p.pageKind === kind).map(p => p.category));
  const categoryOptions = getAllCategories().filter(c => categorySet.has(c.slug));
  const filtered = data.pages.filter((p) => (!kind || p.pageKind === kind) && (!category || p.category === category) && (!agency || p.agency === agency) && (filter !== 'inline-zero' || p.insertAt.length === 0) && (filter !== 'impression-zero' || p.impressions === 0));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 100));
  const page = Math.min(pageCount, Math.max(1, Math.floor(Number(params.page) || 1)));
  const href = (changes: Record<string, string>) => {
    const query = new URLSearchParams({ filter, agency, kind, category, ...changes, page: changes.page ?? '' });
    for (const [k, v] of [...query]) if (!v) query.delete(k);
    return `/affiliate/pages?${query}`;
  };
  const columns: DataTableColumn[] = [
    { key: 'title', label: 'ページ', wrap: true },
    { key: 'chars', label: '本文字数', num: true },
    { key: 'tables', label: '表', num: true },
    { key: 'inline', label: '本文中の枠', wrap: true },
    { key: 'placements', label: '画像面・案件・素材・ピクセル', wrap: true },
    { key: 'impressions', label: '可視表示', num: true },
    { key: 'links', label: '確認', wrap: true },
  ].map((c) => ({ ...c, sortable: false }));
  const rows: DataTableRow[] = filtered.slice((page - 1) * 100, page * 100).map((p) => ({
    id: p.path,
    values: { title: p.title, chars: p.chars, tables: p.tables, inline: `${p.insertAt.length} 枠`, impressions: p.impressions },
    cells: {
      title: <><span className="line-clamp-2" title={p.title}>{p.title}</span><div className="text-xs text-muted-foreground">{p.group}{p.career ? ' / career' : ''}</div><div className="text-xs text-muted-foreground break-all">{p.path}</div></>,
      inline: <>{p.insertAt.length} 枠{p.inlineReason && <div className="text-xs">{p.inlineReason}</div>}{p.insertAt.map((s) => <div key={s.slot} className="text-xs">{s.afterLabel}</div>)}</>,
      placements: <>{p.slotDetails.map(r => <div key={r.slot} className="text-xs">{r.slot}: {r.program}<br />{r.creative}<br />ピクセル: {r.pixel || '—'} / 表示: {p.slotImpressions === null ? '未取得' : num(p.slotImpressions[r.slot] ?? 0)}</div>)}</>,
      links: <Stack gap="sm"><a href={`http://localhost:3020${p.path}`} target="_blank" rel="noreferrer" className="underline">開く</a>{!p.crops.length && <span className="text-xs text-muted-foreground">未撮影・見た目は未検証</span>}{p.crops.map((c) => <a key={c.href} href={c.href} target="_blank" rel="noreferrer" className="text-xs underline">{c.label}</a>)}</Stack>,
    },
  }));
  return <Stack gap="lg">
    <PageHead title="ページ別の広告" sub={data.loaded ? `GA4 ${data.reportDate} 取得（${data.period}）${data.truncated ? '・取得上限による省略あり' : ''}` : 'GA4 可視表示の記録なし'} />
    <PanelCard title={`記事・基準書 ${num(data.pages.length)} ページ`}>
      <p className="text-sm">本文中 0 枠: {num(data.distribution[0])} ／ 1 枠: {num(data.distribution[1])} ／ 2 枠: {num(data.distribution[2])} ／ 3 枠: {num(data.distribution[3])}</p>
    </PanelCard>
    <FilterBar>{[['', '全種類'], ['doc', '記事'], ['standards', '基準書']].map(([value,label]) => <FilterChip key={value} active={kind === value} href={href({ kind: value, category: '', agency: '' })}>{label}</FilterChip>)}</FilterBar>
    <FilterBar><FilterChip active={!category} href={href({ category: '' })}>全カテゴリ</FilterChip>{categoryOptions.map(({ slug: c }) => <FilterChip key={c} active={category === c} href={href({ category: c })}>{getCategoryLabel(c)}</FilterChip>)}</FilterBar>
    <FilterBar>{[['', 'すべて'], ['inline-zero', '本文中 0 枠'], ['impression-zero', '可視表示 0']].map(([value, label]) => <FilterChip key={value} active={filter === value} href={href({ filter: value })}>{label}</FilterChip>)}</FilterBar>
    <FilterBar><FilterChip active={!agency} href={href({ agency: '' })}>全機関</FilterChip>{[...new Map(data.pages.filter(p => p.agency).map((p) => [p.agency, p.agencyName]))].map(([id, name]) => <FilterChip key={id} active={agency === id} href={href({ agency: id })}>{name}</FilterChip>)}</FilterBar>
    <p className="text-sm text-muted-foreground">{num(filtered.length)} 件・本文字数の多い順（{page} / {pageCount} ページ）</p>
    <DataTable columns={columns} rows={rows} pageSize={100} />
    <nav aria-label="ページ送り" className="flex gap-4">{page > 1 && <Link href={href({ page: String(page - 1) })} className="underline">前へ</Link>}{page < pageCount && <Link href={href({ page: String(page + 1) })} className="underline">次へ</Link>}</nav>
  </Stack>;
}
