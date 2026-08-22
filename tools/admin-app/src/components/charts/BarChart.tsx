/**
 * BarChart — 月次売上の棒グラフ（依存追加なしのサーバーレンダー inline SVG）。
 * 色は globals.css の CSS 変数（--accent / --good / --bad / --ink-muted）を使い、
 * ライト/ダーク両テーマで破綻しない。
 */
export interface Bar {
  label: string;
  value: number;
  highlight?: boolean;
}

export function BarChart({
  bars,
  milestone,
  milestoneLabel,
  unit = (v) => (v / 1000).toFixed(0) + 'k',
}: {
  bars: Bar[];
  milestone?: number;
  milestoneLabel?: string;
  unit?: (v: number) => string;
}) {
  if (bars.length === 0) return <div className="empty">データなし</div>;
  const W = 720;
  const H = 220;
  const padL = 12;
  const padB = 28;
  const padT = 18;
  const max = Math.max(milestone ?? 0, ...bars.map((b) => b.value)) * 1.1 || 1;
  const bw = (W - padL - 12) / bars.length;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: W, height: 'auto' }} role="img">
      {milestone ? (
        <g>
          <line
            x1={padL}
            y1={y(milestone).toFixed(1)}
            x2={W - 12}
            y2={y(milestone).toFixed(1)}
            stroke="var(--bad)"
            strokeDasharray="4 3"
            strokeWidth="1"
          />
          <text x={padL + 2} y={(y(milestone) - 3).toFixed(1)} fontSize="9" fill="var(--bad)">
            {milestoneLabel ?? `${unit(milestone)} ライン`}
          </text>
        </g>
      ) : null}
      {bars.map((b, i) => {
        const x = padL + i * bw + bw * 0.15;
        const w = bw * 0.7;
        const top = y(b.value);
        return (
          <g key={b.label + i}>
            <rect
              x={x.toFixed(1)}
              y={top.toFixed(1)}
              width={w.toFixed(1)}
              height={(H - padB - top).toFixed(1)}
              fill={b.highlight ? 'var(--good)' : 'var(--accent)'}
              rx="2"
            />
            <text x={(x + w / 2).toFixed(1)} y={(top - 4).toFixed(1)} textAnchor="middle" fontSize="10" fill="var(--ink-muted)">
              {unit(b.value)}
            </text>
            <text
              x={(x + w / 2).toFixed(1)}
              y={(H - padB + 14).toFixed(1)}
              textAnchor="middle"
              fontSize="10"
              fill="var(--ink-muted)"
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
