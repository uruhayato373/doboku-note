import Link from 'next/link';
import { PageHead, Kpi } from '@/components/ui';
import { Badge } from '@/components/primitives';
import { loadQualificationsView, type QualificationView } from '@/lib/qualifications';

export const dynamic = 'force-dynamic';

const PORTFOLIO_LABEL: Record<string, string> = { active: '展開中', candidate: '候補', declined: '見送り' };
const PORTFOLIO_VARIANT: Record<string, 'success' | 'outline' | 'secondary'> = { active: 'success', candidate: 'outline', declined: 'secondary' };
const KIND_LABEL: Record<string, string> = { application: '申込', exam: '試験', result: '発表' };

/**
 * /strategy/qualifications — 資格一覧（展開中・候補・見送り）の read-only 画面。
 *
 * 正本は .claude/config/qualification-registry.json（一覧と展開状態）・exam-calendar.json（日程）・
 * exam-stats.json（受験者数）。三者の整合は npm run check-exam-calendar が CI で検査する。
 * 展開状態の変更や値の更新は正本を編集する（この画面は表示だけ）。
 */
export default async function QualificationsPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams;
  const view = loadQualificationsView();
  const filter = p && view.statuses[p] ? p : null;
  const rows = filter ? view.rows.filter((r) => r.portfolio === filter) : view.rows;
  const count = (s: string) => view.rows.filter((r) => r.portfolio === s).length;
  const unverified = view.rows.filter((r) => r.statsUnverified || (!r.hasEvents && r.periods.length === 0)).length;
  const actionRows = view.rows.filter((r) => r.verification.actions.length > 0).length;

  return (
    <>
      <PageHead
        title="資格一覧"
        sub="展開中・候補・見送りの全資格と、今年度の日程・最新の受験者数（正本は .claude/config/qualification-registry.json・exam-calendar.json・exam-stats.json）"
      />

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <Kpi label="資格数" value={view.rows.length} />
        <Kpi label="展開中" value={count('active')} />
        <Kpi label="候補" value={count('candidate')} />
        <Kpi label="見送り" value={count('declined')} />
        <Kpi label="要対応の資格" value={actionRows} />
      </div>

      {view.errors.length > 0 && (
        <div className="card warn-border">
          <h2>正本の不整合 {view.errors.length} 件</h2>
          <ul className="small">
            {view.errors.map((e) => (
              <li key={e} className="project-warning-text">{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <h2>
          資格
          <span className="sub">
            {[null, 'active', 'candidate', 'declined'].map((s) => (
              <span key={s ?? 'all'} style={{ marginRight: 10 }}>
                {s === filter ? (
                  <strong>{s ? PORTFOLIO_LABEL[s] : 'すべて'}</strong>
                ) : (
                  <Link href={s ? `/strategy/qualifications?p=${s}` : '/strategy/qualifications'}>{s ? PORTFOLIO_LABEL[s] : 'すべて'}</Link>
                )}
              </span>
            ))}
          </span>
        </h2>
        <p className="small muted">
          次の日程は今日（{view.today}・JST）以降で最も近い申込・試験・発表。日付未発表の日程は期間の文言で出す。
          日程または受験者数が公式で確認できていない資格 {unverified} 件は、数値を埋めずに理由を出している。照合列の判定は月次レビューの <code>npm run exam-ssot-status</code> と同じ。
        </p>
        {Object.entries(view.families).map(([family, familyLabel]) => {
          const group = rows.filter((r) => r.family === family);
          if (group.length === 0) return null;
          return (
            <div key={family} style={{ marginTop: 16 }}>
              <h3 className="small" style={{ fontWeight: 600, marginBottom: 6 }}>{familyLabel}</h3>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th>資格</th>
                      <th>状態</th>
                      <th>次の日程</th>
                      <th>最新の受験者数</th>
                      <th>照合</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((r) => (
                      <Row key={r.id} row={r} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Row({ row: r }: { row: QualificationView }) {
  return (
    <tr style={{ verticalAlign: 'top' }}>
      <td style={{ minWidth: 200 }}>
        <div>{r.label}</div>
        <div className="muted small mono">{r.id}</div>
        {r.decision && (
          <div className="muted small" style={{ whiteSpace: 'normal', maxWidth: 280 }}>
            {r.decision.summary}（<span className="mono">{r.decision.ref}</span>）
          </div>
        )}
      </td>
      <td>
        <Badge variant={PORTFOLIO_VARIANT[r.portfolio] ?? 'secondary'}>{PORTFOLIO_LABEL[r.portfolio] ?? r.portfolio}</Badge>
      </td>
      <td className="small" style={{ minWidth: 220, whiteSpace: 'normal', maxWidth: 320 }}>
        {r.nextEvent ? (
          <div>
            <span className="muted">[{KIND_LABEL[r.nextEvent.kind] ?? r.nextEvent.kind}]</span> {r.nextEvent.label} {r.nextEvent.date}{' '}
            <Badge variant={r.nextEvent.daysLeft <= 30 ? 'warning' : 'outline'}>あと{r.nextEvent.daysLeft}日</Badge>
          </div>
        ) : (
          r.periods.length === 0 && (
            <div className="muted">{r.hasEvents ? '今年度の日程は終了（次年度は未公表）' : '日程 未確認'}</div>
          )
        )}
        {r.periods.map((p) => (
          <div key={p.label} className="muted">{p.label} {p.window}</div>
        ))}
        {!r.hasEvents && r.periods.length === 0 && r.scheduleNote && (
          <div className="muted" style={{ fontSize: 11 }}>{r.scheduleNote}</div>
        )}
        {r.scheduleSource && (
          <div style={{ fontSize: 11 }}>
            <a href={r.scheduleSource} target="_blank" rel="noreferrer">日程の出典</a>
          </div>
        )}
      </td>
      <td className="small" style={{ minWidth: 220, whiteSpace: 'normal', maxWidth: 340 }}>
        {r.statsUnverified ? (
          <div className="project-warning-text">未確認</div>
        ) : (
          <>
            <div className="muted">{r.statsYear}</div>
            {r.statsLines.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </>
        )}
        {r.statsNote && <div className="muted" style={{ fontSize: 11 }}>{r.statsNote}</div>}
        {r.statsSource && (
          <div style={{ fontSize: 11 }}>
            <a href={r.statsSource} target="_blank" rel="noreferrer">統計の出典</a>
          </div>
        )}
      </td>
      <td className="small" style={{ minWidth: 200, whiteSpace: 'normal', maxWidth: 300 }}>
        <div>
          {r.verification.calendarCheckedAt ?? '—'}{' '}
          {r.verification.selfChecked ? <Badge variant="success">原文照合</Badge> : <Badge variant="warning">調査担当のみ</Badge>}
        </div>
        {r.verification.actions.map((a) => (
          <div key={a} className="project-warning-text" style={{ fontSize: 11 }}>{a}</div>
        ))}
        {r.verification.records.map((x) => (
          <div key={x} className="muted" style={{ fontSize: 11 }}>{x}</div>
        ))}
      </td>
    </tr>
  );
}
