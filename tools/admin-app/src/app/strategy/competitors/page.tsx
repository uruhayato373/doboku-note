import Link from 'next/link';
import { PageHead } from '@/components/ui';
import SectionTabs from '@/components/SectionTabs';
import { loadCompetitorView, type CompetitorRow } from '@/lib/competitors';

export const dynamic = 'force-dynamic';

/**
 * /strategy/competitors — 競合（人が見る画面）。チャネルはサイドバーの枝にせず画面内のタブにする（domains.json navRules）。
 * 今はココナラだけ。先頭に自社、続けて競合を売上（推定）の多い順に並べ、資格で絞り込む。組み立ては lib/competitors.ts。
 */
const yen = (n: number | null) => (n === null ? '—' : `¥${n.toLocaleString('ja-JP')}`);
/** 推定値は ≈ を付ける（競合の売上は公開されておらず、累計販売 × 平均単価の推定）。 */
const money = (n: number | null, estimated: boolean) => (n === null ? '—' : `${estimated ? '≈' : ''}${yen(n)}`);
const md = (date: string | null) => {
  if (!date) return '—';
  const [, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${m}/${d}`;
};

export default async function CompetitorsPage({ searchParams }: { searchParams: Promise<{ exam?: string }> }) {
  const { exam } = await searchParams;
  const view = loadCompetitorView();
  const exams = [...new Set(view.rows.flatMap((r) => r.exams))].sort((a, b) =>
    (view.examLabels[a] ?? a).localeCompare(view.examLabels[b] ?? b, 'ja'),
  );
  const rows = view.rows
    .filter((r) => !exam || r.exams.includes(exam))
    .sort((a, b) => (b.revenueYen ?? -1) - (a.revenueYen ?? -1));

  return (
    <>
      <PageHead title="競合" sub={view.fetchedDate ? `取得 ${md(view.fetchedDate)}` : undefined} />
      <SectionTabs set="market" current="/strategy/competitors" />
      <nav className="filterbar" style={{ marginBottom: 8 }}>
        <span className="chip active">ココナラ</span>
      </nav>
      <nav className="filterbar" style={{ marginBottom: 12 }}>
        <Link className={'chip' + (!exam ? ' active' : '')} href="/strategy/competitors">
          すべて {view.rows.length}
        </Link>
        {exams.map((id) => (
          <Link
            key={id}
            className={'chip' + (exam === id ? ' active' : '')}
            href={`/strategy/competitors?exam=${encodeURIComponent(id)}`}
          >
            {view.examLabels[id] ?? id} {view.rows.filter((r) => r.exams.includes(id)).length}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="small muted">データなし</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>セラー</th>
                <th>資格</th>
                <th className="num">出品</th>
                <th className="num">最低</th>
                <th className="num">中央</th>
                <th className="num">最高</th>
                <th className="num">累計販売</th>
                <th className="num">販売の増分</th>
                <th className="num">売上</th>
                <th className="num">売上の増分</th>
                <th className="num">評価</th>
                <th>変化</th>
              </tr>
            </thead>
            <tbody>
              {(!exam || view.self.exams.includes(exam)) && (
                <Row row={view.self} examLabels={view.examLabels} self />
              )}
              {rows.map((r) => (
                <Row key={r.handle} row={r} examLabels={view.examLabels} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Row({ row: r, examLabels, self }: { row: CompetitorRow; examLabels: Record<string, string>; self?: boolean }) {
  return (
    <tr style={self ? { fontWeight: 600 } : undefined}>
      <td>
        {self ? (
          r.label
        ) : (
          <a href={`https://coconala.com/users/${r.handle}`} target="_blank" rel="noreferrer">
            {r.label}
          </a>
        )}
      </td>
      <td className="small">{r.exams.map((e) => examLabels[e] ?? e).join('・')}</td>
      <td className="num">{r.services ?? '—'}</td>
      <td className="num">{yen(r.priceMin)}</td>
      <td className="num">{yen(r.priceMedian)}</td>
      <td className="num">{yen(r.priceMax)}</td>
      <td className="num">{r.sales?.toLocaleString('ja-JP') ?? '—'}</td>
      <td className="num">{r.salesDelta === null ? '新規' : `+${r.salesDelta}（${md(r.baseDate)}〜）`}</td>
      <td className="num">
        {money(r.revenueYen, r.revenueEstimated)}
        {r.partial && <span className="small muted">（一部）</span>}
      </td>
      <td className="num">{r.revenueDeltaYen === null ? '—' : `+${money(r.revenueDeltaYen, r.revenueEstimated)}`}</td>
      <td className="num">{r.rating ?? '—'}</td>
      <td className="small">{r.changes.join(' / ') || '—'}</td>
    </tr>
  );
}
