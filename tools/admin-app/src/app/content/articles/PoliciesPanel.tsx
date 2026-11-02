import { DataTable, DetailList, DetailSheet, DetailText, StatusBadge, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { findRepoRoot } from '@/lib/repo-root';
import { readDataset } from '../../../../../../scripts/lib/dataset-io.mjs';
import { todayJst } from '../../../../../../scripts/lib/jst-date.mjs';

/** 記事 ＞ 国の計画・施策（台帳 config.policy-registry）。180 日を超えて確かめていない施策を上に出す（check-taxonomy-wiring と同じ基準）。 */
type Policy = { id: string; kind: string; title: string; shortTitle?: string; owner: string; decidedAt?: string; basisLaws?: string[]; basisLawTitles?: string[]; topics?: string[]; summary?: string; url?: string; checkedAt: string };

const STALE_DAYS = 180;
const KIND: Record<string, string> = { plan: '計画', council: '審議会', policy: '施策' };
const COLUMNS: DataTableColumn[] = [
  { key: 'title', label: '計画・施策', wrap: true },
  { key: 'kind', label: '種類' },
  { key: 'checkedAt', label: '確かめた日' },
];
const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

export default function PoliciesPanel() {
  const { policies } = readDataset(findRepoRoot(), 'config.policy-registry') as { policies: Policy[] };
  const today = todayJst();
  const rows: DataTableRow[] = [...policies]
    .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt))
    .map((p) => {
      const stale = days(p.checkedAt, today) > STALE_DAYS;
      const name = p.shortTitle ?? p.title;
      return {
        id: p.id,
        values: { title: name, kind: KIND[p.kind] ?? p.kind, checkedAt: p.checkedAt, owner: p.owner },
        cells: {
          title: (
            <DetailSheet trigger={name} title={p.title} description={p.owner}>
              <DetailList
                items={[
                  { label: '決定日', value: p.decidedAt },
                  { label: '根拠法', value: [...(p.basisLaws ?? []), ...(p.basisLawTitles ?? [])].join('・') },
                  { label: 'テーマ', value: (p.topics ?? []).join('・') },
                  { label: '確かめた日', value: p.checkedAt },
                  { label: '一次資料', value: p.url ? <a href={p.url} target="_blank" rel="noreferrer">開く</a> : null },
                ]}
              />
              <DetailText title="要点" items={[p.summary]} />
            </DetailSheet>
          ),
          checkedAt: <StatusBadge tone={stale ? 'warn' : 'neutral'}>{p.checkedAt}</StatusBadge>,
        },
      };
    });
  return <DataTable columns={COLUMNS} rows={rows} pageSize={100} filter="計画・施策・所管で絞り込む" />;
}
