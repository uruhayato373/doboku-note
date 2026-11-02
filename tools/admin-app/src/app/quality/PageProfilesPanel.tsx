import { DataTable, DetailSheet, DetailText, StatusBadge, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { findRepoRoot } from '@/lib/repo-root';
import { readDataset } from '../../../../../scripts/lib/dataset-io.mjs';

/** 品質 ＞ ページの種類: 採点プロファイル（台帳 config.page-quality-profiles）。表は種類と評価役、見る観点などはシート。 */
type Evaluator = { agent: string; role: string; categories?: string[] };
type Profile = { id: string; label: string; focus: string; machineChecks: string[]; metrics: string[]; evaluators: Evaluator[]; evaluatorGap?: string; notApplicable: string[] };

const ROLE: Record<string, string> = { rubric: '採点', facts: '事実', figures: '図', tables: '表' };
const COLUMNS: DataTableColumn[] = [
  { key: 'label', label: 'ページの種類' },
  { key: 'rubric', label: '採点の評価役' },
  { key: 'gap', label: '評価役' },
];

export default function PageProfilesPanel() {
  const cfg = readDataset(findRepoRoot(), 'config.page-quality-profiles') as { profiles: Profile[]; metricsVocabulary: Record<string, string> };
  const rows: DataTableRow[] = cfg.profiles.map((p) => {
    const main = p.evaluators.filter((e) => e.role === 'rubric' || e.role === 'tables').map((e) => e.agent);
    return {
      id: p.id,
      values: { label: p.label, rubric: main.join('・') || '—', gap: p.evaluatorGap ? '無し' : 'あり' },
      cells: {
        label: (
          <DetailSheet trigger={p.label} title={p.label} description={p.id}>
            <DetailText title="見る観点" items={[p.focus]} />
            <DetailText title="評価役" items={p.evaluators.map((e) => `${ROLE[e.role] ?? e.role}: ${e.agent}${e.categories ? `（${e.categories.join('・')}）` : ''}`)} />
            <DetailText title="評価役を置けない理由" items={[p.evaluatorGap]} />
            <DetailText title="機械の検査" items={[p.machineChecks.join('・')]} />
            <DetailText title="数える指標" items={[p.metrics.map((m) => cfg.metricsVocabulary[m] ?? m).join('・')]} />
            <DetailText title="当てはめない規則" items={p.notApplicable} />
          </DetailSheet>
        ),
        gap: <StatusBadge tone={p.evaluatorGap ? 'warn' : 'good'}>{p.evaluatorGap ? '無し' : 'あり'}</StatusBadge>,
      },
    };
  });
  return <DataTable columns={COLUMNS} rows={rows} pageSize={50} />;
}
