import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { loadAutomationIssues, loadAutomations, loadWorkflowRuns, type Automation, type WorkflowRunStatus } from '@/lib/automations';
import { jstDateTime } from '@/lib/format';
import { IssueTable } from '../automation-parts';

export const dynamic = 'force-dynamic';

/**
 * /ops/ci — CI（GitHub Actions）の状態（read-only・DN-0851）。人が見る画面なので、名前・状態・最終実行だけを出し、
 * 失敗・要確認を上に並べる。状態は gh run list の直近の実行と、監視中（config.workflow-health）なら
 * check-workflow-health と同じ判定から決める。起動条件・役目・読み手は台帳（config/automations.json）にある。
 */
export default async function CiAutomationsPage() {
  const v = loadAutomations();
  const ci = v.automations.filter((a) => a.runner === 'github-actions');
  const [runs, issues] = await Promise.all([loadWorkflowRuns(v.automations), loadAutomationIssues(v.automations)]);
  const openIssues = issues.issues.filter((i) => i.runner !== 'mac-launchd');
  return (
    <>
      <PageHead title="CI（GitHub Actions）" />
      <Stack>
        {v.error && <p className="project-warning-text text-sm">読めなかった: {v.error}</p>}
        <PanelCard title="実行の状態">
          <DataTable columns={COLUMNS} rows={rows(ci, runs)} pageSize={50} />
        </PanelCard>
        <PanelCard title="開いている Issue">
          <IssueTable view={issues} issues={openIssues} />
        </PanelCard>
      </Stack>
    </>
  );
}

type State = { label: string; tone: Tone; rank: number; detail?: string };

/** 直近の実行と監視の判定から、人が見る 1 つの状態にする。rank が小さいほど上に並べる */
function stateOf(r: WorkflowRunStatus | undefined): State {
  if (!r || r.error) return { label: '未取得', tone: 'warn', rank: 1, detail: r?.error ?? undefined };
  const l = r.latest;
  if (!l) return { label: '実行なし', tone: 'neutral', rank: 3 };
  const key = l.status === 'completed' ? l.conclusion ?? 'unknown' : l.status;
  const unhealthy = r.health && !r.health.ok ? r.health.detail : undefined;
  if (key === 'failure' || key === 'timed_out') {
    return { label: r.consecutiveFailures && r.consecutiveFailures > 1 ? `失敗（${r.consecutiveFailures} 回続く）` : '失敗', tone: 'bad', rank: 0, detail: unhealthy };
  }
  if (unhealthy) return { label: '要確認', tone: 'warn', rank: 1, detail: unhealthy };
  if (key === 'in_progress' || key === 'queued') return { label: '実行中', tone: 'neutral', rank: 2 };
  if (key === 'success') return { label: '成功', tone: 'good', rank: 3 };
  return { label: key === 'cancelled' ? '取り消し' : key === 'skipped' ? '飛ばした' : key, tone: 'neutral', rank: 3 };
}

const COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '名前', wrap: true },
  { key: 'state', label: '状態' },
  { key: 'lastRun', label: '最終実行' },
];

function rows(list: Automation[], runs: Map<string, WorkflowRunStatus>): DataTableRow[] {
  return list
    .map((a, i) => ({ a, i, r: runs.get(a.source.split('/').pop() as string) }))
    .map((x) => ({ ...x, s: stateOf(x.r) }))
    .sort((x, y) => x.s.rank - y.s.rank || x.i - y.i)
    .map(({ a, r, s }) => ({
      id: a.id,
      values: { title: a.title, state: s.label, lastRun: r?.latest?.createdAt ?? null },
      cells: {
        state: <StatusBadge tone={s.tone} title={s.detail}>{s.label}</StatusBadge>,
        lastRun: r?.latest ? jstDateTime(r.latest.createdAt, { short: true }) : '—',
      },
    }));
}
