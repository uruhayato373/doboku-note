import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { PageHead } from '@/components/ui';
import SectionTabs from '@/components/SectionTabs';
import UpcomingEvents from '@/components/UpcomingEvents';
import { loadQualificationsView, type QualificationView } from '@/lib/qualifications';
import { monthDay } from '@/lib/format';

export const dynamic = 'force-dynamic';

const PORTFOLIO_LABEL: Record<string, string> = { active: '展開中', candidate: '候補', declined: '見送り' };
const PORTFOLIO_TONE: Record<string, Tone> = { active: 'good', candidate: 'neutral', declined: 'info' };

/**
 * /strategy/qualifications — 資格一覧（人が見る画面）。資格・状態・試験日・合格発表・受験者数・合格率だけを出す。
 *
 * 正本は config/qualification-registry.json（一覧と展開状態）・exam-calendar.json（日程）・
 * exam-stats.json（受験者数）。出典・照合記録・未確認の理由は正本と `npm run exam-ssot-status`
 * （月次レビュー）が持つので、この画面には出さない。正本の不整合があるときだけ警告を出す。
 * 区分（一次・二次など）ごとに試験日・合格発表・受験者数・合格率を横に揃え、過ぎた日付は薄く出す。
 */
const COLUMNS: DataTableColumn[] = [
  { key: 'label', label: '資格' },
  { key: 'portfolio', label: '状態' },
  { key: 'exam', label: '試験日', sortable: false },
  { key: 'result', label: '合格発表', sortable: false },
  { key: 'examinees', label: '受験者数', num: true },
  { key: 'rate', label: '合格率', num: true, sortable: false },
];

export default function QualificationsPage() {
  const view = loadQualificationsView();

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

      <DataTable columns={COLUMNS} rows={view.rows.map(toRow)} pageSize={100} />
    </>
  );
}

const Past = ({ past, children }: { past: boolean; children: React.ReactNode }) => (
  <div className={past ? 'text-muted-foreground' : undefined}>{children}</div>
);

function toRow(r: QualificationView): DataTableRow {
  const examText = r.lines.map((l) => `${l.stage ? `${l.stage} ` : ''}${l.exam ? monthDay(l.exam.date) : (l.examWindow ?? '—')}`).join(' / ');
  const resultText = r.lines.map((l) => (l.result ? (l.result.date ? monthDay(l.result.date) : (l.result.window ?? '—')) : '—')).join(' / ');
  return {
    id: r.id,
    values: {
      label: r.label,
      portfolio: PORTFOLIO_LABEL[r.portfolio] ?? r.portfolio,
      exam: examText,
      result: resultText,
      examinees: r.examineesMax,
      rate: r.lines.map((l) => l.rate).join(' / '),
    },
    cells: {
      portfolio: (
        <>
          <StatusBadge tone={PORTFOLIO_TONE[r.portfolio] ?? 'info'}>{PORTFOLIO_LABEL[r.portfolio] ?? r.portfolio}</StatusBadge>
          {r.portfolioNote && <div className="text-[11px] text-muted-foreground">{r.portfolioNote}</div>}
        </>
      ),
      exam: (
        <div className="text-xs">
          {r.lines.map((l) => (
            <Past key={l.stage} past={l.exam?.past ?? false}>
              {l.stage && <span className="text-muted-foreground">{l.stage} </span>}
              {l.exam ? monthDay(l.exam.date) : l.examWindow ? <span className="text-muted-foreground">{l.examWindow}</span> : '—'}
            </Past>
          ))}
        </div>
      ),
      result: (
        <div className="text-xs">
          {r.lines.map((l) => (
            <Past key={l.stage} past={l.result?.past ?? false}>
              {l.result ? (l.result.date ? monthDay(l.result.date) : <span className="text-muted-foreground">{l.result.window}</span>) : '—'}
            </Past>
          ))}
        </div>
      ),
      examinees: <div className="text-xs">{r.lines.map((l) => <div key={l.stage}>{l.examinees}</div>)}</div>,
      rate: <div className="text-xs">{r.lines.map((l) => <div key={l.stage}>{l.rate}</div>)}</div>,
    },
  };
}
