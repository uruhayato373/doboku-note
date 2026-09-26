import Link from 'next/link';
import { readFileSync } from 'node:fs';
import { PageHead } from '@/components/ui';
import { findRepoRoot, repoPath } from '@/lib/repo-root';
import { domainList } from '@/lib/domains';
import { loadRoadmap, monthsOf, examTimeline } from '../../../../../../scripts/lib/annual-roadmap.mjs';

export const dynamic = 'force-dynamic';

type Item = { id: string; domain: string; start: string; end: string; label: string; backlogIds?: string[]; done?: boolean };
type Mark = { kind: string; label: string; date: string; estimated: boolean };
type Buy = { estimated: boolean; fromDate: string; toDate: string; label: string };
type Row = { id: string; label: string; marks: Mark[]; buys: Buy[] };

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const ICON: Record<string, string> = { exam: '●', result: '◆', application: '■' };
const COLOR: Record<string, string> = { exam: 'var(--accent)', result: 'var(--good)', application: 'var(--ink-muted)' };

/**
 * 同じ領域で期間がまったく同じ項目は 1 枚のカードにまとめ、期間が重なるカードだけ横に並べる（左から詰める）。
 */
function pack(items: Item[], months: string[]) {
  const groups = new Map<string, Item[]>();
  for (const it of items) {
    const k = `${it.start}_${it.end}`;
    groups.set(k, [...(groups.get(k) ?? []), it]);
  }
  const lanes: number[] = [];
  const placed = [...groups.values()]
    .map((g) => ({ items: g, s: months.indexOf(g[0].start), e: months.indexOf(g[0].end) }))
    .sort((a, b) => a.s - b.s || a.e - b.e)
    .map((x) => {
      let lane = lanes.findIndex((end) => end < x.s);
      if (lane < 0) { lanes.push(x.e); lane = lanes.length - 1; } else lanes[lane] = x.e;
      return { ...x, lane };
    });
  return { placed, lanes: Math.max(1, lanes.length) };
}

/**
 * /plan/roadmap — 年間ロードマップ（時間軸は縦＝月の行）。左は資格の行事（exam-calendar.json・翌年の未公表分は
 * 昨年度から推定して薄く表示）と買い場、右は領域ごとの重点（annual-roadmap.json）。どちらも正本から描き写しを持たない。
 */
export default function RoadmapPage() {
  const root = findRepoRoot();
  const cfg = loadRoadmap(root) as { period: { start: string; end: string }; buyWindowWeeks: number; items: Item[] };
  const months = monthsOf(cfg.period) as string[];
  const calendar = JSON.parse(readFileSync(repoPath('.claude', 'config', 'exam-calendar.json'), 'utf8'));
  const registry = JSON.parse(readFileSync(repoPath('.claude', 'config', 'qualification-registry.json'), 'utf8')) as {
    qualifications: { id: string; portfolio: string; label?: string; shortLabel?: string }[];
  };
  const active = registry.qualifications.filter((q) => q.portfolio === 'active');
  const nameOf = (id: string) => active.find((q) => q.id === id)?.shortLabel ?? active.find((q) => q.id === id)?.label ?? id;
  const rows = examTimeline(calendar, active.map((q) => q.id), cfg.period, cfg.buyWindowWeeks) as Row[];
  const domains = domainList();
  const thisMonth = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 7);

  // 月ごとの資格の行事と、その月に買い場がかかっている試験
  const eventsIn = (m: string) =>
    rows
      .flatMap((r) => r.marks.filter((x) => x.date.startsWith(m)).map((x) => ({ ...x, q: nameOf(r.id) })))
      .sort((a, b) => a.date.localeCompare(b.date));
  const buysIn = (m: string) =>
    rows.flatMap((r) =>
      r.buys
        .filter((b) => b.fromDate.slice(0, 7) <= m && m < b.toDate.slice(0, 7))
        .map((b) => ({ ...b, q: nameOf(r.id) })),
    );

  const cols = `64px minmax(220px, 1.3fr) repeat(${domains.length}, minmax(110px, 1fr))`;
  const header = (text: React.ReactNode, col: number) => (
    <div key={`h-${col}`} className="small" style={{ gridRow: 1, gridColumn: col, fontWeight: 700, padding: '6px', position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 3, borderBottom: '1px solid var(--border)' }}>
      {text}
    </div>
  );

  return (
    <>
      <PageHead title="年間ロードマップ" sub={`${cfg.period.start.replace('-', '/')}〜${cfg.period.end.replace('-', '/')}`} />
      <p className="small muted" style={{ marginBottom: 8 }}>
        ● 試験　◆ 合格発表　■ 申込　緑＝買い場（試験前 {cfg.buyWindowWeeks} 週）　薄い字＝昨年度からの推定
      </p>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: cols, gridTemplateRows: `auto repeat(${months.length}, minmax(64px, auto))`, minWidth: 1100 }}>
          {header('月', 1)}
          {header('資格の行事', 2)}
          {domains.map((d, i) => header(<Link href={`/domains/${d.id}`}>{d.label}</Link>, i + 3))}

          {months.map((m, r) => (
            <div
              key={`bg-${m}`}
              style={{
                gridRow: r + 2, gridColumn: `1 / span ${domains.length + 2}`,
                background: m === thisMonth ? 'var(--accent-fill)' : r % 2 ? 'var(--row-alt)' : undefined,
                borderTop: m.endsWith('-01') ? '2px solid var(--border)' : '1px solid var(--border-soft)',
              }}
            />
          ))}

          {months.map((m, r) => (
            <div key={`m-${m}`} className="small" style={{ gridRow: r + 2, gridColumn: 1, padding: 6, fontWeight: 700, zIndex: 1 }}>
              {m === months[0] || m.endsWith('-01') ? <div className="muted">{m.slice(0, 4)}</div> : null}
              {Number(m.slice(5))}月
            </div>
          ))}

          {months.map((m, r) => (
            <div key={`e-${m}`} className="small" style={{ gridRow: r + 2, gridColumn: 2, padding: 6, zIndex: 1 }}>
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
            </div>
          ))}

          {domains.map((d, di) => {
            const { placed, lanes } = pack(cfg.items.filter((it) => it.domain === d.id), months);
            return (
              <div
                key={`d-${d.id}`}
                style={{
                  gridRow: `2 / span ${months.length}`, gridColumn: di + 3, zIndex: 1,
                  display: 'grid', gridTemplateRows: 'subgrid', gridTemplateColumns: `repeat(${lanes}, 1fr)`,
                }}
              >
                {placed.map(({ items, s, e, lane }) => (
                  <div
                    key={items[0].id}
                    className="small"
                    style={{
                      gridRow: `${s + 1} / ${e + 2}`, gridColumn: lane + 1, margin: 3, padding: '4px 6px',
                      background: 'var(--panel)', border: '1px solid var(--border)',
                      borderLeft: '3px solid var(--accent)', borderRadius: 4, whiteSpace: 'normal', lineHeight: 1.45,
                    }}
                  >
                    {items.map((it) => (
                      <div key={it.id} style={{ marginBottom: 4, textDecoration: it.done ? 'line-through' : undefined }}>
                        {items.length > 1 ? '・' : ''}
                        {it.label}
                        {(it.backlogIds ?? []).map((b) => (
                          <Link key={b} href={`/todo?f=backlog&id=${encodeURIComponent(b)}`} className="mono" style={{ marginLeft: 4 }}>
                            {b}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
