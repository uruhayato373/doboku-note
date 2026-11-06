import Link from 'next/link';
import { DataTable, DetailList, DetailSheet, DetailText, type DataTableColumn, type DataTableRow, FilterBar, FilterChip } from '@/components/admin';
import { PageHead } from '@/components/ui';
import SectionTabs from '@/components/SectionTabs';
import { domainList, domainOverview } from '@/lib/domains';
import { findRepoRoot } from '@/lib/repo-root';
import { loadDomains } from '../../../../../../scripts/lib/domains.mjs';

export const dynamic = 'force-dynamic';

/**
 * /strategy/taxonomy — 事業の分類（役割 → 領域 → 画面の種類）。正本 config/domains.json をそのまま表示する。
 * 領域タブ: 役割・領域・件数（管理するものは領域名のシート）。画面タブ: 領域ごとの画面を種類別に並べる（分け方の規則はシート）。
 */
const TABS = [
  { id: 'domains', label: '領域' },
  { id: 'screens', label: '画面' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const DOMAIN_COLUMNS: DataTableColumn[] = [
  { key: 'role', label: '役割' },
  { key: 'label', label: '領域' },
  { key: 'cards', label: 'タスク', num: true },
  { key: 'skills', label: 'スキル・エージェント', num: true },
  { key: 'docs', label: '文書', num: true },
];

export default async function TaxonomyPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const current: TabId = TABS.some((t) => t.id === tab) ? (tab as TabId) : 'domains';
  const domains = domainList();
  const cfg = loadDomains(findRepoRoot()) as { navKinds?: Record<string, string>; navRules?: string[] };
  const kinds = cfg.navKinds ?? {};

  const domainRows: DataTableRow[] = domains.map((d) => {
    const o = domainOverview(d.id);
    return {
      id: d.id,
      values: { role: d.role, label: d.label, cards: o?.cards.length ?? null, skills: o ? o.skills.length + o.agents.length : null, docs: o?.documents.length ?? null },
      cells: {
        label: (
          <DetailSheet trigger={d.label} title={d.label} description={d.role}>
            <DetailText title="管理するもの" items={[d.manages]} />
            <DetailList items={[{ label: '領域のページ', value: <Link href={`/domains/${d.id}`}>開く</Link> }]} />
          </DetailSheet>
        ),
      },
    };
  });

  const kindColumns: DataTableColumn[] = [
    { key: 'label', label: '領域' },
    ...Object.entries(kinds).map(([k, v]) => ({ key: `kind:${k}`, label: v.split('（')[0], wrap: true, sortable: false })),
  ];
  const kindRows: DataTableRow[] = domains.map((d) => {
    const values: DataTableRow['values'] = { label: d.label };
    const cells: NonNullable<DataTableRow['cells']> = {};
    for (const k of Object.keys(kinds)) {
      const items = d.nav.filter((v) => v.kind === k);
      values[`kind:${k}`] = items.map((v) => v.label).join(' ');
      cells[`kind:${k}`] = (
        <div className="text-xs">
          {items.map((v) => (
            <div key={v.href}>
              <Link href={v.href}>{v.label}</Link>
            </div>
          ))}
        </div>
      );
    }
    return { id: d.id, values, cells };
  });

  return (
    <>
      <PageHead title="事業の分類" />
      <SectionTabs set="policy" current="/strategy/taxonomy" />
      <FilterBar className="mb-3!">
        {TABS.map((t) => (
          <FilterChip key={t.id} active={t.id === current} href={t.id === 'domains' ? '/strategy/taxonomy' : `/strategy/taxonomy?tab=${t.id}`}>
            {t.label}
          </FilterChip>
        ))}
      </FilterBar>
      {current === 'domains' ? (
        <DataTable columns={DOMAIN_COLUMNS} rows={domainRows} pageSize={100} />
      ) : (
        <>
          <DataTable columns={kindColumns} rows={kindRows} pageSize={100} />
          {cfg.navRules?.length ? (
            <div className="mt-3 text-sm">
              <DetailSheet trigger="分け方の規則" title="分け方の規則">
                <DetailText title="規則" items={cfg.navRules} />
              </DetailSheet>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
