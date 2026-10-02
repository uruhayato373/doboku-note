import Link from 'next/link';
import { readFileSync } from 'node:fs';
import { PanelCard, TableBody, TableCell, TableFrame, TableHead, TableHeader, TableRow } from '@/components/admin';
import { PageHead } from '@/components/ui';
import { findRepoRoot, repoPath } from '@/lib/repo-root';
import { domainList } from '@/lib/domains';
import { todoBoard } from '@/lib/todo';
import { renderMarkdown } from '@/lib/markdown';
import { loadRoadmap, monthsOf, examTimeline, lastYearSalesByMonth } from '../../../../../../scripts/lib/annual-roadmap.mjs';
import { loadMarketInputs } from '../../../../../../scripts/lib/market-inputs.mjs';
import { salesByQualification } from '../../../../../../scripts/lib/qualification-market.mjs';
import { parseBacklog, parseWhen } from '../../../../../../scripts/lib/backlog-lib.mjs';

export const dynamic = 'force-dynamic';

type Mark = { kind: string; label: string; date: string; estimated: boolean };
type Buy = { estimated: boolean; fromDate: string; toDate: string; label: string };
type Row = { id: string; label: string; marks: Mark[]; buys: Buy[] };

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const mon = (ym: string) => `${Number(ym.slice(5))}月`;
const ICON: Record<string, string> = { exam: '●', result: '◆', application: '■' };
const COLOR: Record<string, string> = { exam: 'var(--accent)', result: 'var(--good)', application: 'var(--ink-muted)' };

/**
 * /plan/roadmap — 年間ロードマップ（時間軸は縦＝月の行）。
 * 左: 資格の行事と買い場（exam-calendar.json・翌年の未公表分は昨年度から推定して薄字）。
 * 中: 前年同月の資格別売上（sales.json・orders.json を qualification-market.mjs の salesByQualification で資格へ振り分け・値を写さない）。
 * 右: その月に始まるカード（バックログの [時期:]・[領域:] が唯一の正本。重点の別台帳を持たない）。
 * 設定（期間・買い場の週数）は annual-roadmap.json。年間の方針（注力しない・四半期定例）は annual.md を下部に表示する
 * （年間の画面はここだけ。/todo?f=annual はここへ転送）。
 */
export default function RoadmapPage() {
  const root = findRepoRoot();
  const cfg = loadRoadmap(root) as { period: { start: string; end: string }; buyWindowWeeks: number };
  const months = monthsOf(cfg.period) as string[];
  const calendar = JSON.parse(readFileSync(repoPath('config', 'exam-calendar.json'), 'utf8'));
  const registry = JSON.parse(readFileSync(repoPath('config', 'qualification-registry.json'), 'utf8')) as {
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
  const thisMonth = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 7);
  const lastYear = lastYearSalesByMonth(salesByQualification(loadMarketInputs(root)), months) as Record<
    string,
    { month: string; total: number; items: { id: string; yen: number }[] }
  >;
  const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;
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
      <PageHead title="年間ロードマップ" sub={`${cfg.period.start.replace('-', '/')}〜${cfg.period.end.replace('-', '/')}`} />
      <p className="mb-2 text-xs text-muted-foreground">
        ● 試験　◆ 合格発表　■ 申込　緑＝買い場（試験前 {cfg.buyWindowWeeks} 週）　薄い字＝昨年度からの推定　中＝前年同月の売上（資格別）　右＝その月に始めるカード（バックログの [時期:]）
      </p>
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
            <TableRow key={m} style={m === thisMonth ? { background: 'var(--accent-fill)' } : undefined}>
              <TableCell className="align-top font-bold">
                {m === months[0] || m.endsWith('-01') ? <div className="text-xs text-muted-foreground">{m.slice(0, 4)}</div> : null}
                {mon(m)}
              </TableCell>
              <TableCell className="align-top whitespace-normal text-xs">
                {eventsIn(m).map((e, i) => (
                  <div key={i} className={e.estimated ? 'opacity-50' : undefined}>
                    <span style={{ color: COLOR[e.kind] ?? 'inherit' }}>{ICON[e.kind] ?? '・'}</span> {md(e.date)} {e.q} {e.label}
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
      {annualNotes ? (
        <PanelCard title="年間の方針" className="mt-4">
          <div className="md-prose small" dangerouslySetInnerHTML={{ __html: renderMarkdown(annualNotes) }} />
        </PanelCard>
      ) : null}
    </>
  );
}
