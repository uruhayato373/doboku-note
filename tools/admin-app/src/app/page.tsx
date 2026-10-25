import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageHead } from '@/components/ui';
import { Grid, Section, Stack } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PanelCard, StatCard, StatusBadge, type Tone } from '@/components/admin';
import { monthDay, withUnit, yen } from '@/lib/format';
import { loadKpiView, type ReceiptChannel } from '@/lib/kpi-tree';
import { jstMonth } from '../../../../scripts/lib/jst-date.mjs';

export const dynamic = 'force-dynamic';

/**
 * トップ = KPI。一目で分かる最小限だけを上に出す: 受取額と目標 → どこから売れたか（チャネル別・資格別の販売額）
 * → 入口（サイト・検索クラスター）。受取額は週次で更新する 3 つの台帳から直接合計し（net-receipts.mjs の monthReceipts）、
 * 月の途中や確定前でも取得分を出す。既定は今月（途中経過）。KPI ツリーの全行と集客の推移は別ページ（下部のカードから開く）（docs/strategy/15_KPIツリー.md）。
 */
const RECEIPT_STATUS: Record<ReceiptChannel['status'], { label: string; tone: Tone }> = {
  final: { label: '確定', tone: 'good' },
  'to-date': { label: '途中', tone: 'info' },
  estimate: { label: '推計', tone: 'warn' },
  missing: { label: '未取得', tone: 'bad' },
};

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** 横棒。最大値に対する割合で長さを決める。値が無いものは「—」。 */
function Bars({ rows }: { rows: { label: string; value: number | null }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value ?? 0));
  return (
    <Stack gap="sm">
      {rows.map((r) => (
        <div key={r.label} className="grid grid-cols-[9em_1fr_6em] items-center gap-2 text-xs">
          <span>{r.label}</span>
          <Progress value={((r.value ?? 0) / max) * 100} />
          <span className="text-right tabular-nums">{yen(r.value)}</span>
        </div>
      ))}
    </Stack>
  );
}

/** 詳細ページへの入口。カード全体がリンク。 */
function LinkCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="rounded-lg text-inherit no-underline hover:no-underline focus-visible:ring-2 focus-visible:ring-ring">
      <PanelCard title={title} description={desc} className="h-full transition-colors hover:bg-muted/40">
        <div className="flex justify-end text-muted-foreground">
          <ArrowRight className="size-4" />
        </div>
      </PanelCard>
    </Link>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const thisMonth = jstMonth();
  const v = loadKpiView(month ?? thisMonth);
  const r = v.receiptsLive;
  const rate = r.total != null && v.goal ? r.total / v.goal.value : null;
  const next = shiftMonth(v.month, 1);

  return (
    <Stack gap="lg">
      <Stack gap="md">
        <PageHead title="KPI" />
        <nav className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/?month=${shiftMonth(v.month, -1)}`}>← 前の月</Link>
          </Button>
          <Button variant="secondary" size="sm" disabled>{v.month}</Button>
          {next <= thisMonth && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/?month=${next}`}>次の月 →</Link>
            </Button>
          )}
        </nav>

        <PanelCard
          title="月の受取額（手数料控除後）"
          description={r.total != null ? (r.complete ? '確定' : v.month === thisMonth ? '今月の途中経過' : '確定前（推計・未取得を含む）') : undefined}
        >
          <div className="flex flex-col gap-3">
            <div className="text-4xl leading-tight font-extrabold tabular-nums">
              {yen(r.total)}
              {v.goal && <span className="text-xs font-normal text-muted-foreground"> / 目標 {yen(v.goal.value)}</span>}
            </div>
            {rate != null ? (
              <>
                <Progress
                  value={Math.min(100, rate * 100)}
                  className="h-3 max-w-[560px]"
                  indicatorClassName={rate >= 1 ? 'bg-(--good)' : 'bg-(--warn)'}
                />
                <span className="text-xs">
                  達成率 {Math.round(rate * 100)}% ・ あと {yen(Math.max(0, (v.goal?.value ?? 0) - (r.total ?? 0)))}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">この月の受取額はまだ 1 つも取得していない</span>
            )}
            <Stack gap="sm">
              {r.channels.map((c) => (
                <div key={c.id} className="grid grid-cols-[5em_4.5em_7em_1fr] items-center gap-2 text-xs">
                  <span>{c.label}</span>
                  <StatusBadge tone={RECEIPT_STATUS[c.status].tone}>{RECEIPT_STATUS[c.status].label}</StatusBadge>
                  <span className="text-right tabular-nums">{yen(c.value)}</span>
                  <span className="text-muted-foreground">
                    {c.asOf && `${monthDay(c.asOf)} 取得 ・ `}
                    {c.note}
                  </span>
                </div>
              ))}
            </Stack>
          </div>
        </PanelCard>

        <Grid min="lg">
          <PanelCard title="チャネル別の販売額">
            <Bars rows={v.channels} />
          </PanelCard>
          <PanelCard title="資格別の販売額">
            <Bars rows={v.qualifications} />
          </PanelCard>
        </Grid>
      </Stack>

      <Section
        title="入口（サイト）"
        note={<>検索語は Google の直近 28 日（{v.search.period ?? '未取得'}）・<Link href="/metrics/search-strategy">検索の詳細</Link></>}
      >
        <Grid min="sm">
          <StatCard label="インデックス率" value={withUnit(v.site.indexRatio, '%')} />
          <StatCard label="Google クリック" value={withUnit(v.site.gscClicks, '')} sub="この月" />
          {v.search.clusters.map((c) => (
            <StatCard
              key={c.label}
              label={`${v.search.topLabel}の検索語・${c.label}`}
              value={String(c.top10)}
              sub={c.prevTop10 == null ? undefined : `前 ${c.prevTop10}`}
            />
          ))}
        </Grid>
      </Section>

      <Section title="詳しく見る">
        <Grid min="md">
          <LinkCard href={`/metrics/kpi?month=${v.month}`} title="KPI ツリー" desc="全指標を資格別の表で" />
          <LinkCard href="/metrics/traffic" title="集客の推移" desc="PV・流入のグラフとデータの更新状況" />
          <LinkCard href="/metrics/search-strategy" title="検索キーワード" desc="クラスター別の順位と改善候補" />
        </Grid>
      </Section>
    </Stack>
  );
}
