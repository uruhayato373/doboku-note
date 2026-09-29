import Link from 'next/link';
import { TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, numCol } from '@/components/admin';
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
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead>キーワード</TableHead>
            <TableHead className={numCol}>weighted</TableHead>
            <TableHead>弱い軸</TableHead>
            <TableHead>状態</TableHead>
            <TableHead className={numCol}>リライト</TableHead>
            <TableHead className={numCol}>順位</TableHead>
            <TableHead className={numCol}>表示</TableHead>
            <TableHead className={numCol}>クリック</TableHead>
            <TableHead>最終更新</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.slug}>
              <TableCell className="whitespace-normal">{r.title}</TableCell>
              <TableCell className={numCol}>{r.weighted.toFixed(2)}</TableCell>
              <TableCell className="text-xs">{r.weakAxes.join('・') || '—'}</TableCell>
              <TableCell className="text-xs">{STATUS_JA[r.status] ?? r.status}</TableCell>
              <TableCell className={numCol}>{r.rewriteCount}</TableCell>
              <TableCell className={numCol}>{r.gscPos == null ? '—' : r.gscPos.toFixed(1)}</TableCell>
              <TableCell className={numCol}>{r.impr}</TableCell>
              <TableCell className={numCol}>{r.clicks}</TableCell>
              <TableCell className="text-xs">{r.lastDate}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableFrame>
      </Stack>
    </>
  );
}
