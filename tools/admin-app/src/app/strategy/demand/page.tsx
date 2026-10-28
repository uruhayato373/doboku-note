import { DataTable, PanelCard, StatCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { PageHead } from '@/components/ui';
import SectionTabs from '@/components/SectionTabs';
import { loadDemand, type Candidate, type Evidence } from '@/lib/demand';
import { num, yen } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * /strategy/demand — 悩みと商品候補（人が見る画面）。配線の順「悩み → 立場 → 資格・テーマ → 商品」で、
 * 悩みごとの深さと証拠、立場の候補、商品候補（類似／差別の軸・需要の証拠・指標・判定日・停止条件）、
 * 打ち手（experiments.json の demand.painId）を並べ、軸ごとの実売を比べる。
 * 正本は台帳 config.demand-map。組み立ては scripts/lib/demand-map.mjs。考え方は docs/strategy/21_分類の軸と回遊の配線2026-10.md。
 */
const AXIS_LABEL = { similar: '類似', differentiated: '差別' } as const;
const AXIS_TONE: Record<string, Tone> = { similar: 'info', differentiated: 'good' };
const STATUS_LABEL: Record<string, string> = {
  idea: '候補', decided: '決定', building: '制作中', live: '販売中', stopped: '停止',
  candidate: '検討中', hold: '見送り', proposed: '提案', running: '実行中', done: '完了', abandoned: '中止',
};
const STATUS_TONE: Record<string, Tone> = { idea: 'neutral', decided: 'info', building: 'warn', live: 'good', stopped: 'bad', candidate: 'neutral', hold: 'bad', proposed: 'neutral', running: 'warn', done: 'good', abandoned: 'bad' };
const md = (date: string | null) => (date ? `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}` : '—');
const badge = (s: string) => <StatusBadge tone={STATUS_TONE[s] ?? 'neutral'}>{STATUS_LABEL[s] ?? s}</StatusBadge>;

function EvidenceList({ items }: { items: Evidence[] }) {
  if (!items.length) return <span className="text-muted-foreground">未確認</span>;
  return (
    <ul className="text-xs">
      {items.map((e, i) => (
        <li key={i} title={`${e.source}（${e.observedAt}）`}>
          {e.summary}
          {e.value ? <span className="text-muted-foreground">（{e.value}）</span> : null}
        </li>
      ))}
    </ul>
  );
}

const CANDIDATE_COLUMNS: DataTableColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: '商品候補', wrap: true },
  { key: 'qualification', label: '資格' },
  { key: 'pain', label: '悩み' },
  { key: 'axis', label: '軸' },
  { key: 'harm', label: 'HARM' },
  { key: 'evidence', label: '需要の証拠', wrap: true, sortable: false },
  { key: 'metric', label: '指標・停止条件', wrap: true, sortable: false },
  { key: 'judgeDate', label: '判定日' },
  { key: 'status', label: '状態' },
  { key: 'sold', label: '実売', num: true },
];

export default function DemandPage() {
  const view = loadDemand();
  if (!view) {
    return (
      <>
        <PageHead title="悩みと商品候補" />
        <SectionTabs set="market" current="/strategy/demand" />
        <p className="text-sm text-muted-foreground">悩みと商品候補の地図（台帳 config.demand-map）がありません。</p>
      </>
    );
  }
  const painLabel = Object.fromEntries(view.pains.map((p) => [p.id, p.label]));
  const positionLabel = Object.fromEntries(view.positions.map((p) => [p.id, p.label]));

  const candidateRows: DataTableRow[] = view.candidates.map((c: Candidate) => ({
    id: c.id,
    values: {
      id: c.id, title: c.title, qualification: c.qualificationLabel, pain: painLabel[c.pain] ?? c.pain, axis: AXIS_LABEL[c.axis],
      harm: c.harm.join(''), evidence: c.demandEvidence.length, metric: c.metric, judgeDate: c.judgeDate, status: STATUS_LABEL[c.status] ?? c.status,
      sold: c.sold ? c.sold.yen : null,
    },
    cells: {
      title: (
        <div className="text-xs">
          <div><strong>{c.title}</strong></div>
          <div className="text-muted-foreground">{c.format}{c.priceIdea ? `・${c.priceIdea}` : ''}{c.positions.length ? `・${c.positions.map((p) => positionLabel[p] ?? p).join('／')}` : ''}</div>
          <div>課題: {c.readerProblem}</div>
          <div>支払う理由: {c.payReason}</div>
        </div>
      ),
      pain: <span className="text-xs">{painLabel[c.pain] ?? c.pain}</span>,
      axis: <StatusBadge tone={AXIS_TONE[c.axis]}>{AXIS_LABEL[c.axis]}</StatusBadge>,
      evidence: (
        <div>
          <EvidenceList items={c.demandEvidence} />
          {c.unverified.length ? <div className="text-xs text-muted-foreground">未確認: {c.unverified.join('／')}</div> : null}
        </div>
      ),
      metric: (
        <div className="text-xs">
          <div>{c.metric}</div>
          <div className="text-muted-foreground">停止: {c.stopCondition}</div>
          <div className="text-muted-foreground">次の検証: {c.nextCheck}</div>
          {c.card || c.experimentId ? <div className="text-muted-foreground">{[c.card, c.experimentId].filter(Boolean).join('・')}</div> : null}
        </div>
      ),
      judgeDate: <span className="text-xs">{md(c.judgeDate)}</span>,
      status: badge(c.status),
      sold: <span className="text-xs">{c.sold ? `${num(c.sold.count)}件 ${yen(c.sold.yen)}` : '—'}</span>,
    },
  }));

  const painColumns: DataTableColumn[] = [
    { key: 'label', label: '悩み' },
    { key: 'harm', label: 'HARM' },
    { key: 'depth', label: '深さ' },
    { key: 'evidence', label: '需要の証拠', wrap: true, sortable: false },
    { key: 'hubs', label: 'ハブの候補', wrap: true, sortable: false },
    { key: 'candidates', label: '商品候補（類似/差別）' },
    { key: 'actions', label: '打ち手', num: true },
  ];
  const painRows: DataTableRow[] = view.pains.map((p) => ({
    id: p.id,
    values: { label: p.label, harm: p.harm.join(''), depth: p.depth, evidence: p.evidence.length, hubs: p.hubs?.length ?? 0, candidates: p.candidateCount.similar + p.candidateCount.differentiated, actions: p.actionCount },
    cells: {
      label: (
        <div className="text-xs">
          <strong>{p.label}</strong>
          <div className="text-muted-foreground">{p.phrases.join('・')}</div>
        </div>
      ),
      depth: <StatusBadge tone={p.depth === 'core' ? 'good' : 'neutral'} title={p.why}>{p.depth === 'core' ? '主軸' : '深追いしない'}</StatusBadge>,
      evidence: (
        <div>
          <EvidenceList items={p.evidence} />
          {p.hypothesis ? <div className="text-xs text-muted-foreground">仮説: {p.hypothesis}</div> : null}
        </div>
      ),
      hubs: (
        <ul className="text-xs">
          {(p.hubs ?? []).map((h) => (
            <li key={h.title}>
              {badge(h.status)} {h.title}
              {h.positions.length ? <span className="text-muted-foreground">（{h.positions.map((x) => positionLabel[x] ?? x).join('／')}）</span> : null}
            </li>
          ))}
        </ul>
      ),
      candidates: <span className="text-xs">{p.candidateCount.similar} / {p.candidateCount.differentiated}</span>,
    },
  }));

  const positionColumns: DataTableColumn[] = [
    { key: 'label', label: '立場' },
    { key: 'status', label: '状態' },
    { key: 'pains', label: '強い悩み', wrap: true },
    { key: 'evidence', label: '需要の証拠', wrap: true, sortable: false },
  ];
  const positionRows: DataTableRow[] = view.positions.map((p) => ({
    id: p.id,
    values: { label: p.label, status: p.status === 'live' ? '公開' : STATUS_LABEL[p.status] ?? p.status, pains: p.pains.map((x) => painLabel[x] ?? x).join('・'), evidence: p.evidence.length },
    cells: {
      label: (
        <div className="text-xs">
          <strong>{p.label}</strong>
          {p.topic ? <div className="text-muted-foreground">/topics/{p.topic}</div> : null}
          {p.note ? <div className="text-muted-foreground">{p.note}</div> : null}
        </div>
      ),
      status: <StatusBadge tone={p.status === 'live' ? 'good' : STATUS_TONE[p.status] ?? 'neutral'}>{p.status === 'live' ? '公開' : STATUS_LABEL[p.status] ?? p.status}</StatusBadge>,
      pains: <span className="text-xs">{p.pains.map((x) => painLabel[x] ?? x).join('・')}</span>,
      evidence: <EvidenceList items={p.evidence} />,
    },
  }));

  const actionColumns: DataTableColumn[] = [
    { key: 'id', label: 'ID' },
    { key: 'title', label: '打ち手', wrap: true },
    { key: 'pain', label: '悩み' },
    { key: 'metric', label: '指標・停止条件', wrap: true, sortable: false },
    { key: 'judgeDate', label: '判定日' },
    { key: 'status', label: '状態' },
  ];
  const actionRows: DataTableRow[] = view.actions.map((a) => ({
    id: a.id,
    values: { id: a.id, title: a.title, pain: painLabel[a.painId] ?? a.painId, metric: a.metric, judgeDate: a.judgeDate ?? '', status: STATUS_LABEL[a.status] ?? a.status },
    cells: {
      title: <span className="text-xs">{a.title}{a.card ? <span className="text-muted-foreground">（{a.card}）</span> : null}</span>,
      pain: <span className="text-xs">{painLabel[a.painId] ?? a.painId}</span>,
      metric: (
        <div className="text-xs">
          <div>{a.metric}</div>
          {a.stopCondition ? <div className="text-muted-foreground">停止: {a.stopCondition}</div> : null}
        </div>
      ),
      judgeDate: <span className="text-xs">{md(a.judgeDate)}</span>,
      status: badge(a.status),
    },
  }));

  const t = view.axisTotals;
  return (
    <>
      <PageHead title="悩みと商品候補" />
      <SectionTabs set="market" current="/strategy/demand" />
      {view.errors.length > 0 && (
        <PanelCard title={`正本の不整合 ${view.errors.length} 件`}>
          <ul className="text-xs">{view.errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </PanelCard>
      )}
      <div className="grid gap-3 sm:grid-cols-2 mb-4">
        <StatCard label="類似商品（売れている需要を品質・形式・価格で取る）" value={t.similar.selling ? yen(t.similar.yen) : '販売前'} sub={`候補 ${t.similar.candidates}・販売中 ${t.similar.selling}・${num(t.similar.count)}件`} />
        <StatCard label="差別商品（満たされていない悩みを当事者の権威で取る）" value={t.differentiated.selling ? yen(t.differentiated.yen) : '販売前'} sub={`候補 ${t.differentiated.candidates}・販売中 ${t.differentiated.selling}・${num(t.differentiated.count)}件`} />
      </div>
      <PanelCard title="悩み" description={`配線の最上位。更新 ${view.updatedAt}`}>
        <DataTable columns={painColumns} rows={painRows} pageSize={50} />
      </PanelCard>
      <PanelCard title="立場" className="mt-4">
        <DataTable columns={positionColumns} rows={positionRows} pageSize={50} />
      </PanelCard>
      <PanelCard title="商品候補" description="実売は販売を始めた商品 id の note 売上（販売前は —）" className="mt-4">
        <DataTable columns={CANDIDATE_COLUMNS} rows={candidateRows} pageSize={100} />
      </PanelCard>
      <PanelCard title="打ち手（実験台帳）" description="experiments.json のうち demand.painId を持つもの" className="mt-4">
        <DataTable columns={actionColumns} rows={actionRows} pageSize={50} />
      </PanelCard>
    </>
  );
}
