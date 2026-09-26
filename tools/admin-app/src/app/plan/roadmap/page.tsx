import Link from 'next/link';
import { readFileSync } from 'node:fs';
import { PageHead } from '@/components/ui';
import { findRepoRoot, repoPath } from '@/lib/repo-root';
import { domainList } from '@/lib/domains';
import { loadRoadmap, monthsOf, examTimeline } from '../../../../../../scripts/lib/annual-roadmap.mjs';

export const dynamic = 'force-dynamic';

type Item = { id: string; domain: string; start: string; end: string; label: string; backlogIds?: string[]; done?: boolean };
type Mark = { kind: string; label: string; date: string; at: number; estimated: boolean };
type Row = { id: string; label: string; marks: Mark[]; buys: { from: number; to: number; estimated: boolean }[] };

const LABEL_W = 170;
const pct = (x: number) => `${(x * 100).toFixed(3)}%`;
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

/** 重なる帯を別の段に積む（左から詰める）。 */
function pack(items: Item[], months: string[]) {
  const lanes: { end: number }[] = [];
  return items
    .map((it) => ({ it, s: months.indexOf(it.start), e: months.indexOf(it.end) }))
    .sort((a, b) => a.s - b.s)
    .map((x) => {
      let lane = lanes.findIndex((l) => l.end < x.s);
      if (lane < 0) { lanes.push({ end: x.e }); lane = lanes.length - 1; } else lanes[lane].end = x.e;
      return { ...x, lane };
    });
}

/**
 * /plan/roadmap — 年間ロードマップ。上段は資格の試験カレンダー（exam-calendar.json・翌年の未公表分は
 * 昨年度から推定して破線）と買い場、下段は領域ごとの重点（annual-roadmap.json）。どちらも正本から描き写しを持たない。
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
  const rows = examTimeline(calendar, active.map((q) => q.id), cfg.period, cfg.buyWindowWeeks) as Row[];
  const nameOf = (id: string) => active.find((q) => q.id === id)?.shortLabel ?? active.find((q) => q.id === id)?.label ?? id;
  const domains = domainList();

  const start = Date.parse(`${cfg.period.start}-01T00:00:00Z`);
  const [ey, em] = cfg.period.end.split('-').map(Number);
  const end = Date.UTC(ey, em, 1);
  const today = (Date.now() - start) / (end - start);

  const grid = { display: 'grid', gridTemplateColumns: `${LABEL_W}px 1fr`, alignItems: 'stretch' } as const;
  const monthBg = (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
      {months.map((m, i) => (
        <div key={m} style={{ borderLeft: '1px solid var(--border-soft)', background: i % 2 ? 'var(--row-alt)' : undefined }} />
      ))}
    </div>
  );
  const todayLine = today > 0 && today < 1 && (
    <div style={{ position: 'absolute', top: 0, bottom: 0, left: pct(today), borderLeft: '2px solid var(--accent)', zIndex: 3 }} />
  );

  return (
    <>
      <PageHead title="年間ロードマップ" sub={`${cfg.period.start.replace('-', '/')}〜${cfg.period.end.replace('-', '/')}`} />
      <p className="small muted" style={{ marginBottom: 8 }}>
        ● 試験　◆ 合格発表　■ 申込　色帯＝買い場（試験前 {cfg.buyWindowWeeks} 週）　破線＝昨年度からの推定　縦線＝今日
      </p>

      <div className="card" style={{ padding: 12 }}>
        <div style={grid}>
          <div />
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
            {months.map((m) => (
              <div key={m} className="small" style={{ textAlign: 'center', fontWeight: 700, padding: '4px 0' }}>
                {m.endsWith('-01') || m === months[0] ? `${m.slice(2, 4)}/` : ''}
                {Number(m.slice(5))}月
              </div>
            ))}
          </div>
        </div>

        {rows.map((r) => (
          <div key={r.id} style={{ ...grid, minHeight: 30 }}>
            <div className="small" style={{ padding: '6px 8px 6px 0', fontWeight: 600 }}>{nameOf(r.id)}</div>
            <div style={{ position: 'relative' }}>
              {monthBg}
              {todayLine}
              {r.buys.map((b, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute', top: 6, bottom: 6, left: pct(b.from), width: pct(Math.max(0, b.to - b.from)),
                    background: 'var(--good-fill)', opacity: b.estimated ? 0.5 : 0.9, borderRadius: 4,
                    border: b.estimated ? '1px dashed var(--good)' : undefined, zIndex: 1,
                  }}
                />
              ))}
              {r.marks.map((m, i) => (
                <span
                  key={i}
                  title={`${m.label} ${md(m.date)}${m.estimated ? '（推定）' : ''}`}
                  style={{
                    position: 'absolute', top: '50%', left: pct(m.at), transform: 'translate(-50%, -50%)', zIndex: 2,
                    fontSize: m.kind === 'exam' ? 14 : 11, lineHeight: 1, opacity: m.estimated ? 0.45 : 1,
                    color: m.kind === 'exam' ? 'var(--accent)' : m.kind === 'result' ? 'var(--good)' : 'var(--ink-muted)',
                  }}
                >
                  {m.kind === 'exam' ? '●' : m.kind === 'result' ? '◆' : '■'}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 12, marginTop: 16 }}>
        {domains.map((d) => {
          const packed = pack(cfg.items.filter((it) => it.domain === d.id), months);
          const lanes = Math.max(1, ...packed.map((p) => p.lane + 1));
          return (
            <div key={d.id} style={{ ...grid, borderTop: '1px solid var(--border-soft)' }}>
              <div className="small" style={{ padding: '6px 8px 6px 0', fontWeight: 700 }}>
                <Link href={`/domains/${d.id}`}>{d.label}</Link>
              </div>
              <div style={{ position: 'relative', height: lanes * 30 + 6 }}>
                {monthBg}
                {todayLine}
                {packed.map(({ it, s, e, lane }) => (
                  <div
                    key={it.id}
                    title={it.label}
                    className="small"
                    style={{
                      position: 'absolute', top: 4 + lane * 30, height: 24, zIndex: 2,
                      left: `calc(${pct(s / months.length)} + 2px)`, width: `calc(${pct((e - s + 1) / months.length)} - 4px)`,
                      background: it.done ? 'var(--panel-2)' : 'var(--accent-fill)', border: '1px solid var(--border)',
                      borderRadius: 4, padding: '3px 6px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      textDecoration: it.done ? 'line-through' : undefined,
                    }}
                  >
                    {(it.backlogIds ?? []).map((b) => (
                      <Link key={b} href={`/todo?f=backlog&id=${encodeURIComponent(b)}`} className="mono" style={{ marginRight: 4 }}>
                        {b.replace('DN-', '')}
                      </Link>
                    ))}
                    {it.label}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
