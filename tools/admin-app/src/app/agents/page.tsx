import { DataTable, DetailList, DetailSheet, DetailText, PanelCard, type DataTableColumn, type DataTableRow, FilterBar, FilterChip } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { loadAgents, type AgentEntry } from '@/lib/registry';
import { domainList } from '@/lib/domains';

export const dynamic = 'force-dynamic';

const AGENT_COLUMNS: DataTableColumn[] = [
  { key: 'name', label: '名前' },
  { key: 'domain', label: '領域' },
  { key: 'role', label: '役割' },
];

/** tools に Edit/Write/All tools/* を含むかで 制作（Generator）/ 検査（Evaluator）を推定。 */
function role(a: AgentEntry): '制作' | '検査' {
  const t = a.tools ?? '';
  return /\b(Edit|Write|NotebookEdit|All tools)\b|\*/.test(t) || !a.tools ? '制作' : '検査';
}

/** /agents — エージェント一覧。事業の領域（正本 domains.json）で絞り込む。 */
export default async function AgentsPage({ searchParams }: { searchParams: Promise<{ dom?: string }> }) {
  const { dom } = await searchParams;
  const { items, errors } = loadAgents();
  const domains = domainList();
  const label = (id: string | null) => domains.find((d) => d.id === id)?.label ?? '未設定';
  const rank = (id: string | null) => {
    const i = domains.findIndex((d) => d.id === id);
    return i < 0 ? 99 : i;
  };
  const filtered = items
    .filter((a) => !dom || a.domain === dom)
    .sort((a, b) => rank(a.domain) - rank(b.domain) || a.name.localeCompare(b.name));

  const rows: DataTableRow[] = filtered.map((a) => ({
    id: a.name,
    values: { name: a.name, domain: label(a.domain), role: role(a) },
    cells: {
      name: (
        <DetailSheet trigger={<span className="font-mono">{a.name}</span>} title={<span className="font-mono">{a.name}</span>} description={label(a.domain)}>
          <DetailText title="説明" items={[a.description]} />
          <DetailList items={[{ label: '道具', value: a.tools }, { label: 'モデル', value: a.model }]} />
        </DetailSheet>
      ),
      domain: <span className="text-xs">{label(a.domain)}</span>,
      role: <span className="text-xs">{role(a)}</span>,
    },
  }));

  return (
    <>
      <PageHead title="エージェント" sub={`${items.length} 件`} />

      {errors.length > 0 ? (
        <PanelCard title={`読み取れない定義 ${errors.length} 件`}>
          <ul className="text-xs text-muted-foreground">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </PanelCard>
      ) : null}

      <FilterBar>
        <FilterChip href="/agents" active={!dom}>
          すべて
        </FilterChip>
        {domains.map((d) => {
          const n = items.filter((a) => a.domain === d.id).length;
          return n ? (
            <FilterChip key={d.id} href={`/agents?dom=${d.id}`} active={dom === d.id}>
              {d.label} {n}
            </FilterChip>
          ) : null;
        })}
      </FilterBar>

      <DataTable columns={AGENT_COLUMNS} rows={rows} pageSize={50} filter="名前・領域で絞り込む" />
    </>
  );
}
