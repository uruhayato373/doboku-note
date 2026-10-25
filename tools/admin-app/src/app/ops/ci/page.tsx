import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { loadAutomationIssues, loadAutomations, loadWorkflowRuns, type Automation, type WorkflowRunStatus } from '@/lib/automations';
import { fileOf, IssueTable, whenOf } from '../automation-parts';
import { jstDateTime } from '@/lib/format';

export const dynamic = 'force-dynamic';

/**
 * /ops/ci — CI（GitHub Actions）の自動化（read-only・DN-0851）。台帳 config.automations の github-actions の行に、
 * 直近の実行を gh で取って並べる。監視中（データセット config.workflow-health）のものは check-workflow-health と同じ判定を出す。
 * CI はログインしない（check-automations と check-playwright-auth-wiring が止める）。Mac の土曜の流れは /ops/mac。
 */
export default async function CiAutomationsPage() {
  const v = loadAutomations();
  const ci = v.automations.filter((a) => a.runner === 'github-actions');
  const [runs, issues] = await Promise.all([loadWorkflowRuns(v.automations), loadAutomationIssues(v.automations)]);
  const runErrors = [...runs.values()].filter((r) => r.error);
  const orphans = issues.issues.filter((i) => i.runner === null);
  return (
    <>
      <PageHead title="CI（GitHub Actions）" sub={`${ci.length} 本。台帳は ${v.ledgerPath}（実物との一致は npm run check-automations）。CI はログインしない（check-automations と check-playwright-auth-wiring が止める）`} />
      <Stack>
        {v.error && <p className="project-warning-text text-sm">読めなかった: {v.error}</p>}
        <PanelCard title="直近の実行" description={`gh run list から取る。監視は ${v.healthPath} に載る workflow だけで、判定は npm run check-workflow-health と同じ（最後の成功からの日数・連続失敗）`}>
          {runErrors.length > 0 && <p className="project-warning-text text-sm">直近の実行を取れなかった workflow が {runErrors.length} 本ある（gh の認証・ネットワークを確かめる）: {runErrors[0].error}</p>}
          <DataTable columns={CI_COLUMNS} rows={ciRows(ci, runs)} pageSize={50} filter="名前・結果・監視で絞り込む" />
        </PanelCard>
        <PanelCard title="CI の自動化の Issue" description="起票した workflow が次に成功すると自動で閉じる">
          <IssueTable view={issues} issues={issues.issues.filter((i) => i.runner === 'github-actions')} />
        </PanelCard>
        {orphans.length > 0 && (
          <PanelCard title="どの自動化にも当たらない Issue" description="題名の channel が台帳の読み手（issue:<channel>）に無い。消した仕組みの残りか配線の無い channel で、自動では閉じないので人が閉じる">
            <IssueTable view={issues} issues={orphans} />
          </PanelCard>
        )}
      </Stack>
    </>
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
    const file = fileOf(a);
    const r = runs.get(file);
    const key = r?.latest ? (r.latest.status === 'completed' ? r.latest.conclusion ?? 'unknown' : r.latest.status) : null;
    const result = r?.error ? '未取得' : key ? (RUN_LABEL[key] ?? key) : '実行なし';
    const health = !r || r.error ? null : r.health ? (r.health.ok ? '健全' : `不健全: ${r.health.detail}`) : '監視対象外';
    const failures = r?.consecutiveFailures ? `・連続失敗 ${r.consecutiveFailures}` : '';
    return {
      id: a.id,
      values: {
        title: `${a.title}（${file}）`,
        when: whenOf(a),
        result,
        lastRun: r?.latest ? `${jstDateTime(r.latest.createdAt)}（${EVENT_LABEL[r.latest.event] ?? r.latest.event}）${failures}` : null,
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
