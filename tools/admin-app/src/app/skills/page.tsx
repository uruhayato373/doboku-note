import { DataTable, DetailSheet, DetailText, PanelCard, type DataTableColumn, type DataTableRow, FilterBar, FilterChip } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { loadSkills } from '@/lib/registry';
import { domainList } from '@/lib/domains';

export const dynamic = 'force-dynamic';

const COLUMNS: DataTableColumn[] = [
  { key: 'name', label: '名前' },
  { key: 'domain', label: '領域' },
];

/** /skills — スキル一覧。事業の領域（正本 domains.json）をタブにし、説明は名前を押すシートに置く。 */
export default async function SkillsPage({ searchParams }: { searchParams: Promise<{ dom?: string }> }) {
  const { dom } = await searchParams;
  const { items, errors } = loadSkills();
  const domains = domainList();
  const label = (id: string | null) => domains.find((d) => d.id === id)?.label ?? '未設定';
  const rank = (id: string | null) => {
    const i = domains.findIndex((d) => d.id === id);
    return i < 0 ? 99 : i;
  };
  const filtered = items
    .filter((s) => !dom || s.domain === dom)
    .sort((a, b) => rank(a.domain) - rank(b.domain) || a.name.localeCompare(b.name));
  const ids = [...new Set(items.map((s) => s.domain))].sort((a, b) => rank(a) - rank(b));

  const rows: DataTableRow[] = filtered.map((s) => ({
    id: s.file,
    values: { name: s.name, domain: label(s.domain) },
    cells: {
      name: (
        <DetailSheet trigger={<span className="font-mono">{s.name}</span>} title={<span className="font-mono">{s.name}</span>} description={label(s.domain)}>
          <DetailText title="説明" items={[s.description]} />
        </DetailSheet>
      ),
    },
  }));

  return (
    <>
      <PageHead title="スキル" sub={`${items.length} 件`} />

      {errors.length > 0 ? (
        <PanelCard title={`パース警告 ${errors.length}件`}>
          <ul className="text-xs text-muted-foreground">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </PanelCard>
      ) : null}

      <FilterBar className="mb-3!">
        <FilterChip href="/skills" active={!dom}>
          すべて
        </FilterChip>
        {ids.map((id) => (
          <FilterChip key={id ?? 'none'} href={`/skills?dom=${id ?? ''}`} active={Boolean(dom) && dom === id}>
            {label(id)} {items.filter((s) => s.domain === id).length}
          </FilterChip>
        ))}
      </FilterBar>

      <DataTable columns={COLUMNS} rows={rows} pageSize={50} filter="名前・領域で絞り込む" />
    </>
  );
}
