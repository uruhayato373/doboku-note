import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { loadAutomationIssues, loadAutomations, loadSaturday, type Automation, type CollectVerdict, type SaturdayView } from '@/lib/automations';
import { at, fileOf, IssueTable, whenOf } from '../automation-parts';

export const dynamic = 'force-dynamic';

/**
 * /ops/mac — Mac の自動実行（read-only・DN-0851）。ログインが要る取得と書き込みは土曜の Mac の 1 本
 * （scripts/scheduled/weekly-review.sh）だけで、収集の前 → GSC の記録 → 週次レビュー → 収集の後の順に回る。
 * その段ごとの最後の結果を実行順に 1 本の表で出す。判定はどれも既存の部品のまま（収集＝weekly-collect-plan の judgeRuns、
 * GSC の記録＝check-gsc-auto-review --json の gates、レビュー＝review-automation の weeklyLaunchd）。
 * CI（GitHub Actions）は /ops/ci。週次レビューの画面は、この画面へのリンクと回の目印だけを持つ。
 */
export default async function MacAutomationsPage() {
  const v = loadAutomations();
  const [sat, issues] = await Promise.all([loadSaturday(), loadAutomationIssues(v.automations)]);
  const mac = v.automations.filter((a) => a.runner === 'mac-launchd');
  return (
    <>
      <PageHead title="Mac の自動実行" sub={`launchd ${mac.length} 本。ログインが要る取得と書き込みは土曜の 1 本だけ（収集の前 → GSC の記録 → 週次レビュー → 収集の後）。台帳は ${v.ledgerPath}（実物との一致は npm run check-automations）`} />
      <Stack>
        {v.error && <p className="project-warning-text text-sm">読めなかった: {v.error}</p>}
        <PanelCard title="土曜の流れ" description={`段ごとの最後の結果（実行順）。ログは ${sat.logFile}。取り直しは npm run weekly-review:install -- --run-now、収集の 1 段だけなら node scripts/weekly-collect.mjs --only <段>`}>
          <DataTable columns={CHAIN_COLUMNS} rows={chainRows(v.collect, sat)} pageSize={10} />
        </PanelCard>
        <PanelCard title="収集の段ごとの最新の結果" description={`ログインが要る取得と書き込み、取った記録の検算（scripts/weekly-collect.mjs）。運営者の取り直し（--only）も数える。記録は ${v.runsPath}。日次の死活は check-weekly-collect:alive、この表と同じ判定は check-weekly-collect`}>
          <CollectTable v={v.collect} />
        </PanelCard>
        <PanelCard title="Mac の自動化の Issue" description="土曜の収集（weekly-collect）・週次レビュー（weekly-review-local）・GSC の記録（gsc-auto-review）。次の土曜に段が通ると自動で閉じる">
          <IssueTable view={issues} issues={issues.issues.filter((i) => i.runner === 'mac-launchd')} />
        </PanelCard>
        <PanelCard title="launchd の一覧">
          <DataTable columns={COLUMNS} rows={rows(mac)} pageSize={50} />
        </PanelCard>
      </Stack>
    </>
  );
}

type StepStatus = 'ok' | 'warn' | 'failed' | 'skipped' | 'running' | 'unknown';
const STEP_TONE: Record<StepStatus, Tone> = { ok: 'good', warn: 'warn', failed: 'bad', skipped: 'neutral', running: 'warn', unknown: 'neutral' };
const STEP_LABEL: Record<StepStatus, string> = { ok: '成功', warn: '注意', failed: '失敗', skipped: '飛ばした', running: '実行中か途中で止まった', unknown: '不明' };
type Step = { id: string; label: string; status: StepStatus; when: string | null; detail: string };

const CHAIN_COLUMNS: DataTableColumn[] = [
  { key: 'order', label: '順', num: true },
  { key: 'label', label: '段' },
  { key: 'status', label: '結果' },
  { key: 'when', label: '最後', wrap: true },
  { key: 'detail', label: '中身', wrap: true, sortable: false },
];

function chainRows(collect: CollectVerdict | null, sat: SaturdayView): DataTableRow[] {
  const steps = [collectStep(collect, 'pre', '収集（前）'), gscStep(sat), reviewStep(sat), collectStep(collect, 'post', '収集（後）')];
  return steps.map((s, i) => ({
    id: s.id,
    values: { order: i + 1, label: s.label, status: STEP_LABEL[s.status], when: s.when, detail: s.detail },
    cells: { status: <StatusBadge tone={STEP_TONE[s.status]}>{STEP_LABEL[s.status]}</StatusBadge> },
  }));
}

function collectStep(v: CollectVerdict | null, phase: 'pre' | 'post', label: string): Step {
  const id = `collect-${phase}`;
  if (!v) return { id, label, status: 'unknown', when: null, detail: 'まだ一度も回っていない' };
  const stages = v.stages.filter((s) => s.phase === phase);
  const failed = stages.filter((s) => s.status === 'failed' || s.status === 'missing').length;
  const warn = stages.filter((s) => s.status === 'warn').length;
  const skipped = stages.filter((s) => s.status === 'skipped').length;
  const finishedAt = v.phases.find((p) => p.phase === phase)?.finishedAt;
  return {
    id, label,
    status: failed ? 'failed' : warn ? 'warn' : 'ok',
    when: finishedAt ? at(finishedAt) : null,
    detail: `${stages.length} 段中 成功 ${stages.length - failed - warn - skipped}・注意 ${warn}・失敗か記録なし ${failed}${skipped ? `・飛ばした ${skipped}` : ''}（段ごとは下の表）`,
  };
}

function gscStep(sat: SaturdayView): Step {
  const base = { id: 'gsc-record', label: 'GSC の記録' };
  if (sat.launchd?.last?.gscFailed) return { ...base, status: 'failed', when: at(sat.launchd.last.at), detail: '最後の実行のログに [gsc-record] FAILED がある（残りはログの置き場に退避して先へ進む）' };
  const g = sat.gsc.gates;
  if (!g) return { ...base, status: 'unknown', when: null, detail: `判定を取れなかった: ${sat.gsc.error ?? '不明'}` };
  const weeklyDue = !g.gscDataStale && !g.weeklyAlreadyLogged;
  const coverageDue = !g.monthlyAlreadyLogged;
  const entries = `週次の観測 ${g.latestWeeklyEntry ?? '—'}・coverage ${g.latestMonthlyEntry ?? '—'}（${sat.gsc.logPath ?? 'gsc-management.md'}）`;
  const notes = [weeklyDue && '週次の記録が要る', coverageDue && 'coverage の記録が要る', g.gscDataStale && 'GSC のデータが古いので週次は求めない'].filter(Boolean).join('・');
  return { ...base, status: weeklyDue || coverageDue ? 'warn' : 'ok', when: g.latestWeeklyEntry, detail: notes ? `${entries}。${notes}` : entries };
}

function reviewStep(sat: SaturdayView): Step {
  const base = { id: 'weekly-review', label: '週次レビュー' };
  if (!sat.launchd) return { ...base, status: 'unknown', when: null, detail: 'この端末では確かめられない（macOS のみ）' };
  if (!sat.launchd.installed) return { ...base, status: 'failed', when: null, detail: '未登録（npm run weekly-review:install で登録する）' };
  const last = sat.launchd.last;
  if (!last) return { ...base, status: 'unknown', when: null, detail: 'まだ一度も動いていない' };
  const d = sat.draft;
  const draft = !d ? '下書きはまだ無い' : 'broken' in d ? '下書きのファイルが壊れている'
    : `下書き ${d.week}（作成 ${at(d.generatedAt)}）・${d.missing.length ? `材料の欠け ${d.missing.length} 件` : '必須の材料はそろっている'}`;
  return { ...base, status: last.result, when: at(last.at), detail: `${last.result === 'skipped' ? '今週分のレポートがあるので何もしない。' : ''}${draft}` };
}

const STAGE_TONE: Record<string, Tone> = { ok: 'good', warn: 'warn', skipped: 'neutral', failed: 'bad', missing: 'bad' };
const STAGE_LABEL: Record<string, string> = { ok: '成功', warn: '注意', skipped: '飛ばした', failed: '失敗', missing: '記録なし' };
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
      title: `${a.title}（${fileOf(a)}）`,
      when: whenOf(a),
      login: a.login.length ? a.login.join('・') : null,
      purpose: a.purpose,
      readers: a.readers.join('・'),
    },
    cells: { login: a.login.length ? <StatusBadge tone="warn">{a.login.join('・')}</StatusBadge> : <span className="text-muted-foreground">不要</span> },
  }));
}
