import Link from 'next/link';
import { numCol, PanelCard, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import SectionTabs from '@/components/SectionTabs';
import UpcomingEvents from '@/components/UpcomingEvents';
import { Badge } from '@/components/ui/badge';
import { loadQualificationsView, type QualificationView } from '@/lib/qualifications';

export const dynamic = 'force-dynamic';

const PORTFOLIO_LABEL: Record<string, string> = { active: '展開中', candidate: '候補', declined: '見送り' };
const PORTFOLIO_VARIANT: Record<string, 'success' | 'outline' | 'secondary'> = { active: 'success', candidate: 'outline', declined: 'secondary' };
function fmtDate(date: string): string {
  const [, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${m}/${d}`;
}

/**
 * /strategy/qualifications — 資格一覧（人が見る画面）。資格・状態・試験日・合格発表・受験者数・合格率だけを出す。
 *
 * 正本は .claude/config/qualification-registry.json（一覧と展開状態）・exam-calendar.json（日程）・
 * exam-stats.json（受験者数）。出典・照合記録・未確認の理由は正本と `npm run exam-ssot-status`
 * （月次レビュー）が持つので、この画面には出さない。正本の不整合があるときだけ警告を出す。
 * 区分（一次・二次など）ごとに試験日・合格発表・受験者数・合格率を横に揃え、過ぎた日付は薄く出す。
 */
type SortKey = 'registry' | 'name' | 'examinees';

export default async function QualificationsPage({ searchParams }: { searchParams: Promise<{ sort?: string; dir?: string }> }) {
  const { sort: sortParam, dir: dirParam } = await searchParams;
  const view = loadQualificationsView();
  const sort: SortKey = sortParam === 'name' || sortParam === 'examinees' ? sortParam : 'registry';
  const dir = dirParam === 'asc' || dirParam === 'desc' ? dirParam : sort === 'examinees' ? 'desc' : 'asc';
  const sign = dir === 'asc' ? 1 : -1;
  const rows = [...view.rows];
  if (sort === 'name') rows.sort((a, b) => sign * a.label.localeCompare(b.label, 'ja'));
  // 受験者数が無い資格は向きに関係なく末尾
  if (sort === 'examinees') rows.sort((a, b) => (a.examineesMax == null ? 1 : b.examineesMax == null ? -1 : sign * (a.examineesMax - b.examineesMax)));

  /** 列見出しのリンク。同じ列をもう一度押すと向きが反転する。 */
  const SortHead = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => {
    const active = sort === k;
    const next = active ? (dir === 'asc' ? 'desc' : 'asc') : k === 'examinees' ? 'desc' : 'asc';
    return (
      <TableHead className={className}>
        <Link href={`/strategy/qualifications?sort=${k}&dir=${next}`}>
          {children}
          {active ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}
        </Link>
      </TableHead>
    );
  };

  return (
    <>
      <PageHead title="資格一覧" />
      <SectionTabs set="market" current="/strategy/qualifications" />
      <UpcomingEvents domain="exam" />

      {view.errors.length > 0 && (
        <PanelCard title={`正本の不整合 ${view.errors.length} 件`}>
          <p className="text-sm text-muted-foreground">npm run check-exam-calendar で詳細を確認して正本を直す。</p>
        </PanelCard>
      )}

      <TableFrame>
          <TableHeader>
            <TableRow>
              <SortHead k="name">資格</SortHead>
              <TableHead>状態</TableHead>
              <TableHead>試験日</TableHead>
              <TableHead>合格発表</TableHead>
              <SortHead k="examinees" className={numCol}>受験者数</SortHead>
              <TableHead className={numCol}>合格率</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <Row key={r.id} row={r} />
            ))}
          </TableBody>
      </TableFrame>
    </>
  );
}

const Past = ({ past, children }: { past: boolean; children: React.ReactNode }) => (
  <div className={past ? 'text-muted-foreground' : undefined}>{children}</div>
);

function Row({ row: r }: { row: QualificationView }) {
  return (
    <TableRow className="align-top">
      <TableCell className="whitespace-nowrap">{r.label}</TableCell>
      <TableCell className="whitespace-nowrap">
        <Badge variant={PORTFOLIO_VARIANT[r.portfolio] ?? 'secondary'}>{PORTFOLIO_LABEL[r.portfolio] ?? r.portfolio}</Badge>
        {r.portfolioNote && <div className="text-[11px] text-muted-foreground">{r.portfolioNote}</div>}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs">
        {r.lines.map((l) => (
          <Past key={l.stage} past={l.exam?.past ?? false}>
            {l.stage && <span className="text-muted-foreground">{l.stage} </span>}
            {l.exam ? fmtDate(l.exam.date) : l.examWindow ? <span className="text-muted-foreground">{l.examWindow}</span> : '—'}
          </Past>
        ))}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs">
        {r.lines.map((l) => (
          <Past key={l.stage} past={l.result?.past ?? false}>
            {l.result ? (l.result.date ? fmtDate(l.result.date) : <span className="text-muted-foreground">{l.result.window}</span>) : '—'}
          </Past>
        ))}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs text-right tabular-nums">
        {r.lines.map((l) => <div key={l.stage}>{l.examinees}</div>)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs text-right tabular-nums">
        {r.lines.map((l) => <div key={l.stage}>{l.rate}</div>)}
      </TableCell>
    </TableRow>
  );
}
