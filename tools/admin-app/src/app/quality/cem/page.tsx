import Link from 'next/link';
import { DataTable, PageHead, type Col } from '@/components/ui';
import { cemQualitySummary, type CemRow } from '@/lib/quality-cem';

export const dynamic = 'force-dynamic';

const statusClass = (s: string) =>
  s === 'approved' ? 'good' : s === 'rewritten' ? 'warn' : s === 'verified' ? 'neutral' : 'bad';

const cols: Col<CemRow>[] = [
  {
    key: 'title',
    label: 'title',
    wrap: true,
    render: (r) => (
      <a href={r.url} target="_blank" rel="noreferrer">
        {r.title}
      </a>
    ),
  },
  { key: 'weighted', label: 'weighted', num: true, render: (r) => r.weighted.toFixed(2) },
  {
    key: 'weakAxes',
    label: 'weak axes',
    render: (r) => (r.weakAxes.length ? r.weakAxes.join(', ') : '—'),
  },
  { key: 'rewriteCount', label: 'rewrites', num: true },
  {
    key: 'status',
    label: 'status',
    render: (r) => <span className={'badge ' + statusClass(r.status)}>{r.status}</span>,
  },
  { key: 'lastDate', label: '最終更新' },
];

export default function QualityCemPage() {
  const data = cemQualitySummary();

  return (
    <>
      <PageHead
        title="品質サイクル進捗（cem）"
        sub="技術士総合技術監理部門キーワードページの採点・リライト進捗（旧 docs/editorial/05_品質サイクル進捗.md の A 節を移設・DN-0321）"
      />

      <div className="card">
        <p className="small muted">
          <Link href="/quality">← 品質概観</Link> ／ 生成元:{' '}
          <code>.claude/state/quality-scores.json</code> +{' '}
          <code>.claude/state/quality-cycle-state.json</code>
        </p>
        {!data.present ? (
          <div className="small muted">
            未生成。<code>.claude/skills/quality/quality-cycle/scripts-cem/build-progress-md.mjs</code>{' '}
            相当の採点データがまだありません。
          </div>
        ) : (
          <p className="small muted">
            スコア更新: {(data.scoredAt ?? '').slice(0, 10)} · 全 {data.total} 件 / weighted &lt;
            2.0: {data.lt20} 件 / weighted &lt; 2.5: {data.lt25} 件 · status{' '}
            {Object.entries(data.byStatus)
              .map(([s, n]) => `${s} ${n}`)
              .join(' / ')}
          </p>
        )}
      </div>

      <div className="card">
        <h2>進捗テーブル（weighted 昇順）</h2>
        <DataTable cols={cols} rows={data.rows} />
      </div>
    </>
  );
}
