import Link from 'next/link';
import { DataTable, PanelCard, StatusBadge, type DataTableColumn, type DataTableRow, FilterBar, FilterChip } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import LineChart from '@/components/charts/LineChart';
import { qualitySummary, qualityCensus, type Severity } from '@/lib/quality';
import type { Tone } from '@/components/admin';
import PastExamLedgerPanel from './PastExamLedgerPanel';
import PageProfilesPanel from './PageProfilesPanel';

export const dynamic = 'force-dynamic';

const RULE_COLUMNS: DataTableColumn[] = [
  { key: 'rule', label: 'ルール' },
  { key: 'severity', label: '重大度' },
  { key: 'files', label: '記事数', num: true },
  { key: 'total', label: '違反数', num: true },
];

const sevTone = (s: Severity | string): Tone => (s === 'HIGH' ? 'bad' : s === 'LOW' ? 'neutral' : 'warn');

export default async function QualityPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const TABS = [
    { id: 'violations', label: '違反' },
    { id: 'scoring', label: '採点' },
    { id: 'ledger', label: '過去問の照合' },
    { id: 'profiles', label: 'ページの種類' },
  ];
  const current = TABS.some((x) => x.id === tab) ? (tab as string) : 'violations';
  const data = qualitySummary();
  const census = qualityCensus();
  const { totals, articleCount, byRule, history } = data;

  const burndown = (() => {
    const byDate: Record<string, (typeof history)[number]> = {};
    for (const h of history) byDate[h.date] = h;
    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({ label: p.date.slice(5), value: p.violations }));
  })();

  const ruleRows: DataTableRow[] = byRule.map((r) => ({
    id: r.rule,
    values: { rule: r.rule, severity: r.severity, files: r.files, total: r.total },
    cells: { rule: <StatusBadge tone={sevTone(r.severity)}>{r.rule}</StatusBadge> },
  }));


  return (
    <>
      <PageHead title="品質概観" sub={`違反のある記事 ${articleCount} 件`} />
      <FilterBar className="mb-3!">
        {TABS.map((x) => (
          <FilterChip key={x.id} active={x.id === current} href={x.id === 'violations' ? '/quality' : `/quality?tab=${x.id}`}>
            {x.label}
          </FilterChip>
        ))}
      </FilterBar>

      <Stack>
        {current === 'profiles' && <PageProfilesPanel />}
        {current === 'violations' && (
          <>
            <FilterBar>
              <StatusBadge tone="bad">HIGH {totals.HIGH ?? 0}</StatusBadge>
              <StatusBadge tone="warn">MEDIUM {totals.MEDIUM ?? 0}</StatusBadge>
              <StatusBadge tone="neutral">LOW {totals.LOW ?? 0}</StatusBadge>
            </FilterBar>
            <PanelCard title="違反バーンダウン">
              {burndown.length >= 2 ? <LineChart points={burndown} color="var(--accent)" /> : <div className="text-sm">履歴 {burndown.length} 点</div>}
            </PanelCard>
            <PanelCard title="ルール別">
              <DataTable columns={RULE_COLUMNS} rows={ruleRows} pageSize={100} />
            </PanelCard>
          </>
        )}

        {current === 'scoring' && (
          <>
            <PanelCard title="採点カバレッジ">
              {!census.present ? (
                <div className="text-sm">未生成</div>
              ) : (
                <div className="text-sm">
                  全 published <b>{(census.totals as Record<string, number>)?.total ?? '—'}</b> 件 · 採点済み{' '}
                  <b>{(census.totals as Record<string, number>)?.scored ?? '—'}</b>（
                  {(census.totals as Record<string, number>)?.coverage_pct ?? '—'}%） · 未採点{' '}
                  {(census.totals as Record<string, number>)?.unscored ?? '—'} · 不合格{' '}
                  {(census.totals as Record<string, number>)?.failed ?? '—'} · 薄層{' '}
                  {(census.totals as Record<string, number>)?.thin ?? '—'} · rewrite queue {census.rewrite_queue_count} 件
                </div>
              )}
            </PanelCard>
            <PanelCard title="品質サイクル進捗（総監キーワード）">
              <Link href="/quality/progress">進捗を開く →</Link>
            </PanelCard>
          </>
        )}

        {current === 'ledger' && <PastExamLedgerPanel />}
      </Stack>
    </>
  );
}
