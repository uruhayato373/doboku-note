import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { loadAutomations, loadWorkflowRuns, type Automation, type CollectVerdict, type WorkflowRunStatus } from '@/lib/automations';

export const dynamic = 'force-dynamic';

/**
 * /ops/automations — 自動化の台帳（read-only・DN-0817）。どこで（Mac の launchd か GitHub Actions）何がいつ動き、
 * ログインが要るか・誰が読むか。正本はデータセット config.automations、実物との一致は npm run check-automations（CI）が止める。
 * ログインが要る処理は土曜の Mac の 1 本（weekly-collect）だけで、その段ごとの最新の結果（取り直しを含む）を上に出す。
 * GitHub Actions は直近の実行を gh で取り、監視中（データセット config.workflow-health）のものは check-workflow-health と同じ判定を出す。
 */
export default async function AutomationsPage() {
  const v = loadAutomations();
  const runs = await loadWorkflowRuns(v.automations);
  const runErrors = [...runs.values()].filter((r) => r.error);
  const mac = v.automations.filter((a) => a.runner === 'mac-launchd');
  const ci = v.automations.filter((a) => a.runner === 'github-actions');
  return (
    <>
      <PageHead title="自動化の台帳" sub={`Mac の launchd ${mac.length} 本・GitHub Actions ${ci.length} 本。正本は ${v.ledgerPath}（実物との一致は npm run check-automations）。ログインが要るのは土曜の Mac の 1 本だけ`} />
      <Stack>
        {v.error && <p className="project-warning-text text-sm">読めなかった: {v.error}</p>}
        <PanelCard title="土曜の収集の段ごとの最新の結果" description={`ログインが要る取得と書き込み、取った記録の検算（scripts/weekly-collect.mjs）。運営者の取り直し（--only）も数える。記録は ${v.runsPath}。日次の死活は check-weekly-collect:alive、この表と同じ判定は check-weekly-collect`}>
          <CollectTable v={v.collect} />
        </PanelCard>
        <PanelCard title="Mac の launchd">
          <DataTable columns={COLUMNS} rows={rows(mac)} pageSize={50} />
        </PanelCard>
        <PanelCard title="GitHub Actions" description={`直近の実行は gh run list から取る。監視は ${v.healthPath} に載る workflow だけで、判定は npm run check-workflow-health と同じ（最後の成功からの日数・連続失敗・cron の発火）。CI はログインしない（check-automations と check-playwright-auth-wiring が止める）`}>
          {runErrors.length > 0 && <p className="project-warning-text text-sm">直近の実行を取れなかった workflow が {runErrors.length} 本ある（gh の認証・ネットワークを確かめる）: {runErrors[0].error}</p>}
          <DataTable columns={CI_COLUMNS} rows={ciRows(ci, runs)} pageSize={50} />
        </PanelCard>
      </Stack>
    </>
  );
}

const STAGE_TONE: Record<string, Tone> = { ok: 'good', warn: 'warn', skipped: 'neutral', failed: 'bad', missing: 'bad' };
const STAGE_LABEL: Record<string, string> = { ok: '成功', warn: '注意', skipped: '飛ばした', failed: '失敗', missing: '記録なし' };
const at = (iso: string | undefined) => (iso ? new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '—');

const PHASE_LABEL: Record<string, string> = { pre: '前', post: '後', only: '取り直し' };

const STAGE_COLUMNS: DataTableColumn[] = [
  { key: 'status', label: '結果' },
  { key: 'title', label: '段', wrap: true },
  { key: 'when', label: 'いつ', wrap: true },
  { key: 'reason', label: '理由', wrap: true, sortable: false },
];

function CollectTable({ v }: { v: CollectVerdict | null }) {
  if (!v) return <p className="text-sm text-muted-foreground">まだ一度も回っていない</p>;
  const passed = !v.problems.length;
  const stageRows: DataTableRow[] = v.stages.map((s) => ({
    id: s.id,
    values: {
      status: STAGE_LABEL[s.status] ?? s.status,
      title: `${PHASE_LABEL[s.phase] ?? s.phase}・${s.title}`,
      when: s.at ? `${at(s.at)}（${PHASE_LABEL[s.runPhase ?? ''] ?? s.runPhase}）` : null,
      reason: s.reason || null,
    },
    cells: { status: <StatusBadge tone={STAGE_TONE[s.status] ?? 'neutral'}>{STAGE_LABEL[s.status] ?? s.status}</StatusBadge> },
  }));
  return (
    <div className="mb-4">
      <p className="text-sm">
        {v.phases.map((p) => `${PHASE_LABEL[p.phase]}: ${at(p.finishedAt)}`).join('・')}{' '}
        <StatusBadge tone={passed ? 'good' : 'bad'}>{passed ? '合格' : `不合格 ${v.problems.length} 件`}</StatusBadge>
      </p>
      <DataTable columns={STAGE_COLUMNS} rows={stageRows} pageSize={20} />
    </div>
  );
}

const RUN_LABEL: Record<string, string> = { success: '成功', failure: '失敗', timed_out: '時間切れ', cancelled: '取り消し', skipped: '飛ばした', in_progress: '実行中', queued: '待機中' };
const RUN_TONE: Record<string, Tone> = { success: 'good', failure: 'bad', timed_out: 'bad', cancelled: 'neutral', skipped: 'neutral', in_progress: 'neutral', queued: 'neutral' };
const EVENT_LABEL: Record<string, string> = { schedule: '定期', push: 'push', pull_request: 'PR', workflow_dispatch: '手動', workflow_run: '連鎖', release: 'release' };

const CI_COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '名前', wrap: true },
  { key: 'when', label: 'いつ', wrap: true },
  { key: 'result', label: '直近の結果' },
  { key: 'lastRun', label: '最終実行', wrap: true },
  { key: 'health', label: '監視', wrap: true },
  { key: 'purpose', label: '何をするか', wrap: true, sortable: false },
  { key: 'readers', label: '読み手', wrap: true, sortable: false },
];

function ciRows(list: Automation[], runs: Map<string, WorkflowRunStatus>): DataTableRow[] {
  return list.map((a) => {
    const file = a.source.split('/').pop() as string;
    const r = runs.get(file);
    const key = r?.latest ? (r.latest.status === 'completed' ? r.latest.conclusion ?? 'unknown' : r.latest.status) : null;
    const result = r?.error ? '未取得' : key ? (RUN_LABEL[key] ?? key) : '実行なし';
    const health = !r || r.error ? null : r.health ? (r.health.ok ? '健全' : `不健全: ${r.health.detail}`) : '監視対象外';
    const failures = r?.consecutiveFailures ? `・連続失敗 ${r.consecutiveFailures}` : '';
    return {
      id: a.id,
      values: {
        title: `${a.title}（${file}）`,
        when: a.scheduleJst ?? (a.schedule.length ? a.schedule.join(' / ') : a.triggers.join('・')),
        result,
        lastRun: r?.latest ? `${at(r.latest.createdAt)}（${EVENT_LABEL[r.latest.event] ?? r.latest.event}）${failures}` : null,
        health,
        purpose: a.purpose,
        readers: a.readers.join('・'),
      },
      cells: {
        result: <StatusBadge tone={r?.error ? 'warn' : key ? (RUN_TONE[key] ?? 'neutral') : 'neutral'}>{result}</StatusBadge>,
        health: health === null ? <span className="text-muted-foreground">—</span>
          : r?.health ? <StatusBadge tone={r.health.ok ? 'good' : 'bad'}>{health}</StatusBadge>
          : <span className="text-muted-foreground">{health}</span>,
      },
    };
  });
}

const COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '名前', wrap: true },
  { key: 'when', label: 'いつ', wrap: true },
  { key: 'login', label: 'ログイン' },
  { key: 'purpose', label: '何をするか', wrap: true, sortable: false },
  { key: 'readers', label: '読み手', wrap: true, sortable: false },
];

function rows(list: Automation[]): DataTableRow[] {
  return list.map((a) => ({
    id: a.id,
    values: {
      title: `${a.title}（${a.source.split('/').pop()}）`,
      when: a.scheduleJst ?? (a.schedule.length ? a.schedule.join(' / ') : a.triggers.join('・')),
      login: a.login.length ? a.login.join('・') : null,
      purpose: a.purpose,
      readers: a.readers.join('・'),
    },
    cells: { login: a.login.length ? <StatusBadge tone="warn">{a.login.join('・')}</StatusBadge> : <span className="text-muted-foreground">不要</span> },
  }));
}
