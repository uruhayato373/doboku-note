import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, type Tone } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import { loadAutomations, type Automation, type CollectVerdict } from '@/lib/automations';

export const dynamic = 'force-dynamic';

/**
 * /ops/automations — 自動化の台帳（read-only・DN-0817）。どこで（Mac の launchd か GitHub Actions）何がいつ動き、
 * ログインが要るか・誰が読むか。正本はデータセット config.automations、実物との一致は npm run check-automations（CI）が止める。
 * ログインが要る処理は土曜の Mac の 1 本（weekly-collect）だけで、その段ごとの最新の結果（取り直しを含む）を上に出す。
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
        <PanelCard title="土曜の収集の段ごとの最新の結果" description={`ログインが要る取得と書き込み、取った記録の検算（scripts/weekly-collect.mjs）。運営者の取り直し（--only）も数える。記録は ${v.runsPath}。日次の死活は check-weekly-collect:alive、この表と同じ判定は check-weekly-collect`}>
          <CollectTable v={v.collect} />
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
