import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { Badge } from '@/components/primitives';
import { loadQualificationsView, type QualificationView } from '@/lib/qualifications';

export const dynamic = 'force-dynamic';

const PORTFOLIO_LABEL: Record<string, string> = { active: '展開中', candidate: '候補', declined: '見送り' };
const PORTFOLIO_VARIANT: Record<string, 'success' | 'outline' | 'secondary'> = { active: 'success', candidate: 'outline', declined: 'secondary' };
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

function fmtDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${m}/${d}（${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}）`;
}

/**
 * /strategy/qualifications — 資格一覧（人が見る画面）。分類ごとのタブで、状態・次の日程・受験者数だけを出す。
 *
 * 正本は .claude/config/qualification-registry.json（一覧と展開状態）・exam-calendar.json（日程）・
 * exam-stats.json（受験者数）。出典・照合記録・未確認の理由は正本と `npm run exam-ssot-status`
 * （月次レビュー）が持つので、この画面には出さない。正本の不整合があるときだけ警告を出す。
 */
export default async function QualificationsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const view = loadQualificationsView();
  const families = Object.entries(view.families).filter(([id]) => view.rows.some((r) => r.family === id));
  const family = families.some(([id]) => id === f) ? f! : families[0]?.[0];
  const rows = view.rows.filter((r) => r.family === family);

  return (
    <>
      <PageHead title="資格一覧" />

      {view.errors.length > 0 && (
        <div className="card warn-border">
          <h2>正本の不整合 {view.errors.length} 件</h2>
          <p className="small muted">npm run check-exam-calendar で詳細を確認して正本を直す。</p>
        </div>
      )}

      <div className="filterbar">
        {families.map(([id, label]) => (
          <Link key={id} href={`/strategy/qualifications?f=${id}`} className={'chip' + (id === family ? ' active' : '')}>
            {label} {view.rows.filter((r) => r.family === id).length}
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>資格</th>
                <th>状態</th>
                <th>次の日程</th>
                <th>受験者数・合格率</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Row key={r.id} row={r} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Row({ row: r }: { row: QualificationView }) {
  return (
    <tr style={{ verticalAlign: 'top' }}>
      <td style={{ whiteSpace: 'nowrap' }}>{r.label}</td>
      <td>
        <Badge variant={PORTFOLIO_VARIANT[r.portfolio] ?? 'secondary'}>{PORTFOLIO_LABEL[r.portfolio] ?? r.portfolio}</Badge>
      </td>
      <td className="small">
        {r.nextEvent ? (
          <>
            {fmtDate(r.nextEvent.date)} {r.nextEvent.label}{' '}
            <span className={r.nextEvent.daysLeft <= 30 ? 'project-warning-text' : 'muted'}>あと{r.nextEvent.daysLeft}日</span>
          </>
        ) : r.periods[0] ? (
          <span className="muted">{r.periods[0].label} {r.periods[0].window}</span>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
      <td className="small">
        {r.statsLines.length ? (
          <>
            {r.statsLines.map((l) => (
              <div key={l}>{l}</div>
            ))}
            <div className="muted" style={{ fontSize: 11 }}>{r.statsYear}</div>
          </>
        ) : (
          <span className="muted">—</span>
        )}
      </td>
    </tr>
  );
}
