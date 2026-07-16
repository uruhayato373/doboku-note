/**
 * LineChart — 依存なしのサーバーレンダー inline SVG 折れ線。
 * 単系列の時系列（例: GA4 activeUsers / sessions）向け。
 */
export interface LinePoint {
  label: string;
  value: number;
}

export default function LineChart({
  points,
  height = 160,
  color = 'var(--accent)',
  unit = '',
}: {
  points: LinePoint[];
  height?: number;
  color?: string;
  unit?: string;
}) {
  if (points.length === 0) return <div className="empty">データなし</div>;

  const W = 720;
  const H = height;
  const padL = 44;
  const padR = 12;
  const padT = 12;
  const padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const max = Math.max(...points.map((p) => p.value), 1);
  const min = Math.min(...points.map((p) => p.value), 0);
  const span = max - min || 1;

  const x = (i: number) =>
    padL + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => padT + innerH - ((v - min) / span) * innerH;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

  // Y 軸目盛（3 本）
  const ticks = [min, min + span / 2, max];
  // X 軸ラベルは最大 6 個に間引き
  const step = Math.max(1, Math.ceil(points.length / 6));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }} role="img">
      {ticks.map((t, i) => {
        const yy = y(t);
        return (
          <g key={i}>
            <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="var(--border-soft)" strokeWidth={1} />
            <text x={padL - 6} y={yy + 3} textAnchor="end" fontSize={10} fill="var(--ink-muted)">
              {Math.round(t).toLocaleString()}
            </text>
          </g>
        );
      })}
      <path d={area} fill={color} opacity={0.12} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) =>
        i % step === 0 || i === points.length - 1 ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize={9} fill="var(--ink-muted)">
            {p.label}
          </text>
        ) : null,
      )}
      {unit ? (
        <text x={padL} y={10} fontSize={9} fill="var(--ink-muted)">
          {unit}
        </text>
      ) : null}
    </svg>
  );
}
