import Link from 'next/link';
import { numCol, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
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
        <p className="text-sm text-muted-foreground">データなし</p>
      ) : (
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>セラー</TableHead>
              <TableHead>資格</TableHead>
              <TableHead className={numCol}>出品</TableHead>
              <TableHead className={numCol}>最低</TableHead>
              <TableHead className={numCol}>中央</TableHead>
              <TableHead className={numCol}>最高</TableHead>
              <TableHead className={numCol}>累計販売</TableHead>
              <TableHead className={numCol}>販売の増分</TableHead>
              <TableHead className={numCol}>売上</TableHead>
              <TableHead className={numCol}>売上の増分</TableHead>
              <TableHead className={numCol}>評価</TableHead>
              <TableHead>変化</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!exam || view.self.exams.includes(exam)) && (
              <Row row={view.self} examLabels={view.examLabels} self />
            )}
            {rows.map((r) => (
              <Row key={r.handle} row={r} examLabels={view.examLabels} />
            ))}
          </TableBody>
        </TableFrame>
      )}
    </>
  );
}

function Row({ row: r, examLabels, self }: { row: CompetitorRow; examLabels: Record<string, string>; self?: boolean }) {
  return (
    <TableRow className={self ? 'font-semibold' : undefined}>
      <TableCell>
        {self ? (
          r.label
        ) : (
          <a href={`https://coconala.com/users/${r.handle}`} target="_blank" rel="noreferrer">
            {r.label}
          </a>
        )}
      </TableCell>
      <TableCell className="text-xs">{r.exams.map((e) => examLabels[e] ?? e).join('・')}</TableCell>
      <TableCell className={numCol}>{r.services ?? '—'}</TableCell>
      <TableCell className={numCol}>{yen(r.priceMin)}</TableCell>
      <TableCell className={numCol}>{yen(r.priceMedian)}</TableCell>
      <TableCell className={numCol}>{yen(r.priceMax)}</TableCell>
      <TableCell className={numCol}>{r.sales?.toLocaleString('ja-JP') ?? '—'}</TableCell>
      <TableCell className={numCol}>{r.salesDelta === null ? '新規' : `+${r.salesDelta}（${md(r.baseDate)}〜）`}</TableCell>
      <TableCell className={numCol}>
        {money(r.revenueYen, r.revenueEstimated)}
        {r.partial && <span className="text-xs text-muted-foreground">（一部）</span>}
      </TableCell>
      <TableCell className={numCol}>{r.revenueDeltaYen === null ? '—' : `+${money(r.revenueDeltaYen, r.revenueEstimated)}`}</TableCell>
      <TableCell className={numCol}>{r.rating ?? '—'}</TableCell>
      <TableCell className="text-xs">{r.changes.join(' / ') || '—'}</TableCell>
    </TableRow>
  );
}
