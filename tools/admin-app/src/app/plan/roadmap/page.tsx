import Link from 'next/link';
import { readFileSync } from 'node:fs';
import { PageHead } from '@/components/ui';
import { findRepoRoot, repoPath } from '@/lib/repo-root';
import { domainList } from '@/lib/domains';
import { loadRoadmap, monthsOf, examTimeline } from '../../../../../../scripts/lib/annual-roadmap.mjs';
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
 * 右: その月に始まるカード（バックログの [時期:]・[領域:] が唯一の正本。重点の別台帳を持たない）。
 * 設定（期間・買い場の週数）は annual-roadmap.json。
 */
export default function RoadmapPage() {
  const root = findRepoRoot();
  const cfg = loadRoadmap(root) as { period: { start: string; end: string }; buyWindowWeeks: number };
  const months = monthsOf(cfg.period) as string[];
  const calendar = JSON.parse(readFileSync(repoPath('.claude', 'config', 'exam-calendar.json'), 'utf8'));
  const registry = JSON.parse(readFileSync(repoPath('.claude', 'config', 'qualification-registry.json'), 'utf8')) as {
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
      <p className="small muted" style={{ marginBottom: 8 }}>
        ● 試験　◆ 合格発表　■ 申込　緑＝買い場（試験前 {cfg.buyWindowWeeks} 週）　薄い字＝昨年度からの推定　右＝その月に始めるカード（バックログの [時期:]）
      </p>
      {before.length > 0 && (
        <p className="small project-warning-text">時期を過ぎたカード {before.length} 件（時期を見直すか完了を記録）: {before.map((c) => c.id).join(' ')}</p>
      )}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th style={{ width: 64 }}>月</th>
              <th style={{ width: '40%' }}>資格の行事</th>
              <th>やること（領域）</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m) => (
              <tr key={m} style={m === thisMonth ? { background: 'var(--accent-fill)' } : undefined}>
                <td style={{ verticalAlign: 'top', fontWeight: 700 }}>
                  {m === months[0] || m.endsWith('-01') ? <div className="small muted">{m.slice(0, 4)}</div> : null}
                  {mon(m)}
                </td>
                <td className="small" style={{ verticalAlign: 'top', whiteSpace: 'normal' }}>
                  {eventsIn(m).map((e, i) => (
                    <div key={i} style={{ opacity: e.estimated ? 0.5 : 1 }}>
                      <span style={{ color: COLOR[e.kind] ?? 'inherit' }}>{ICON[e.kind] ?? '・'}</span> {md(e.date)} {e.q} {e.label}
                      {e.estimated ? '（推定）' : ''}
                    </div>
                  ))}
                  {buysIn(m).map((b, i) => (
                    <div key={`b${i}`} style={{ color: 'var(--good)', opacity: b.estimated ? 0.5 : 1 }}>
                      買い場 {b.q} {b.label}（{md(b.toDate)}）
                    </div>
                  ))}
                </td>
                <td className="small" style={{ verticalAlign: 'top', whiteSpace: 'normal' }}>
                  {startsIn(m).map((c) => (
                    <div key={c.id ?? c.title} style={{ marginBottom: 3 }}>
                      <span className="muted">{c.domain ?? '—'}</span>{' '}
                      <Link href={`/todo?f=backlog&id=${encodeURIComponent(c.id ?? '')}`}>{c.title}</Link>
                      {c.w!.end !== c.w!.start && <span className="muted">（〜{mon(c.w!.end)}）</span>}
                      {c.wip && <span className="project-warning-text"> 進行中</span>}
                    </div>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
