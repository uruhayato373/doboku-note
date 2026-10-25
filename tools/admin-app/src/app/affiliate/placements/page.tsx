import { DataTable, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { affiliateSurfaces } from '@/lib/affiliate';

export const dynamic = 'force-dynamic';

type Link = { path: string; mat: string; program: string | null; status: string | null; title: string | null };
type Surface = { id: string; label: string; scanned: number; links: Link[] };

const SURFACE_COLUMNS: DataTableColumn[] = [
  { key: 'label', label: '掲載先' },
  { key: 'docs', label: 'リンクのある原稿', num: true },
  { key: 'programs', label: '案件' },
  { key: 'tracking', label: '成果の計測', sortable: false },
];

const NOTE_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: 'note 記事' },
  { key: 'program', label: '案件' },
  { key: 'status', label: '状態' },
];

/** /affiliate/placements — アフィリエイトリンクがどこに何本あるか（サイト・note・SNS）。 */
export default function AffiliatePlacementsPage() {
  const surfaces = affiliateSurfaces(findRepoRoot()) as Surface[];
  const note = surfaces.find((s) => s.id === 'note');

  const surfaceRows: DataTableRow[] = surfaces.map((s) => {
    const docs = s.links.length ? new Set(s.links.map((l) => l.path)).size : 0;
    const programs = [...new Set(s.links.map((l) => l.program ?? '未登録'))].join('・');
    const tracking =
      s.id === 'site'
        ? 'クリック＝GA4（配置別）／成果＝A8 サイト別（doboku-note）'
        : s.id === 'note'
          ? 'クリック＝A8／成果＝A8 サイト別（doboku-note（note）・2026-09-26〜）'
          : '将来（X・Threads）';
    return {
      id: s.id,
      values: { label: s.label, docs, programs: programs || null, tracking },
      cells: {
        docs: docs || <span className="text-muted-foreground">0</span>,
        programs: programs || <span className="text-muted-foreground">—</span>,
        tracking: <span className="text-xs">{tracking}</span>,
      },
    };
  });

  const noteRows: DataTableRow[] = (note?.links ?? []).map((l) => ({
    id: l.path + l.mat,
    values: {
      title: l.title ?? l.path.split('/').slice(-2, -1)[0] ?? null,
      program: l.program,
      status: l.status === 'published' ? '公開' : l.status,
    },
    cells: {
      program: l.program ?? <span className="project-warning-text">未登録</span>,
    },
  }));

  return (
    <>
      <PageHead title="掲載先" />
      <div className="mb-4">
        <DataTable columns={SURFACE_COLUMNS} rows={surfaceRows} pageSize={100} />
      </div>
      {note && note.links.length > 0 && (
        <DataTable columns={NOTE_COLUMNS} rows={noteRows} filter="記事名で絞り込む" />
      )}
    </>
  );
}
