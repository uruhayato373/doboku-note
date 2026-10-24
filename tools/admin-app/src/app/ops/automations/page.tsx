import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { loadAutomations, runPassed, type Automation, type CollectRun } from '@/lib/automations';

export const dynamic = 'force-dynamic';

/**
 * /ops/automations — 自動化の台帳（read-only・DN-0817）。どこで（Mac の launchd か GitHub Actions）何がいつ動き、
 * ログインが要るか・誰が読むか。正本はデータセット config.automations、実物との一致は npm run check-automations（CI）が止める。
 * ログインが要る処理は土曜の Mac の 1 本（weekly-collect）だけで、その最新の結果を上に出す。
 */
export default function AutomationsPage() {
  const v = loadAutomations();
  const mac = v.automations.filter((a) => a.runner === 'mac-launchd');
  const ci = v.automations.filter((a) => a.runner === 'github-actions');
  return (
    <>
      <PageHead title="自動化の台帳" sub={`Mac の launchd ${mac.length} 本・GitHub Actions ${ci.length} 本。正本は ${v.ledgerPath}（実物との一致は npm run check-automations）。ログインが要るのは土曜の Mac の 1 本だけ`} />
      <Stack>
        {v.error && <p className="project-warning-text text-sm">読めなかった: {v.error}</p>}
        <PanelCard title="土曜の収集の最新の結果" description={`ログインが要る取得と書き込み（scripts/weekly-collect.mjs）。記録は ${v.runsPath}、日次の点検は check-weekly-collect`}>
          <CollectRunTable label="前（レビューの前）" run={v.lastPre} />
          <CollectRunTable label="後（レビューの後）" run={v.lastPost} />
        </PanelCard>
        <PanelCard title="Mac の launchd">
          <DataTable columns={COLUMNS} rows={rows(mac)} pageSize={50} />
        </PanelCard>
        <PanelCard title="GitHub Actions" description="CI はログインしない（ログイン用の Secrets・状態の復元を使うワークフローは check-automations と check-playwright-auth-wiring が止める）">
          <DataTable columns={COLUMNS} rows={rows(ci)} pageSize={50} />
        </PanelCard>
      </Stack>
    </>
  );
}

const STAGE_TONE: Record<string, Tone> = { ok: 'good', warn: 'warn', skipped: 'neutral', failed: 'bad' };
const STAGE_LABEL: Record<string, string> = { ok: '成功', warn: '注意', skipped: '飛ばした', failed: '失敗' };
const at = (iso: string | undefined) => (iso ? new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '—');

const STAGE_COLUMNS: DataTableColumn[] = [
  { key: 'status', label: '結果' },
  { key: 'title', label: '段', wrap: true },
  { key: 'reason', label: '理由', wrap: true, sortable: false },
  { key: 'durationSec', label: '秒', num: true },
];

function CollectRunTable({ label, run }: { label: string; run: CollectRun | null }) {
  if (!run) return <p className="text-sm text-muted-foreground">{label}: まだ一度も回っていない</p>;
  const passed = runPassed(run);
  const stageRows: DataTableRow[] = run.stages.map((s) => ({
    id: s.id,
    values: { status: STAGE_LABEL[s.status] ?? s.status, title: s.title, reason: s.reason || null, durationSec: s.durationSec },
    cells: { status: <StatusBadge tone={STAGE_TONE[s.status] ?? 'neutral'}>{STAGE_LABEL[s.status] ?? s.status}</StatusBadge> },
  }));
  return (
    <div className="mb-4">
      <p className="text-sm">
        {label}: {at(run.finishedAt)} <StatusBadge tone={passed ? 'good' : 'bad'}>{passed ? '合格' : '不合格'}</StatusBadge>
        {run.commit?.problem ? ` 書き戻し: ${run.commit.problem}` : ''}
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
      title: `${a.title}（${a.source.split('/').pop()}）`,
      when: a.scheduleJst ?? (a.schedule.length ? a.schedule.join(' / ') : a.triggers.join('・')),
      login: a.login.length ? a.login.join('・') : null,
      purpose: a.purpose,
      readers: a.readers.join('・'),
    },
    cells: { login: a.login.length ? <StatusBadge tone="warn">{a.login.join('・')}</StatusBadge> : <span className="text-muted-foreground">不要</span> },
  }));
}
