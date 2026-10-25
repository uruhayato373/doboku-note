import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { loadAutomationIssues, loadAutomations, loadSaturday, type Automation, type CollectVerdict, type SaturdayView } from '@/lib/automations';
import { jstDateTime } from '@/lib/format';
import { IssueTable, whenOf } from '../automation-parts';

export const dynamic = 'force-dynamic';

/**
 * /ops/mac — Mac の自動実行（read-only・DN-0851）。人が見る画面なので、土曜の流れ（収集の前 → GSC の記録 → 週次レビュー →
 * 収集の後）の段ごとの結果と、収集の段のうち落ちたものの理由だけを出す。判定は既存の部品のまま
 * （収集＝weekly-collect-plan の judgeRuns、GSC の記録＝check-gsc-auto-review --json の gates、レビュー＝review-automation の weeklyLaunchd）。
 * ログの置き場・取り直しのコマンドは scripts/scheduled/weekly-review.sh と docs/operations/04_自動化マップ.md にある。
 */
export default async function MacAutomationsPage() {
  const v = loadAutomations();
  const [sat, issues] = await Promise.all([loadSaturday(), loadAutomationIssues(v.automations)]);
  const mac = v.automations.filter((a) => a.runner === 'mac-launchd');
  return (
    <>
      <PageHead title="Mac の自動実行" />
      <Stack>
        {v.error && <p className="project-warning-text text-sm">読めなかった: {v.error}</p>}
        <PanelCard title="土曜の流れ">
          <DataTable columns={CHAIN_COLUMNS} rows={chainRows(v.collect, sat)} pageSize={10} />
        </PanelCard>
        <PanelCard title="収集の段">
          <CollectTable v={v.collect} />
        </PanelCard>
        <PanelCard title="開いている Issue">
          <IssueTable view={issues} issues={issues.issues.filter((i) => i.runner === 'mac-launchd')} />
        </PanelCard>
        <PanelCard title="登録している定期実行">
          <DataTable columns={LAUNCHD_COLUMNS} rows={launchdRows(mac)} pageSize={10} />
        </PanelCard>
      </Stack>
    </>
  );
}

type StepStatus = 'ok' | 'warn' | 'failed' | 'skipped' | 'running' | 'unknown';
const STEP_TONE: Record<StepStatus, Tone> = { ok: 'good', warn: 'warn', failed: 'bad', skipped: 'neutral', running: 'warn', unknown: 'neutral' };
const STEP_LABEL: Record<StepStatus, string> = { ok: '成功', warn: '注意', failed: '失敗', skipped: '飛ばした', running: '途中で止まった', unknown: '不明' };
type Step = { id: string; label: string; status: StepStatus; when: string | null; note: string };

const CHAIN_COLUMNS: DataTableColumn[] = [
  { key: 'label', label: '段', sortable: false },
  { key: 'status', label: '結果', sortable: false },
  { key: 'when', label: '最後', sortable: false },
  { key: 'note', label: '', wrap: true, sortable: false },
];

function chainRows(collect: CollectVerdict | null, sat: SaturdayView): DataTableRow[] {
  return [collectStep(collect, 'pre', '収集（前）'), gscStep(sat), reviewStep(sat), collectStep(collect, 'post', '収集（後）')].map((s) => ({
    id: s.id,
    values: { label: s.label, status: STEP_LABEL[s.status], when: s.when, note: s.note || null },
    cells: { status: <StatusBadge tone={STEP_TONE[s.status]}>{STEP_LABEL[s.status]}</StatusBadge>, note: <span className="text-muted-foreground">{s.note}</span> },
  }));
}

function collectStep(v: CollectVerdict | null, phase: 'pre' | 'post', label: string): Step {
  const id = `collect-${phase}`;
  if (!v) return { id, label, status: 'unknown', when: null, note: 'まだ一度も回っていない' };
  const stages = v.stages.filter((s) => s.phase === phase);
  const failed = stages.filter((s) => s.status === 'failed' || s.status === 'missing').length;
  const warn = stages.filter((s) => s.status === 'warn').length;
  const finishedAt = v.phases.find((p) => p.phase === phase)?.finishedAt;
  return {
    id, label,
    status: failed ? 'failed' : warn ? 'warn' : 'ok',
    when: finishedAt ? jstDateTime(finishedAt, { short: true }) : null,
    note: failed || warn ? [failed && `${failed} 段が失敗`, warn && `${warn} 段に注意`].filter(Boolean).join('・') : '',
  };
}

function gscStep(sat: SaturdayView): Step {
  const base = { id: 'gsc-record', label: 'GSC の記録' };
  if (sat.launchd?.last?.gscFailed) return { ...base, status: 'failed', when: jstDateTime(sat.launchd.last.at, { short: true }), note: '' };
  const g = sat.gsc.gates;
  if (!g) return { ...base, status: 'unknown', when: null, note: '判定を取れなかった' };
  const due = [!g.gscDataStale && !g.weeklyAlreadyLogged && '週次の記録が要る', !g.monthlyAlreadyLogged && 'coverage の記録が要る'].filter(Boolean).join('・');
  return { ...base, status: due ? 'warn' : 'ok', when: g.latestWeeklyEntry?.replaceAll('-', '/') ?? null, note: due };
}

function reviewStep(sat: SaturdayView): Step {
  const base = { id: 'weekly-review', label: '週次レビュー' };
  if (!sat.launchd) return { ...base, status: 'unknown', when: null, note: 'この端末では確かめられない' };
  if (!sat.launchd.installed) return { ...base, status: 'failed', when: null, note: '未登録' };
  const last = sat.launchd.last;
  if (!last) return { ...base, status: 'unknown', when: null, note: 'まだ一度も動いていない' };
  const d = sat.draft;
  const missing = d && !('broken' in d) && d.missing.length ? `材料の欠け ${d.missing.length} 件` : '';
  return { ...base, status: last.result, when: jstDateTime(last.at, { short: true }), note: missing };
}

const STAGE_TONE: Record<string, Tone> = { ok: 'good', warn: 'warn', skipped: 'neutral', failed: 'bad', missing: 'bad' };
const STAGE_LABEL: Record<string, string> = { ok: '成功', warn: '注意', skipped: '飛ばした', failed: '失敗', missing: '記録なし' };
const PHASE_LABEL: Record<string, string> = { pre: '前', post: '後' };

const STAGE_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '段', wrap: true, sortable: false },
  { key: 'status', label: '結果', sortable: false },
  { key: 'reason', label: '理由', wrap: true, sortable: false },
];

/** 収集の段ごとの最新の結果。落ちた段を上に並べ、理由は 1 行に切る */
function CollectTable({ v }: { v: CollectVerdict | null }) {
  if (!v) return <p className="text-sm text-muted-foreground">まだ一度も回っていない</p>;
  const rank = (s: string) => (s === 'failed' || s === 'missing' ? 0 : s === 'warn' ? 1 : 2);
  const stageRows: DataTableRow[] = [...v.stages]
    .map((s, i) => ({ s, i }))
    .sort((x, y) => rank(x.s.status) - rank(y.s.status) || x.i - y.i)
    .map(({ s }) => {
      // 検査の出力の頭（[check-…] ✗）と 2 文目以降は人には要らない
      const reason = s.status === 'ok' ? '' : (s.reason ?? '').split(/[\n。]/)[0].replace(/^\[[^\]]+\]\s*[✗✓]?\s*/, '');
      return {
        id: s.id,
        values: { title: `${PHASE_LABEL[s.phase] ?? s.phase}・${s.title.replace(/（[^）]*）$/, '')}`, status: STAGE_LABEL[s.status] ?? s.status, reason: reason || null },
        cells: { status: <StatusBadge tone={STAGE_TONE[s.status] ?? 'neutral'}>{STAGE_LABEL[s.status] ?? s.status}</StatusBadge>, reason: <span className="text-muted-foreground">{reason}</span> },
      };
    });
  return <DataTable columns={STAGE_COLUMNS} rows={stageRows} pageSize={20} />;
}

const LAUNCHD_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '名前', sortable: false },
  { key: 'when', label: 'いつ', sortable: false },
];

function launchdRows(list: Automation[]): DataTableRow[] {
  return list.map((a) => ({ id: a.id, values: { title: a.title, when: whenOf(a) } }));
}
