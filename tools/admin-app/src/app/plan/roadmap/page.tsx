import Link from 'next/link';
import { redirect } from 'next/navigation';
import { longformPlanHref } from '@/lib/content-plan-links';
import { readFileSync } from 'node:fs';
import { PanelCard, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow, FilterBar, FilterChip } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { ChannelAnnualBoard, type BoardChannel } from '@/components/channel-annual-board';
import { magazines } from '@/lib/content';
import { findRepoRoot, repoPath } from '@/lib/repo-root';
import { stanceLabels } from '@/lib/competitor-positions';
import { domainList } from '@/lib/domains';
import { todoBoard } from '@/lib/todo';
import { renderMarkdown } from '@/lib/markdown';
import { loadRoadmap, monthsOf, examTimeline, lastYearSalesByMonth } from '../../../../../../scripts/lib/annual-roadmap.mjs';
import { datasetPath } from '../../../../../../scripts/lib/datasets.mjs';
import { loadMarketInputs } from '../../../../../../scripts/lib/market-inputs.mjs';
import { salesByQualification } from '../../../../../../scripts/lib/qualification-market.mjs';
import { parseBacklog, parseWhen } from '../../../../../../scripts/lib/backlog-lib.mjs';
import { jstMonth } from '../../../../../../scripts/lib/jst-date.mjs';
import { loadChannelPlanAudit } from '../../../../../../scripts/lib/channel-plan.mjs';
import { metricStateLabel } from '../../../../../../scripts/lib/metric-status.mjs';
import { loadPlanAudit } from '../../../../../../scripts/lib/youtube-longform-plan.mjs';
import { yen } from '@/lib/format';

export const dynamic = 'force-dynamic';

type Mark = { kind: string; label: string; date: string; estimated: boolean };
type Buy = { estimated: boolean; fromDate: string; toDate: string; label: string };
type Row = { id: string; label: string; marks: Mark[]; buys: Buy[] };

const fiscalOrder = (ym: string) => (Number(ym.slice(5)) + 8) % 12;

/** 年間の枠の 1 枚に出す形へ。YouTube は枠の形が違うので、ここで揃える */
function channelBoard(root: string, calendar: Parameters<typeof examTimeline>[0], buyWindowWeeks: number) {
  const { plan, x, instagram, statuses, youtubeMetrics } = loadChannelPlanAudit(root);
  const metricsOf = (ids: string[]) => ids.map((id) => {
    const s = statuses.get(id) as { label: string; state: string } | undefined;
    return { label: s?.label ?? id, state: s ? (metricStateLabel(s.state) as string) : '定義なし', ok: s?.state === 'measured' };
  });
  const youtube = loadPlanAudit(root).audit;
  const stances = stanceLabels(root);
  const readable = <T extends { stance: string }>(slot: T): T => ({ ...slot, stance: stances.get(slot.stance) ?? slot.stance });
  const social = (id: 'x' | 'instagram', a: typeof x): BoardChannel => {
    const c = plan.channels[id];
    return {
      id, label: c.label, role: c.role, state: c.operation.status === 'hold' ? '保留' : '運用中', weekly: `平常 ${c.weeklyMax} 本・山場 ${c.peakWeeklyMax} 本`,
      planned: a.planned, capacity: a.capacity, metrics: metricsOf(c.metrics.primary), slots: c.slots.map(readable), pending: a.pending, errors: [...a.errors, ...a.warnings],
    };
  };
  const period = { start: plan.cycle.window.from, end: plan.cycle.window.to };
  const ordered = (monthsOf(period) as string[]).sort((a, b) => fiscalOrder(a) - fiscalOrder(b));
  const examIds = [...new Set([...plan.slots, ...plan.channels.x.slots, ...plan.channels.instagram.slots].map((s) => s.exam))];
  const timeline = examTimeline(calendar, examIds, period, buyWindowWeeks) as Row[];
  return {
    period,
    notes: [plan.cycle.calendarBasis, plan.metrics.target],
    marks: Object.fromEntries(timeline.map((r) => [r.id, r.marks.map((m) => ({ month: m.date.slice(0, 7), kind: m.kind, tooltip: `${m.date}${m.estimated ? '（推定）' : ''} ${m.label}` }))])),
    // 期は 12 か月なので月の数字は重ならない。4 月始まりに並べる（窓の判定は年つきの YYYY-MM のまま）
    months: ordered,
    channels: [
      {
        id: 'youtube', label: 'YouTube', role: '検索と理解。通常動画で教材へ送り、ショートは通常動画へ案内する', state: '運用中',
        weekly: `平常 ${plan.cycle.weeklyMax} 本・山場 ${plan.cycle.peakWeeklyMax} 本`, planned: youtube.planned, capacity: youtube.capacity,
        metrics: metricsOf(plan.metrics.primary), slots: plan.slots.map(readable), pending: [...youtube.pending, ...youtubeMetrics.pending], errors: [...youtube.errors, ...youtube.warnings, ...youtubeMetrics.errors, ...youtubeMetrics.warnings],
      },
      social('x', x), social('instagram', instagram),
    ],
  };
}

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const mon = (ym: string) => `${Number(ym.slice(5))}月`;
const ICON: Record<string, string> = { exam: '●', result: '◆', application: '■' };
const COLOR: Record<string, string> = { exam: 'text-[color:var(--accent)]', result: 'text-[color:var(--good)]', application: 'text-[color:var(--ink-muted)]' };

/**
 * /plan/roadmap — 年間ロードマップ（時間軸は縦＝月の行）。
 * 左: 資格の行事と買い場（exam-calendar.json・翌年の未公表分は昨年度から推定して薄字）。
 * 中: 前年同月の資格別売上（sales.json・orders.json を qualification-market.mjs の salesByQualification で資格へ振り分け・値を写さない）。
 * 右: その月に始まるカード（バックログの [時期:]・[領域:] が唯一の正本。重点の別台帳を持たない）。
 * 設定（期間・買い場の週数）は annual-roadmap.json。年間の方針（注力しない・四半期定例）は annual.md を下部に表示する
 * （年間の画面はここだけ。/todo?f=annual はここへ転送）。
 */
export default async function RoadmapPage({ searchParams }: { searchParams: Promise<{ tab?: string; view?: string; m?: string; e?: string; library?: string; ch?: string }> }) {
  const sp = await searchParams;
  if (sp.view === 'video') redirect(longformPlanHref(sp));
  const root = findRepoRoot();
  const cfg = loadRoadmap(root) as { period: { start: string; end: string }; buyWindowWeeks: number };
  const months = monthsOf(cfg.period) as string[];
  const calendar = JSON.parse(readFileSync(repoPath(datasetPath('config.exam-calendar')), 'utf8'));
  const registry = JSON.parse(readFileSync(repoPath(datasetPath('config.qualification-registry')), 'utf8')) as {
    qualifications: { id: string; portfolio: string; label?: string; shortLabel?: string }[];
  };
  const active = registry.qualifications.filter((q) => q.portfolio === 'active');
  const nameOf = (id: string) => active.find((q) => q.id === id)?.shortLabel ?? active.find((q) => q.id === id)?.label ?? id;
  const rows = examTimeline(calendar, active.map((q) => q.id), cfg.period, cfg.buyWindowWeeks) as Row[];
  const domains = domainList();
  const rank = (label: string | null) => {
    const i = domains.findIndex((d) => d.label === label);
    return i < 0 ? 99 : i;
  };
  const thisMonth = jstMonth();
  const board = sp.tab === 'channels' ? channelBoard(root, calendar, cfg.buyWindowWeeks) : null;
  const magazineNames = new Map(magazines().map((m) => [m.id, m.shortTitle ?? m.title]));
  const lastYear = lastYearSalesByMonth(salesByQualification(loadMarketInputs(root)), months) as Record<
    string,
    { month: string; total: number; items: { id: string; yen: number }[] }
  >;
  const annualNotes = todoBoard().files.find((f) => f.id === 'annual')?.notes ?? '';

  const cards = (parseBacklog(readFileSync(repoPath('.claude', 'todo', 'backlog.md'), 'utf8')) as {
    id: string | null; title: string; domain: string | null; when: string | null; wip: boolean;
  }[])
    .map((c) => ({ ...c, w: parseWhen(c.when) }))
    .filter((c) => c.w);
  const before = cards.filter((c) => c.w!.end < cfg.period.start);
  const startsIn = (m: string) =>
    cards
      .filter((c) => (c.w!.start < cfg.period.start ? m === cfg.period.start && c.w!.end >= m : c.w!.start === m))
      .sort((a, b) => rank(a.domain) - rank(b.domain));

  const eventsIn = (m: string) =>
    rows
      .flatMap((r) => r.marks.filter((x) => x.date.startsWith(m)).map((x) => ({ ...x, q: nameOf(r.id) })))
      .sort((a, b) => a.date.localeCompare(b.date));
  const buysIn = (m: string) =>
    rows.flatMap((r) => r.buys.filter((b) => b.fromDate.slice(0, 7) <= m && m < b.toDate.slice(0, 7)).map((b) => ({ ...b, q: nameOf(r.id) })));

  return (
    <>
      <PageHead title="年間ロードマップ" sub={board ? `計画の期間 ${board.period.start.replace('-', '/')}〜${board.period.end.replace('-', '/')}・4 月始まり` : `${cfg.period.start.replace('-', '/')}〜${cfg.period.end.replace('-', '/')}`} />
      <FilterBar className="mb-3!">
        <FilterChip active={!sp.tab} href="/plan/roadmap">ロードマップ</FilterChip>
        <FilterChip active={sp.tab === 'channels'} href="/plan/roadmap?tab=channels">チャネルの年間の枠</FilterChip>
        {annualNotes && <FilterChip active={sp.tab === 'policy'} href="/plan/roadmap?tab=policy">年間の方針</FilterChip>}
      </FilterBar>
      {sp.tab === 'channels' ? (
        <ChannelAnnualBoard {...board!} nameOf={nameOf} targetLabel={(_kind, id) => magazineNames.get(id) ?? id} active={sp.ch} view={sp.view} />
      ) : sp.tab === 'policy' && annualNotes ? (
        <PanelCard title="年間の方針">
          <div className="md-prose small" dangerouslySetInnerHTML={{ __html: renderMarkdown(annualNotes) }} />
        </PanelCard>
      ) : (
      <>
      {before.length > 0 && (
        <p className="small project-warning-text">時期を過ぎたカード {before.length} 件（時期を見直すか完了を記録）: {before.map((c) => c.id).join(' ')}</p>
      )}
      <TableFrame>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">月</TableHead>
            <TableHead className="w-[34%]">資格の行事</TableHead>
            <TableHead className="w-[18%]">前年同月の売上</TableHead>
            <TableHead>やること（領域）</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {months.map((m) => (
            <TableRow key={m} id={`month-${m}`} className={m === thisMonth ? 'bg-[var(--accent-fill)]' : undefined}>
              <TableCell className="align-top font-bold">
                {m === months[0] || m.endsWith('-01') ? <div className="text-xs text-muted-foreground">{m.slice(0, 4)}</div> : null}
                {mon(m)}
              </TableCell>
              <TableCell className="align-top whitespace-normal text-xs">
                {eventsIn(m).map((e, i) => (
                  <div key={i} className={e.estimated ? 'opacity-50' : undefined}>
                    <span className={COLOR[e.kind]}>{ICON[e.kind] ?? '・'}</span> {md(e.date)} {e.q} {e.label}
                    {e.estimated ? '（推定）' : ''}
                  </div>
                ))}
                {buysIn(m).map((b, i) => (
                  <div key={`b${i}`} className={'text-[color:var(--good)]' + (b.estimated ? ' opacity-50' : '')}>
                    買い場 {b.q} {b.label}（{md(b.toDate)}）
                  </div>
                ))}
              </TableCell>
              <TableCell className="align-top whitespace-normal text-xs">
                {lastYear[m].total > 0 ? (
                  <>
                    <div className="font-bold">{yen(lastYear[m].total)}</div>
                    {lastYear[m].items.map((x) => (
                      <div key={x.id} className="text-muted-foreground">
                        {nameOf(x.id)} {yen(x.yen)}
                      </div>
                    ))}
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="align-top whitespace-normal text-xs">
                {startsIn(m).map((c) => (
                  <div key={c.id ?? c.title} className="mb-[3px]">
                    <span className="text-muted-foreground">{c.domain ?? '—'}</span>{' '}
                    <Link href={`/todo?f=backlog&id=${encodeURIComponent(c.id ?? '')}`}>{c.title}</Link>
                    {c.w!.end !== c.w!.start && <span className="text-muted-foreground">（〜{mon(c.w!.end)}）</span>}
                    {c.wip && <span className="project-warning-text"> 進行中</span>}
                  </div>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableFrame>
      </>
      )}
    </>
  );
}
