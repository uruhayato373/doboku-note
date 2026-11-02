import { DataTable, DetailList, DetailSheet, DetailText, StatusBadge, type DataTableColumn, type DataTableRow } from '@/components/admin';
import { findRepoRoot } from '@/lib/repo-root';
import { readDataset } from '../../../../../../scripts/lib/dataset-io.mjs';
import { loadRegistry } from '../../../../../../scripts/lib/qualification-registry.mjs';
import { qualificationShortLabel } from '../../../../../../scripts/lib/qualification-names.mjs';

/** note ＞ 導線: 資格ごとのもくじ記事と、記事の冒頭・末尾に入れる案内（台帳 config.note-funnel）。案内の文はシート。 */
type Index = { title: string; noteUrl: string };
type Cta = { marker: string; text: string };
type Exam = { qualification: string; L2?: Index; topCta?: Cta; bottomCta?: Cta; articleGlob?: string; excludeDirs?: string[] };

const COLUMNS: DataTableColumn[] = [
  { key: 'qualification', label: '資格' },
  { key: 'index', label: 'もくじ' },
  { key: 'top', label: '冒頭の案内' },
  { key: 'bottom', label: '末尾の案内' },
];
const mark = (on: boolean) => <StatusBadge tone={on ? 'good' : 'neutral'}>{on ? 'あり' : 'なし'}</StatusBadge>;

export default function FunnelPanel() {
  const root = findRepoRoot();
  const cfg = readDataset(root, 'config.note-funnel') as { L1: Index; exams: Record<string, Exam> };
  const registry = loadRegistry(root);
  const rows: DataTableRow[] = [
    {
      id: 'L1',
      values: { qualification: '全資格', index: cfg.L1.title, top: null, bottom: null },
      cells: { index: <a href={cfg.L1.noteUrl} target="_blank" rel="noreferrer">{cfg.L1.title}</a>, top: '—', bottom: '—' },
    },
    ...Object.entries(cfg.exams).map(([id, e]) => {
      const label = qualificationShortLabel(registry, e.qualification) ?? id;
      return {
        id,
        values: { qualification: label, index: e.L2?.title ?? '', top: e.topCta ? 'あり' : 'なし', bottom: e.bottomCta ? 'あり' : 'なし' },
        cells: {
          qualification: (
            <DetailSheet trigger={label} title={`${label} の導線`} description={e.L2?.title}>
              <DetailList items={[{ label: 'もくじ', value: e.L2 ? <a href={e.L2.noteUrl} target="_blank" rel="noreferrer">{e.L2.title}</a> : null }]} />
              <DetailText title="冒頭の案内" items={[e.topCta?.text.replace(/<!--[^>]*-->\n?/, '')]} />
              <DetailText title="末尾の案内" items={[e.bottomCta?.text.replace(/<!--[^>]*-->\n?/, '')]} />
            </DetailSheet>
          ),
          index: e.L2 ? <a href={e.L2.noteUrl} target="_blank" rel="noreferrer">{e.L2.title}</a> : '—',
          top: mark(Boolean(e.topCta)),
          bottom: mark(Boolean(e.bottomCta)),
        },
      };
    }),
  ];
  return <DataTable columns={COLUMNS} rows={rows} pageSize={20} />;
}
