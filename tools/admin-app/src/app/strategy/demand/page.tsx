import Link from 'next/link';
import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { Section, Stack } from '@/components/layout';
import SectionTabs from '@/components/SectionTabs';
import { loadDemand, type Candidate } from '@/lib/demand';
import { num, yen } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * /strategy/demand — 悩みと商品候補（人が見る画面）。決めるのは商品候補を続けるか・止めるか・保留にするか。
 * タブは「商品候補」（判定日と実売）と「悩み・立場」（候補の出どころ）。需要の証拠・仮説・停止条件・次の検証の文章は出さず、
 * 正本（台帳 config.demand-map）と月次の読み物（npm run report-demand-map）に置く。組み立ては scripts/lib/demand-map.mjs。
 */
const STATUS_LABEL: Record<string, string> = {
  idea: '候補', decided: '決定', building: '制作中', live: '販売中', hold: '保留', stopped: '停止',
  candidate: '検討中', proposed: '提案', running: '実行中', done: '完了', abandoned: '中止',
};
const STATUS_TONE: Record<string, Tone> = { idea: 'neutral', decided: 'info', building: 'warn', live: 'good', hold: 'neutral', stopped: 'bad', candidate: 'neutral', proposed: 'neutral', running: 'warn', done: 'good', abandoned: 'bad' };
/** 状態の並び（販売中・作るものを上、保留・停止を下） */
const STATUS_ORDER: Record<string, number> = { live: 0, building: 1, decided: 2, idea: 3, hold: 4, stopped: 5 };
const badge = (s: string) => <StatusBadge tone={STATUS_TONE[s] ?? 'neutral'}>{STATUS_LABEL[s] ?? s}</StatusBadge>;
const md = (date: string | null) => (date ? `${Number(date.slice(0, 4))}/${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}` : '—');

/** 形式の文章から売り場だけを取り出す（note・ココナラ・サイト・Kindle） */
function channelOf(format: string): string {
  const found = [['note', /note/], ['ココナラ', /ココナラ/], ['サイト', /サイト/], ['Kindle', /Kindle/]] as const;
  const names = found.filter(([, re]) => re.test(format)).map(([name]) => name);
  return names.length ? names.join('＋') : format;
}
/** 題名の補足（「：」より後ろ・末尾の括弧書き）を外す */
const shortTitle = (title: string) => title.split('：')[0].replace(/（[^（）]*）$/, '');

const TABS = [
  { id: 'candidates', label: '商品候補' },
  { id: 'pains', label: '悩み・立場' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const CANDIDATE_COLUMNS: DataTableColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: '商品候補', wrap: true },
  { key: 'qualification', label: '資格' },
  { key: 'channel', label: '売り場' },
  { key: 'status', label: '状態' },
  { key: 'judgeDate', label: '判定日' },
  { key: 'sold', label: '実売', num: true },
];
const PAIN_COLUMNS: DataTableColumn[] = [
  { key: 'label', label: '悩み' },
  { key: 'harm', label: 'HARM' },
  { key: 'depth', label: '深さ' },
  { key: 'candidates', label: '候補', num: true },
];
const POSITION_COLUMNS: DataTableColumn[] = [
  { key: 'label', label: '立場' },
  { key: 'status', label: '状態' },
];
const ACTION_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '打ち手', wrap: true },
  { key: 'judgeDate', label: '判定日' },
  { key: 'status', label: '状態' },
];

export default async function DemandPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const current: TabId = TABS.some((t) => t.id === tab) ? (tab as TabId) : 'candidates';
  const view = loadDemand();

  return (
    <>
      <PageHead title="悩みと商品候補" />
      <SectionTabs set="market" current="/strategy/demand" />
      {!view ? (
        <p className="text-sm text-muted-foreground">悩みと商品候補の台帳がありません。</p>
      ) : (
        <>
          <nav className="filterbar mb-3!">
            {TABS.map((t) => (
              <Link key={t.id} className={'chip' + (t.id === current ? ' active' : '')} href={t.id === 'candidates' ? '/strategy/demand' : `/strategy/demand?tab=${t.id}`}>
                {t.label}
              </Link>
            ))}
          </nav>
          <Stack>
            {view.errors.length > 0 && (
              <PanelCard title={`正本の不整合 ${view.errors.length} 件`}>
                <ul className="text-xs">{view.errors.map((e) => <li key={e}>{e}</li>)}</ul>
              </PanelCard>
            )}
            {view.research.due && (
              <PanelCard title="外の調査の期限">
                <span className="text-sm">{view.research.nextLabel}・{md(view.research.dueDate)}</span>
              </PanelCard>
            )}
            {current === 'candidates' ? <Candidates candidates={view.candidates} /> : <PainsAndPositions view={view} />}
          </Stack>
        </>
      )}
    </>
  );
}

function Candidates({ candidates }: { candidates: Candidate[] }) {
  const rows: DataTableRow[] = [...candidates]
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || a.judgeDate.localeCompare(b.judgeDate))
    .map((c) => ({
      id: c.id,
      values: { id: c.id, title: shortTitle(c.title), qualification: c.qualificationLabel, channel: channelOf(c.format), status: STATUS_LABEL[c.status] ?? c.status, judgeDate: c.judgeDate, sold: c.sold ? c.sold.yen : null },
      cells: {
        status: badge(c.status),
        judgeDate: md(c.judgeDate),
        sold: c.sold ? `${num(c.sold.count)}件 ${yen(c.sold.yen)}` : '—',
      },
    }));
  return <DataTable columns={CANDIDATE_COLUMNS} rows={rows} pageSize={100} />;
}

function PainsAndPositions({ view }: { view: NonNullable<ReturnType<typeof loadDemand>> }) {
  const painLabel = Object.fromEntries(view.pains.map((p) => [p.id, p.label]));
  const painRows: DataTableRow[] = view.pains.map((p) => ({
    id: p.id,
    values: { label: p.label, harm: p.harm.join(''), depth: p.depth === 'core' ? '主軸' : '深追いしない', candidates: p.candidateCount.similar + p.candidateCount.differentiated },
  }));
  const positionRows: DataTableRow[] = view.positions.map((p) => ({
    id: p.id,
    values: { label: p.label, status: p.status === 'live' ? '公開' : (STATUS_LABEL[p.status] ?? p.status) },
    cells: { status: <StatusBadge tone={p.status === 'live' ? 'good' : 'neutral'}>{p.status === 'live' ? '公開' : (STATUS_LABEL[p.status] ?? p.status)}</StatusBadge> },
  }));
  const actionRows: DataTableRow[] = view.actions.map((a) => ({
    id: a.id,
    values: { title: `${a.title}（${painLabel[a.painId] ?? a.painId}）`, judgeDate: a.judgeDate ?? '', status: STATUS_LABEL[a.status] ?? a.status },
    cells: { judgeDate: md(a.judgeDate), status: badge(a.status) },
  }));
  return (
    <>
      <Section title="悩み">
        <DataTable columns={PAIN_COLUMNS} rows={painRows} pageSize={50} />
      </Section>
      <Section title="立場">
        <DataTable columns={POSITION_COLUMNS} rows={positionRows} pageSize={50} />
      </Section>
      {actionRows.length > 0 && (
        <Section title="打ち手">
          <DataTable columns={ACTION_COLUMNS} rows={actionRows} pageSize={50} />
        </Section>
      )}
    </>
  );
}
