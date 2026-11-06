import { DataTable, DetailText, FilterBar, FilterChip, type DataTableCol, toDataTable } from '@/components/admin';
import type { PositionRow, PositionView } from '@/lib/competitor-positions';

const STATE_LABEL: Record<string, string> = { seen: '確認済み', inferred: '推定', untested: '未検証' };

const RIVAL_COLUMNS: DataTableCol<PositionRow['rivals'][number]>[] = [
  { key: 'channel', label: 'チャネル' },
  { key: 'label', label: '相手', wrap: true },
  { key: 'holds', label: '押さえている所', wrap: true, sortable: false },
  { key: 'facts', label: '実測', wrap: true, sortable: false },
  { key: 'date', label: '取得日' },
];

const STANCE_COLUMNS: DataTableCol<PositionRow['stances'][number]>[] = [
  { key: 'stage', label: '段階' },
  { key: 'text', label: '取る立ち位置', wrap: true, sortable: false },
  { key: 'why', label: '理由', wrap: true, sortable: false },
  { key: 'state', label: '状態', render: (a) => STATE_LABEL[a.state] ?? a.state },
  { key: 'probe', label: '検索の確認', wrap: true, sortable: false },
  { key: 'slots', label: '使う枠', num: true },
];

const AVOID_COLUMNS: DataTableCol<PositionRow['avoid'][number]>[] = [
  { key: 'text', label: '勝負しない所', wrap: true, sortable: false },
  { key: 'why', label: '理由', wrap: true, sortable: false },
];

/** 資格を 1 つ選び、競合・取る所・勝負しない所を 1 画面で読む。数字は取得物から読む */
export default function CompetitorPositionsPanel({ view, current }: { view: PositionView; current?: string }) {
  const position = view.rows.find((r) => r.id === current) ?? view.rows[0];
  if (!position) return <p className="text-sm text-muted-foreground">データなし</p>;
  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        {view.rows.map((r) => (
          <FilterChip key={r.id} active={r.id === position.id} href={`/strategy/competitors?channel=positions&position=${r.id}`}>
            {r.label}
          </FilterChip>
        ))}
      </FilterBar>
      <p className="text-sm">{position.summary}</p>
      {view.problems.length > 0 && <DetailText title="要対応" items={view.problems} />}
      <section>
        <h2 className="mb-2 text-sm font-semibold">取る立ち位置</h2>
        <DataTable {...toDataTable(STANCE_COLUMNS, position.stances)} pageSize={30} />
      </section>
      <section>
        <h2 className="mb-2 text-sm font-semibold">競合（分析 {position.reviewedOn}）</h2>
        <DataTable {...toDataTable(RIVAL_COLUMNS, position.rivals)} pageSize={30} />
      </section>
      {position.avoid.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">勝負しない所</h2>
          <DataTable {...toDataTable(AVOID_COLUMNS, position.avoid)} pageSize={30} />
        </section>
      )}
      <DetailText title="調査の限界" items={position.limits} />
    </div>
  );
}
