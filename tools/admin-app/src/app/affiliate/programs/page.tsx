import { DataTable, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { affiliateCatalog } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = { approved: '提携中', applying: '申請中', none: '未申請', unavailable: '取扱なし', unknown: '未確認', rejected: '否認' };
const ASP: Record<string, string> = { a8: 'A8', moshimo: 'もしも', afb: 'afb' };
const yen = (v: number | null) => (v == null ? '' : ` ¥${v.toLocaleString('en-US')}`);

const COLUMNS: DataTableColumn[] = [
  { key: 'label', label: '案件' },
  { key: 'placement', label: '配置' },
  { key: 'asps', label: 'ASP（提携・報酬）', wrap: true, sortable: false },
  { key: 'expiresAt', label: 'リンク期限' },
];

/** /affiliate/programs — 案件ごとの配置状況・ASP ごとの提携状態と報酬・リンクの期限。 */
export default function AffiliateProgramsPage() {
  const catalog = affiliateCatalog().sort((a, b) => Number(b.placement === 'active') - Number(a.placement === 'active'));
  const rows: DataTableRow[] = catalog.map((r) => {
    const active = r.placement === 'active';
    const asps = r.asps
      .filter((a) => a.status !== 'unknown')
      .map((a) => `${ASP[a.asp] ?? a.asp} ${STATUS[a.status] ?? a.status}${a.status === 'approved' ? yen(a.rewardYen) : ''}`)
      .join(' ／ ');
    return {
      id: r.id,
      values: { label: r.label, placement: active ? '掲載中' : 'なし', asps: asps || null, expiresAt: r.expiresAt ?? null },
      cells: {
        placement: active ? <strong>掲載中</strong> : <span className="text-muted-foreground">なし</span>,
        asps: <span className="text-xs">{asps || <span className="text-muted-foreground">未確認</span>}</span>,
        expiresAt: r.expiresAt ? r.expiresAt.slice(5).replace('-', '/') : <span className="text-muted-foreground">—</span>,
      },
    };
  });
  return (
    <>
      <PageHead title="提携・案件" />
      <DataTable columns={COLUMNS} rows={rows} pageSize={100} />
    </>
  );
}
