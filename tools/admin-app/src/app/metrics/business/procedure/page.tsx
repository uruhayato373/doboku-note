import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { buildReport, reviewPeriod } from '../../../../../../../scripts/lib/business-direction.mjs';
import { buildProcedureView, buildReviewView } from '../../../../../../../scripts/lib/review-wiring.mjs';

export const dynamic = 'force-dynamic';

/**
 * 戦略 ＞ レビュー ＞ 手順の点検（サイドバーには出さない）。
 * レビューが「何をしているか」を手順ごとに、実施の証拠（レビュー記録・週次レポートの節・トリアージ・振り分け・週間計画）と並べる。
 * 手順の正本は .claude/config/review-wiring.json の procedure、レポートの必須節はスキル本文の「出力フォーマット」。
 */
type State = 'ok' | 'partial' | 'missing' | 'manual';
type Step = { label: string; does: string; state: State; note: string };
type Section = { title: string; present: boolean; lines: number; gaps: number };
type View = { label: string; report: { name: string; week: string } | null; steps: Step[]; sections: { expected: Section[]; extra: string[] } | null };
type Input = { command: string; label: string };
type Stage = { stage: string; judge: Input[]; check: Input[] };

const MARK: Record<State, { icon: string; text: string; color: string }> = {
  ok: { icon: '✓', text: '証拠あり', color: 'var(--good)' },
  partial: { icon: '△', text: '一部', color: 'var(--warn)' },
  missing: { icon: '✕', text: '証拠なし', color: 'var(--bad, #e5484d)' },
  manual: { icon: '－', text: '記録が残らない', color: 'var(--ink-muted)' },
};

export default async function ProcedurePage({ searchParams }: { searchParams: Promise<{ cadence?: string }> }) {
  const { cadence: q } = await searchParams;
  const cadence = q === 'monthly' ? 'monthly' : 'weekly';
  const root = findRepoRoot();
  const reviews = (() => {
    try {
      return buildReport(root, reviewPeriod(cadence)).reviews;
    } catch {
      return [];
    }
  })();
  const view = buildProcedureView(root, cadence, { reviews }) as View | null;
  const wiring = (buildReviewView(root, { reviews }) as { id: string; byStage: Stage[] }[]).find((c) => c.id === cadence);
  if (!view) return <PageHead title="手順の点検" />;
  const counts = view.steps.reduce<Record<State, number>>((a, s) => ((a[s.state] += 1), a), { ok: 0, partial: 0, missing: 0, manual: 0 });

  return (
    <>
      <PageHead title={`${view.label}レビューの手順を点検`} />
      <nav className="filterbar" style={{ marginBottom: 12 }}>
        <Link className="chip" href={cadence === 'monthly' ? '/metrics/business?cadence=monthly' : '/metrics/business'}>← レビューへ戻る</Link>
        <Link className={'chip' + (cadence === 'weekly' ? ' active' : '')} href="/metrics/business/procedure">週次</Link>
        <Link className={'chip' + (cadence === 'monthly' ? ' active' : '')} href="/metrics/business/procedure?cadence=monthly">月次</Link>
      </nav>

      <div className="card">
        <h2>
          手順と実施の証拠{' '}
          <span className="sub">
            {view.steps.length} 手順・証拠あり {counts.ok}・一部 {counts.partial}・証拠なし {counts.missing}・記録が残らない {counts.manual}
            {view.report && `（${view.report.name}）`}
          </span>
        </h2>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
          {view.steps.map((s, i) => {
            const m = MARK[s.state];
            return (
              <li key={s.label} style={{ display: 'grid', gridTemplateColumns: '2em 1fr', gap: 10, alignItems: 'start' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: m.color, textAlign: 'center' }} title={m.text}>{m.icon}</span>
                <div>
                  <strong>{i + 1}. {s.label}</strong> <span className="small" style={{ color: m.color }}>{m.text}</span>
                  <div className="small muted">{s.does}</div>
                  <div className="small">{s.note}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {view.sections && (
        <div className="card">
          <h2>
            レポートの節 <span className="sub">必須 {view.sections.expected.length}・書かれている {view.sections.expected.filter((x) => x.present).length}</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
            {view.sections.expected.map((x) => (
              <div key={x.title} className="small" style={{ padding: '6px 10px', borderRadius: 6, background: x.present ? 'var(--panel-2)' : 'var(--warn-fill)' }}>
                <div style={{ fontWeight: 600 }}>{x.present ? '' : '✕ '}{x.title}</div>
                <div className="muted">
                  {x.present ? `${x.lines} 行` : '書かれていない'}
                  {x.gaps > 0 && <span style={{ color: 'var(--warn)' }}>・欠測 {x.gaps}</span>}
                </div>
              </div>
            ))}
          </div>
          {view.sections.extra.length > 0 && (
            <p className="small muted" style={{ marginBottom: 0 }}>フォーマットに無いが書かれている節: {view.sections.extra.join('・')}</p>
          )}
        </div>
      )}

      {wiring && (
        <div className="card">
          <h2>実行するコマンド</h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>段</th>
                  <th>見るもの</th>
                  <th>コマンド</th>
                  <th>役割</th>
                </tr>
              </thead>
              <tbody>
                {wiring.byStage.flatMap((s) =>
                  [...s.judge.map((i) => ({ ...i, role: '判断' })), ...s.check.map((i) => ({ ...i, role: '点検' }))].map((i, n) => (
                    <tr key={s.stage + i.command}>
                      <td className="small muted">{n === 0 ? s.stage : ''}</td>
                      <td className="small">{i.label}</td>
                      <td className="mono small">{i.command.replace(/^node:/, 'node scripts/')}</td>
                      <td className="small">{i.role === '判断' ? <strong>判断</strong> : <span className="muted">点検</span>}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
