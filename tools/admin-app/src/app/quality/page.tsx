import Link from 'next/link';
import { PanelCard, StatusBadge, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, numCol } from '@/components/admin';
import { Stack } from '@/components/layout';
import { PageHead } from '@/components/ui';
import LineChart from '@/components/charts/LineChart';
import { qualitySummary, qualityCensus, type Severity } from '@/lib/quality';
import type { Tone } from '@/components/admin';
import PastExamLedgerPanel from './PastExamLedgerPanel';

export const dynamic = 'force-dynamic';

const sevTone = (s: Severity | string): Tone => (s === 'HIGH' ? 'bad' : s === 'LOW' ? 'neutral' : 'warn');

export default function QualityPage() {
  const data = qualitySummary();
  const census = qualityCensus();
  const { totals, articleCount, byRule, history, window: win } = data;

  const burndown = (() => {
    const byDate: Record<string, (typeof history)[number]> = {};
    for (const h of history) byDate[h.date] = h;
    return Object.values(byDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p) => ({ label: p.date.slice(5), value: p.violations }));
  })();

  const winStr = win ? `${win.start}〜${win.end}` : '';

  return (
    <>
      <PageHead
        title="品質概観"
        sub={`違反のある記事 ${articleCount} 件 · 全体傾向とルール別内訳（人気集計期間 ${winStr}）· 記事別品質は「サイト記事」に統合`}
      />

      <Stack>
      <PastExamLedgerPanel />

      <PanelCard
        title="品質サイクル進捗（総監キーワード）"
        description="キーワードページごとの採点・弱い軸・リライト状況・検索の順位"
      >
        <Link href="/quality/progress">進捗を開く →</Link>
      </PanelCard>

      {/* 採点カバレッジ census */}
      <PanelCard title="採点カバレッジ（census）">
        {!census.present ? (
          <div className="text-sm text-muted-foreground">
            未生成。<code>npm run quality-census</code> を実行すると資格 × group の採点率が出ます。
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            全 published <b>{(census.totals as Record<string, number>)?.total ?? '—'}</b> 件 · 採点済み{' '}
            <b>{(census.totals as Record<string, number>)?.scored ?? '—'}</b>（
            {(census.totals as Record<string, number>)?.coverage_pct ?? '—'}%） · 未採点{' '}
            {(census.totals as Record<string, number>)?.unscored ?? '—'} · 不合格{' '}
            {(census.totals as Record<string, number>)?.failed ?? '—'} · 薄層{' '}
            {(census.totals as Record<string, number>)?.thin ?? '—'} · rewrite queue {census.rewrite_queue_count} 件 · 生成{' '}
            {(census.generated_at ?? '').slice(0, 10)}
          </div>
        )}
      </PanelCard>

      {/* 違反サマリ */}
      <PanelCard title="違反サマリ">
        <Stack gap="sm">
        <div className="filterbar">
          <StatusBadge tone="bad">HIGH {totals.HIGH ?? 0}</StatusBadge>
          <StatusBadge tone="warn">MEDIUM {totals.MEDIUM ?? 0}</StatusBadge>
          <StatusBadge tone="neutral">LOW {totals.LOW ?? 0}</StatusBadge>
        </div>
        <p className="m-0 text-sm text-muted-foreground">
          対象 = fullScan ルール（表/入れ子/段落/見出し/文体）の baseline。更新は{' '}
          <code>npm run check-content-quality</code> → <code>update-content-quality-baseline</code>
        </p>
        </Stack>
      </PanelCard>

      {/* 違反バーンダウン */}
      <PanelCard title="違反バーンダウン" description={`history.jsonl · ${burndown.length} 点`}>
        {burndown.length >= 2 ? (
          <LineChart points={burndown} color="var(--accent)" />
        ) : (
          <div className="text-sm text-muted-foreground">
            履歴 {burndown.length} 点。<code>npm run quality-snapshot</code> を週次で回すとバーンダウンが出ます。
          </div>
        )}
      </PanelCard>

      {/* ルール別 */}
      <PanelCard title="ルール別（違反の内訳）">
        <TableFrame>
          <TableHeader>
            <TableRow>
              <TableHead>ルール</TableHead>
              <TableHead>重大度</TableHead>
              <TableHead className={numCol}>記事数</TableHead>
              <TableHead className={numCol}>違反数</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byRule.map((r) => (
              <TableRow key={r.rule}>
                <TableCell>
                  <StatusBadge tone={sevTone(r.severity)}>{r.rule}</StatusBadge>
                </TableCell>
                <TableCell>{r.severity}</TableCell>
                <TableCell className={numCol}>{r.files}</TableCell>
                <TableCell className={numCol}>{r.total}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableFrame>
      </PanelCard>
      </Stack>
    </>
  );
}
