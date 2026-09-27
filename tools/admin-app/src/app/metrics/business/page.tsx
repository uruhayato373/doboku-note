import Link from 'next/link';
import { PageHead } from '@/components/ui';
import { findRepoRoot } from '@/lib/repo-root';
import { buildReport, reviewPeriod, samePeriod } from '../../../../../../scripts/lib/business-direction.mjs';
import { buildReviewView } from '../../../../../../scripts/lib/review-wiring.mjs';
import RecordPanel from './RecordPanel';

export const dynamic = 'force-dynamic';

/**
 * 戦略 ＞ レビュー。週次・月次それぞれの実行状況と、配線（入力 → 判断 → 出力）を図にする。
 * 配線の正本は .claude/config/review-wiring.json（スキルとの一致は check-review-wiring）、
 * 判断はレビュー記録（review-*.json）、出力は起点に「週次レビュー（期間）」を書いたカード・実験・週次計画。
 * KPI の値はトップ（/）。人が読まない点検は件数だけ出し、中身は折りたたむ。
 */
type Input = { command: string; label: string };
type Stage = { stage: string; judge: Input[]; check: Input[] };
type Review = { file: string; cadence: string; period: { startDate: string; endDate: string }; status: string; findings: string; decision: string; nextAction: string; experimentIds?: string[]; nextReviewDate: string; createdAt?: string };
type Cadence = {
  id: string;
  label: string;
  outputs: string[];
  byStage: Stage[];
  counts: { judge: number; check: number };
  drift: { missing: string[]; extra: string[] };
  due: { due: boolean; period: { startDate: string; endDate: string }; status?: string } | null;
  latest: Review | null;
  cards: { id: string; title: string }[];
  weeklyPlan: string | null;
  history: Review[];
};

const box: React.CSSProperties = { border: '1px solid var(--line, #444)', borderRadius: 8, padding: 12, flex: 1, minWidth: 220 };
const arrow = <div style={{ alignSelf: 'center', fontSize: 20, opacity: 0.6 }}>→</div>;

function Status({ c }: { c: Cadence }) {
  const overdue = c.due?.due;
  return (
    <p>
      <span className={`badge ${overdue ? 'warn' : 'good'}`}>{overdue ? '未実施' : '実施済み'}</span>{' '}
      {c.latest ? (
        <>
          最終 {c.latest.period.startDate}〜{c.latest.period.endDate}（{c.latest.status === 'provisional' ? '暫定' : '完了'}）・次回 {c.latest.nextReviewDate}
        </>
      ) : (
        '記録なし'
      )}
      {overdue && c.due && <> ・ 対象 {c.due.period.startDate}〜{c.due.period.endDate} が未記録</>}
    </p>
  );
}

function Wiring({ c }: { c: Cadence }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'stretch' }}>
      <div style={box}>
        <h3 style={{ marginTop: 0 }}>入力 <span className="small muted">判断 {c.counts.judge}・点検 {c.counts.check}</span></h3>
        {c.byStage.map((s) => (
          <div key={s.stage} style={{ marginBottom: 6 }}>
            <strong className="small">{s.stage}</strong>
            <ul style={{ margin: '2px 0 0 16px', padding: 0 }}>
              {s.judge.map((i) => (
                <li key={i.command} className="small">{i.label}</li>
              ))}
            </ul>
            {s.check.length > 0 && (
              <details className="small muted">
                <summary>点検 {s.check.length}</summary>
                <ul style={{ margin: '2px 0 0 16px', padding: 0 }}>{s.check.map((i) => <li key={i.command}>{i.label}</li>)}</ul>
              </details>
            )}
          </div>
        ))}
        {(c.drift.missing.length > 0 || c.drift.extra.length > 0) && <p className="badge warn">配線の正本とスキルがずれている</p>}
      </div>
      {arrow}
      <div style={box}>
        <h3 style={{ marginTop: 0 }}>判断</h3>
        {c.latest ? (
          <>
            <p className="small muted">{c.latest.period.startDate}〜{c.latest.period.endDate}</p>
            <p className="small"><strong>判断:</strong> {c.latest.decision}</p>
            <p className="small"><strong>次の一手:</strong> {c.latest.nextAction}</p>
          </>
        ) : (
          <p className="small muted">記録なし</p>
        )}
      </div>
      {arrow}
      <div style={box}>
        <h3 style={{ marginTop: 0 }}>出力</h3>
        <p className="small">
          起票カード {c.cards.length}
          {c.cards.length > 0 && <>（{c.cards.map((x) => x.id).join('・')}）</>}
        </p>
        <p className="small">実験 {c.latest?.experimentIds?.length ?? 0}{c.latest?.experimentIds?.length ? `（${c.latest.experimentIds.join('・')}）` : ''}</p>
        {c.weeklyPlan && <p className="small">週次計画: <Link href="/todo?f=weekly">{c.weeklyPlan.replace(/^#\s*/, '')}</Link></p>}
        <details className="small muted">
          <summary>出力先</summary>
          <ul style={{ margin: '2px 0 0 16px', padding: 0 }}>{c.outputs.map((o) => <li key={o}>{o}</li>)}</ul>
        </details>
      </div>
    </div>
  );
}

export default async function ReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const search = await searchParams;
  const cadence = search.cadence === 'monthly' ? 'monthly' : 'weekly';
  const period = search.start && search.end ? { startDate: search.start, endDate: search.end } : reviewPeriod(cadence);
  const root = findRepoRoot();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let data: any;
  try {
    data = buildReport(root, period);
  } catch {
    return (
      <>
        <PageHead title="レビュー" />
        <p className="card">設定・計測期間を読み取れない。<Link href="/metrics/business">直近の週次へ戻る</Link></p>
      </>
    );
  }
  const cadences = buildReviewView(root, { reviews: data.reviews, due: data.due }) as Cadence[];
  const existingReview = data.reviews.find((r: Review) => r.cadence === cadence && samePeriod(r.period, period));

  return (
    <>
      <PageHead title="レビュー" />
      {cadences.map((c) => (
        <div className="card" key={c.id}>
          <h2>{c.label}レビュー</h2>
          <Status c={c} />
          <Wiring c={c} />
          {c.history.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary className="small">これまでの判断 {c.history.length}</summary>
              {c.history.map((r) => (
                <div key={r.file} className="small" style={{ margin: '6px 0' }}>
                  <strong>{r.period.startDate}〜{r.period.endDate}</strong>（{r.status === 'provisional' ? '暫定' : '完了'}）: {r.decision}
                </div>
              ))}
            </details>
          )}
        </div>
      ))}

      <details className="card">
        <summary>記録する（計測・目標・レビューの手入力）</summary>
        <form className="filterbar">
          <input type="hidden" name="cadence" value={cadence} />
          <Link href="/metrics/business">前週</Link>
          <Link href="/metrics/business?cadence=monthly">前月</Link>
          <label>開始 <input aria-label="開始日" type="date" name="start" defaultValue={period.startDate} required /></label>
          <label>終了 <input aria-label="終了日" type="date" name="end" defaultValue={period.endDate} required /></label>
          <button>表示</button>
        </form>
        <p className="small">{period.startDate}〜{period.endDate} · {cadence === 'monthly' ? '月次' : '週次'}</p>
        <RecordPanel strategy={data.strategy} period={period} cadence={cadence} existingReview={existingReview} observations={data.observations} />
      </details>
    </>
  );
}
