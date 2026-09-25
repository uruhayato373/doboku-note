import { Fragment } from 'react';
import { PageHead } from '@/components/ui';
import { Badge } from '@/components/primitives';
import { loadQualificationsView, type QualificationView } from '@/lib/qualifications';

export const dynamic = 'force-dynamic';

const PORTFOLIO_LABEL: Record<string, string> = { active: '展開中', candidate: '候補', declined: '見送り' };
const PORTFOLIO_VARIANT: Record<string, 'success' | 'outline' | 'secondary'> = { active: 'success', candidate: 'outline', declined: 'secondary' };
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function fmtDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${y}/${m}/${d}（${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}）`;
}

/**
 * /strategy/qualifications — 資格一覧（人が見る画面）。資格・状態・試験日・合格発表・受験者数・合格率だけを出す。
 *
 * 正本は .claude/config/qualification-registry.json（一覧と展開状態）・exam-calendar.json（日程）・
 * exam-stats.json（受験者数）。出典・照合記録・未確認の理由は正本と `npm run exam-ssot-status`
 * （月次レビュー）が持つので、この画面には出さない。正本の不整合があるときだけ警告を出す。
 * 試験日・合格発表は次の予定（無ければ今年度で最後のものを薄く）を出す。
 */
export default async function QualificationsPage() {
  const view = loadQualificationsView();
  const families = Object.entries(view.families).filter(([id]) => view.rows.some((r) => r.family === id));

  return (
    <>
      <PageHead title="資格一覧" />

      {view.errors.length > 0 && (
        <div className="card warn-border">
          <h2>正本の不整合 {view.errors.length} 件</h2>
          <p className="small muted">npm run check-exam-calendar で詳細を確認して正本を直す。</p>
        </div>
      )}

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>資格</th>
                <th>状態</th>
                <th>試験日</th>
                <th>合格発表</th>
                <th className="num">受験者数</th>
                <th className="num">合格率</th>
              </tr>
            </thead>
            <tbody>
              {families.map(([id, label]) => (
                <Fragment key={id}>
                  <tr>
                    <th colSpan={6} className="small muted" style={{ paddingTop: 14 }}>{label}</th>
                  </tr>
                  {view.rows
                    .filter((r) => r.family === id)
                    .map((r) => (
                      <Row key={r.id} row={r} />
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function When({ at }: { at: { date: string | null; label: string; past: boolean } | null }) {
  if (!at) return <span className="muted">—</span>;
  return (
    <div className={at.past ? 'muted' : undefined}>
      {at.date && <div>{fmtDate(at.date)}</div>}
      <div className="muted" style={{ fontSize: 11 }}>{at.label}</div>
    </div>
  );
}

function Row({ row: r }: { row: QualificationView }) {
  return (
    <tr style={{ verticalAlign: 'top' }}>
      <td style={{ whiteSpace: 'nowrap' }}>{r.label}</td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <Badge variant={PORTFOLIO_VARIANT[r.portfolio] ?? 'secondary'}>{PORTFOLIO_LABEL[r.portfolio] ?? r.portfolio}</Badge>
        {r.portfolioNote && <div className="muted" style={{ fontSize: 11 }}>{r.portfolioNote}</div>}
      </td>
      <td className="small"><When at={r.exam} /></td>
      <td className="small"><When at={r.result} /></td>
      <td className="small num" style={{ whiteSpace: 'nowrap' }}>
        {r.stats.length ? r.stats.map((s) => (
          <div key={s.stage}>
            {s.stage && <span className="muted">{s.stage} </span>}
            {s.examinees}
          </div>
        )) : <span className="muted">—</span>}
      </td>
      <td className="small num" style={{ whiteSpace: 'nowrap' }}>
        {r.stats.length ? r.stats.map((s) => <div key={s.stage}>{s.rate}</div>) : <span className="muted">—</span>}
      </td>
    </tr>
  );
}
