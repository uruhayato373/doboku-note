import Link from 'next/link';
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
        <p className="card muted">採点データ（quality-scores.json）が無い</p>
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
      <nav className="filterbar" style={{ marginBottom: 12 }}>
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
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>キーワード</th>
              <th className="num">weighted</th>
              <th>弱い軸</th>
              <th>状態</th>
              <th className="num">リライト</th>
              <th className="num">順位</th>
              <th className="num">表示</th>
              <th className="num">クリック</th>
              <th>最終更新</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug}>
                <td style={{ whiteSpace: 'normal' }}>{r.title}</td>
                <td className="num">{r.weighted.toFixed(2)}</td>
                <td className="small">{r.weakAxes.join('・') || '—'}</td>
                <td className="small">{STATUS_JA[r.status] ?? r.status}</td>
                <td className="num">{r.rewriteCount}</td>
                <td className="num">{r.gscPos == null ? '—' : r.gscPos.toFixed(1)}</td>
                <td className="num">{r.impr}</td>
                <td className="num">{r.clicks}</td>
                <td className="small">{r.lastDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
