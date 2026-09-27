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

const stepHead: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px' };
const num = (n: number) => (
  <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: 11, background: 'var(--panel-2)', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{n}</span>
);

/** 週次・月次の切り替えタブ。各タブに状態（未実施・実施済み）を添える。 */
function CadenceTabs({ list, current }: { list: Cadence[]; current: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 16 }}>
      {list.map((c) => {
        const overdue = c.due?.due;
        const active = c.id === current;
        return (
          <Link
            key={c.id}
            href={c.id === 'weekly' ? '/metrics/business' : `/metrics/business?cadence=${c.id}`}
            className="card"
            style={{ margin: 0, padding: 14, textDecoration: 'none', color: 'inherit', boxShadow: active ? 'inset 0 0 0 2px var(--accent, #6aa0ff)' : undefined }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ fontSize: 18 }}>{c.label}レビュー</strong>
              <span className={`badge ${overdue ? 'warn' : 'good'}`}>{overdue ? '未実施' : '実施済み'}</span>
            </div>
            <div className="small muted" style={{ marginTop: 4 }}>
              {c.latest ? `最終 ${c.latest.period.startDate.slice(5)}〜${c.latest.period.endDate.slice(5)}・次回 ${c.latest.nextReviewDate.slice(5)}` : '記録なし'}
            </div>
            {overdue && c.due && <div className="small" style={{ color: 'var(--warn)' }}>{c.due.period.startDate.slice(5)}〜{c.due.period.endDate.slice(5)} が未記録</div>}
          </Link>
        );
      })}
    </div>
  );
}

function Output({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const body = (
    <>
      <div className="small muted">{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </>
  );
  return (
    <div className="card" style={{ margin: 0, padding: 12 }}>
      {href ? <Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>{body}</Link> : body}
    </div>
  );
}

/** 1 つのレビューを「① 何を見るか → ② 何を決めたか → ③ 何を出したか」の縦の流れで出す。 */
function Flow({ c }: { c: Cadence }) {
  const checks = c.byStage.reduce((n, s) => n + s.check.length, 0);
  const drifted = c.drift.missing.length > 0 || c.drift.extra.length > 0;
  return (
    <>
      <div className="card">
        <h2 style={stepHead}>{num(1)} 判断 {c.latest && <span className="sub">{c.latest.period.startDate}〜{c.latest.period.endDate}{c.latest.status === 'provisional' ? '（暫定）' : ''}</span>}</h2>
        {c.latest ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, lineHeight: 1.8 }}>
            <div>
              <div className="small muted">決めたこと</div>
              <p style={{ margin: 0 }}>{c.latest.decision}</p>
            </div>
            <div>
              <div className="small muted">次の一手</div>
              <p style={{ margin: 0 }}>{c.latest.nextAction}</p>
            </div>
          </div>
        ) : (
          <p className="muted">まだ記録がない</p>
        )}
      </div>

      <div className="card">
        <h2 style={stepHead}>{num(2)} 出力</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <Output label="起票したカード" value={c.cards.length} href={c.cards.length ? '/todo?f=backlog' : undefined} />
          <Output label="実験" value={c.latest?.experimentIds?.length ?? 0} />
          {c.weeklyPlan && <Output label="週次計画" value="開く →" href="/todo?f=weekly" />}
        </div>
        {c.cards.length > 0 && (
          <ul className="small" style={{ margin: '10px 0 0', paddingLeft: 18 }}>
            {c.cards.map((x) => (
              <li key={x.id}>
                <Link className="mono" href={`/todo?f=backlog&id=${x.id}`}>{x.id}</Link> {x.title}
              </li>
            ))}
          </ul>
        )}
        {c.latest?.experimentIds?.length ? <p className="small" style={{ marginBottom: 0 }}>実験: {c.latest.experimentIds.join('・')}</p> : null}
      </div>

      <div className="card">
        <h2 style={stepHead}>{num(3)} 見る材料 <span className="sub">判断に使う {c.counts.judge} 件</span></h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {c.byStage.filter((s) => s.judge.length).map((s) => (
            <div key={s.stage} style={{ display: 'grid', gridTemplateColumns: '7em 1fr', gap: 8, alignItems: 'baseline' }}>
              <span className="small muted">{s.stage}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {s.judge.map((i) => <span key={i.command} className="chip">{i.label}</span>)}
              </div>
            </div>
          ))}
        </div>
        <p className="small muted" style={{ margin: '12px 0 0' }}>ほかに自動の点検 {checks} 件（異常があるときだけ見ればよい）</p>
        {drifted && <p className="badge warn">配線の正本とスキルがずれている</p>}
      </div>

      <Link
        href={c.id === 'weekly' ? '/metrics/business/procedure' : '/metrics/business/procedure?cadence=monthly'}
        className="card"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
      >
        <span>
          <strong>{c.label}レビューの手順を点検する</strong>
          <span className="small muted" style={{ display: 'block' }}>手順ごとの実施の証拠・レポートの節の埋まり具合・実行するコマンドの全件</span>
        </span>
        <span style={{ fontSize: 20, opacity: 0.6 }}>→</span>
      </Link>

      {c.history.length > 0 && (
        <div className="card">
          <h2>これまでの判断</h2>
          <ol style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 10 }}>
            {c.history.map((r) => (
              <li key={r.file} className="small" style={{ borderLeft: '3px solid var(--panel-2)', paddingLeft: 10, lineHeight: 1.7 }}>
                <div className="muted">{r.period.startDate}〜{r.period.endDate}{r.status === 'provisional' ? '（暫定）' : ''}</div>
                {r.decision}
              </li>
            ))}
          </ol>
        </div>
      )}
    </>
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
  const current = cadences.find((c) => c.id === cadence);
  const existingReview = data.reviews.find((r: Review) => r.cadence === cadence && samePeriod(r.period, period));

  return (
    <>
      <PageHead title="レビュー" />
      <CadenceTabs list={cadences} current={cadence} />
      {current && <Flow c={current} />}

      <details className="card">
        <summary>手で記録する（計測・目標・レビュー）</summary>
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
