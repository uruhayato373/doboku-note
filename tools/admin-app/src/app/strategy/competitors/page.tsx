import Link from 'next/link';
import { DataTable, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import SectionTabs from '@/components/SectionTabs';
import { loadCompetitorView, type CompetitorRow } from '@/lib/competitors';
import { num, yen } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * /strategy/competitors — 競合（人が見る画面）。チャネルはサイドバーの枝にせず画面内のタブにする（domains.json navRules）。
 * 今はココナラだけ。先頭に自社、続けて競合を売上（推定）の多い順に並べ、資格で絞り込む。組み立ては lib/competitors.ts。
 */
/** 推定値は ≈ を付ける（競合の売上は公開されておらず、累計販売 × 平均単価の推定）。 */
const money = (n: number | null, estimated: boolean) => (n === null ? '—' : `${estimated ? '≈' : ''}${yen(n)}`);
const md = (date: string | null) => {
  if (!date) return '—';
  const [, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${m}/${d}`;
};

const COLUMNS: DataTableColumn[] = [
  { key: 'label', label: 'セラー' },
  { key: 'exams', label: '資格' },
  { key: 'services', label: '出品', num: true },
  { key: 'priceMin', label: '最低', num: true },
  { key: 'priceMedian', label: '中央', num: true },
  { key: 'priceMax', label: '最高', num: true },
  { key: 'sales', label: '累計販売', num: true },
  { key: 'salesDelta', label: '販売の増分', num: true },
  { key: 'revenue', label: '売上', num: true },
  { key: 'revenueDelta', label: '売上の増分', num: true },
  { key: 'rating', label: '評価', num: true },
  { key: 'changes', label: '変化', sortable: false },
];

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
      <nav className="filterbar mb-2!">
        <span className="chip active">ココナラ</span>
      </nav>
      <nav className="filterbar mb-3!">
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
        <p className="text-sm text-muted-foreground">データなし</p>
      ) : (
        <DataTable
          columns={COLUMNS}
          rows={[
            ...((!exam || view.self.exams.includes(exam)) ? [toRow(view.self, view.examLabels, true)] : []),
            ...rows.map((r) => toRow(r, view.examLabels)),
          ]}
          pageSize={100}
        />
      )}
    </>
  );
}

/** 自社の行は太字（先頭に置く。他の行と同じ列・同じ並べ替え）。 */
function toRow(r: CompetitorRow, examLabels: Record<string, string>, self?: boolean): DataTableRow {
  const bold = (node: React.ReactNode) => (self ? <span className="font-semibold">{node}</span> : node);
  const exams = r.exams.map((e) => examLabels[e] ?? e).join('・');
  const changes = r.changes.join(' / ');
  return {
    id: self ? '__self' : r.handle,
    values: {
      label: r.label,
      exams,
      services: r.services,
      priceMin: r.priceMin,
      priceMedian: r.priceMedian,
      priceMax: r.priceMax,
      sales: r.sales,
      salesDelta: r.salesDelta,
      revenue: r.revenueYen,
      revenueDelta: r.revenueDeltaYen,
      rating: r.rating,
      changes: changes || null,
    },
    cells: {
      label: bold(
        self ? (
          r.label
        ) : (
          <a href={`https://coconala.com/users/${r.handle}`} target="_blank" rel="noreferrer">
            {r.label}
          </a>
        ),
      ),
      exams: bold(<span className="text-xs">{exams}</span>),
      services: bold(r.services ?? '—'),
      priceMin: bold(yen(r.priceMin)),
      priceMedian: bold(yen(r.priceMedian)),
      priceMax: bold(yen(r.priceMax)),
      sales: bold(num(r.sales)),
      salesDelta: bold(r.salesDelta === null ? '新規' : `+${r.salesDelta}（${md(r.baseDate)}〜）`),
      revenue: bold(
        <>
          {money(r.revenueYen, r.revenueEstimated)}
          {r.partial && <span className="text-xs text-muted-foreground">（一部）</span>}
        </>,
      ),
      revenueDelta: bold(r.revenueDeltaYen === null ? '—' : `+${money(r.revenueDeltaYen, r.revenueEstimated)}`),
      rating: bold(r.rating ?? '—'),
      changes: bold(<span className="text-xs">{changes || '—'}</span>),
    },
  };
}
