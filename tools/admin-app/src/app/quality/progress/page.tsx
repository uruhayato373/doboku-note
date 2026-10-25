import Link from 'next/link';
import { DataTable, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { loadQualityProgress } from '../../../../../../scripts/lib/quality-progress.mjs';

export const dynamic = 'force-dynamic';

/**
 * 管理 ＞ 品質概観 ＞ 品質サイクル進捗。総監キーワードページの採点（weighted・弱い軸）とリライト状況。
 * 組み立ては scripts/lib/quality-progress.mjs（旧 docs/editorial/05_品質サイクル進捗.md を置き換え）。
 */
type Row = { slug: string; title: string; gscPos: number | null; impr: number; clicks: number; weighted: number; weakAxes: string[]; rewriteCount: number; status: string; lastDate: string };

const STATUS_JA: Record<string, string> = { approved: '承認', verified: '採点済み', rewritten: 'リライト済み', 未着手: '未着手' };

const PROGRESS_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: 'キーワード', wrap: true },
  { key: 'weighted', label: 'weighted', num: true },
  { key: 'weakAxes', label: '弱い軸' },
  { key: 'status', label: '状態' },
  { key: 'rewriteCount', label: 'リライト', num: true },
  { key: 'gscPos', label: '順位', num: true },
  { key: 'impr', label: '表示', num: true },
  { key: 'clicks', label: 'クリック', num: true },
  { key: 'lastDate', label: '最終更新' },
];

export default async function QualityProgressPage({ searchParams }: { searchParams: Promise<{ status?: string; below?: string }> }) {
  const { status, below } = await searchParams;
  const v = loadQualityProgress(findRepoRoot()) as { present: boolean; rows: Row[]; summary: { total: number; lt2: number; lt25: number; byStatus: Record<string, number> } };
  if (!v.present) {
    return (
      <>
        <PageHead title="品質サイクル進捗" />
        <p className="text-sm text-muted-foreground">採点データ（quality-scores.json）が無い</p>
      </>
    );
  }
  const rows = v.rows.filter((r) => (!status || r.status === status) && (!below || r.weighted < Number(below)));
  const progressRows: DataTableRow[] = rows.map((r) => ({
    id: r.slug,
    values: {
      title: r.title,
      weighted: r.weighted,
      weakAxes: r.weakAxes.join('・') || null,
      status: STATUS_JA[r.status] ?? r.status,
      rewriteCount: r.rewriteCount,
      gscPos: r.gscPos,
      impr: r.impr,
      clicks: r.clicks,
      lastDate: r.lastDate,
    },
    cells: {
      weighted: r.weighted.toFixed(2),
      weakAxes: <span className="text-xs">{r.weakAxes.join('・') || '—'}</span>,
      status: <span className="text-xs">{STATUS_JA[r.status] ?? r.status}</span>,
      gscPos: r.gscPos == null ? '—' : r.gscPos.toFixed(1),
      lastDate: <span className="text-xs">{r.lastDate}</span>,
    },
  }));
  const href = (q: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries(q).filter(([, x]) => x) as [string, string][]);
    return `/quality/progress${p.size ? `?${p}` : ''}`;
  };

  return (
    <>
      <PageHead title="品質サイクル進捗（総監キーワード）" />
      <Stack>
      <nav className="filterbar">
        <Link className="chip" href="/quality">← 品質概観</Link>
        <Link className={'chip' + (!status && !below ? ' active' : '')} href={href({})}>すべて {v.summary.total}</Link>
        {Object.entries(v.summary.byStatus).map(([s, n]) => (
          <Link key={s} className={'chip' + (status === s ? ' active' : '')} href={href({ status: s, below })}>
            {STATUS_JA[s] ?? s} {n}
          </Link>
        ))}
        <Link className={'chip' + (below === '2.5' ? ' active' : '')} href={href({ status, below: '2.5' })}>
          2.5 未満 {v.summary.lt25}
        </Link>
      </nav>
      <DataTable columns={PROGRESS_COLUMNS} rows={progressRows} filter="キーワードで絞り込む" />
      </Stack>
    </>
  );
}
