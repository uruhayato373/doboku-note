import Link from 'next/link';
import { DataTable, DetailList, DetailSheet, DetailText, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { Section, Stack } from '@/components/layout';
import SectionTabs from '@/components/SectionTabs';
import { loadDemand, type Candidate } from '@/lib/demand';
import { num, yen } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * /strategy/demand — 悩みと商品候補（人が見る画面）。決めるのは商品候補を続けるか・止めるか・保留にするか。
 * タブは「商品候補」（判定日と実売）と「悩み・立場」（候補の出どころ）。表は判断に要る値だけにし、需要の証拠・仮説・停止条件・
 * 次の検証は名前を押すと開く詳細シート（DetailSheet）に置く。正本は台帳 config.demand-map、組み立ては scripts/lib/demand-map.mjs。
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
  { key: 'title', label: '打ち手' },
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

/** 打ち手の名前の最初の句（括弧書き・読点より後ろは詳細へ） */
const firstClause = (title: string) => title.split(/[（、]/)[0];
const evidenceLines = (items: { summary: string; value?: string }[]) => items.map((e) => (e.value ? `${e.summary}（${e.value}）` : e.summary));

function Candidates({ candidates }: { candidates: Candidate[] }) {
  const rows: DataTableRow[] = [...candidates]
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || a.judgeDate.localeCompare(b.judgeDate))
    .map((c) => ({
      id: c.id,
      values: { id: c.id, title: shortTitle(c.title), qualification: c.qualificationLabel, channel: channelOf(c.format), status: STATUS_LABEL[c.status] ?? c.status, judgeDate: c.judgeDate, sold: c.sold ? c.sold.yen : null },
      cells: {
        title: (
          <DetailSheet trigger={shortTitle(c.title)} title={c.title} description={`${c.id}・${c.qualificationLabel}`}>
            <DetailList
              items={[
                { label: '状態', value: badge(c.status) },
                { label: '形式', value: c.format },
                { label: '価格の案', value: c.priceIdea },
                { label: '判定日', value: md(c.judgeDate) },
                { label: 'カード', value: [c.card, c.experimentId].filter(Boolean).join('・') },
              ]}
            />
            <DetailText title="読者の課題" items={[c.readerProblem]} />
            <DetailText title="支払う理由" items={[c.payReason]} />
            <DetailText title="需要の証拠" items={evidenceLines(c.demandEvidence)} />
            <DetailText title="未確認" items={c.unverified} />
            <DetailText title="指標" items={[c.metric]} />
            <DetailText title="止める条件" items={[c.stopCondition]} />
            <DetailText title="次の検証" items={[c.nextCheck]} />
          </DetailSheet>
        ),
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
    cells: {
      label: (
        <DetailSheet trigger={p.label} title={p.label} description={`HARM ${p.harm.join('')}・${p.depth === 'core' ? '主軸' : '深追いしない'}`}>
          <DetailText title="検索語" items={[p.phrases.join('・')]} />
          <DetailText title="深さの理由" items={[p.why]} />
          <DetailText title="需要の証拠" items={evidenceLines(p.evidence)} />
          <DetailText title="仮説" items={[p.hypothesis]} />
          <DetailText title="ハブの候補" items={(p.hubs ?? []).map((h) => `${STATUS_LABEL[h.status] ?? h.status}: ${h.title}`)} />
        </DetailSheet>
      ),
    },
  }));
  const positionRows: DataTableRow[] = view.positions.map((p) => ({
    id: p.id,
    values: { label: p.label, status: p.status === 'live' ? '公開' : (STATUS_LABEL[p.status] ?? p.status) },
    cells: {
      label: (
        <DetailSheet trigger={p.label} title={p.label} description={p.topic ? `/topics/${p.topic}` : undefined}>
          <DetailText title="強い悩み" items={p.pains.map((x) => painLabel[x] ?? x)} />
          <DetailText title="需要の証拠" items={evidenceLines(p.evidence)} />
          <DetailText title="メモ" items={[p.note]} />
        </DetailSheet>
      ),
      status: <StatusBadge tone={p.status === 'live' ? 'good' : 'neutral'}>{p.status === 'live' ? '公開' : (STATUS_LABEL[p.status] ?? p.status)}</StatusBadge>,
    },
  }));
  const actionRows: DataTableRow[] = view.actions.map((a) => ({
    id: a.id,
    values: { title: firstClause(a.title), judgeDate: a.judgeDate ?? '', status: STATUS_LABEL[a.status] ?? a.status },
    cells: {
      title: (
        <DetailSheet trigger={firstClause(a.title)} title={a.title} description={a.id}>
          <DetailList
            items={[
              { label: '悩み', value: painLabel[a.painId] ?? a.painId },
              { label: '状態', value: badge(a.status) },
              { label: '判定日', value: md(a.judgeDate) },
              { label: 'カード', value: a.card },
            ]}
          />
          <DetailText title="指標" items={[a.metric]} />
          <DetailText title="止める条件" items={[a.stopCondition]} />
        </DetailSheet>
      ),
      judgeDate: md(a.judgeDate),
      status: badge(a.status),
    },
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
