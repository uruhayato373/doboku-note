/**
 * PDCAサイクル（循環型）SVGコンポーネント
 * Plan → Do → Check → Act → Plan の循環を視覚化。
 * SVGで描画するため、note画像化・iOSアプリ転用も容易。
 */

interface PdcaItem {
  label: string;       // 例: "Plan（計画）"
  description: string; // 例: "BIA、リスクアセスメント、BCP策定"
}

interface PdcaCycleProps {
  items: [PdcaItem, PdcaItem, PdcaItem, PdcaItem];
}

const PHASE_COLORS = [
  { bg: '#3B82F6' }, // Plan: blue
  { bg: '#10B981' }, // Do: emerald
  { bg: '#F59E0B' }, // Check: amber
  { bg: '#EF4444' }, // Act: red
];

const PHASE_LETTERS = ['P', 'D', 'C', 'A'];

export default function PdcaCycle({ items }: PdcaCycleProps) {
  // 円の中心座標（2×2配置）
  const positions = [
    { cx: 90, cy: 90 },   // P: 左上
    { cx: 230, cy: 90 },  // D: 右上
    { cx: 230, cy: 230 }, // C: 右下
    { cx: 90, cy: 230 },  // A: 左下
  ];
  const r = 50;

  return (
    <div className="my-6">
      {/* SVG サイクル図 */}
      <div className="flex justify-center mb-6">
        <svg
          viewBox="0 0 320 320"
          className="w-full max-w-[320px] h-auto"
          role="img"
          aria-label="PDCAサイクル図"
        >
          {/* 矢印マーカー定義 */}
          <defs>
            <marker
              id="pdca-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#6B7280" />
            </marker>
          </defs>

          {/* 循環矢印（直線・時計回り） */}
          {/* P → D: 上辺（右向き） */}
          <line
            x1={positions[0]!.cx + r + 5}
            y1={positions[0]!.cy}
            x2={positions[1]!.cx - r - 5}
            y2={positions[1]!.cy}
            stroke="#6B7280"
            strokeWidth="3"
            strokeLinecap="round"
            markerEnd="url(#pdca-arrow)"
          />
          {/* D → C: 右辺（下向き） */}
          <line
            x1={positions[1]!.cx}
            y1={positions[1]!.cy + r + 5}
            x2={positions[2]!.cx}
            y2={positions[2]!.cy - r - 5}
            stroke="#6B7280"
            strokeWidth="3"
            strokeLinecap="round"
            markerEnd="url(#pdca-arrow)"
          />
          {/* C → A: 下辺（左向き） */}
          <line
            x1={positions[2]!.cx - r - 5}
            y1={positions[2]!.cy}
            x2={positions[3]!.cx + r + 5}
            y2={positions[3]!.cy}
            stroke="#6B7280"
            strokeWidth="3"
            strokeLinecap="round"
            markerEnd="url(#pdca-arrow)"
          />
          {/* A → P: 左辺（上向き） */}
          <line
            x1={positions[3]!.cx}
            y1={positions[3]!.cy - r - 5}
            x2={positions[0]!.cx}
            y2={positions[0]!.cy + r + 5}
            stroke="#6B7280"
            strokeWidth="3"
            strokeLinecap="round"
            markerEnd="url(#pdca-arrow)"
          />

          {/* 4つの円（矢印の上に描画） */}
          {positions.map((pos, idx) => {
            const color = PHASE_COLORS[idx]!;
            return (
              <g key={idx}>
                <circle cx={pos.cx} cy={pos.cy} r={r} fill={color.bg} />
                <text
                  x={pos.cx}
                  y={pos.cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize="48"
                  fontWeight="700"
                >
                  {PHASE_LETTERS[idx]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 各フェーズの説明（アクセシビリティ + 詳細表示） */}
      <div className="space-y-2">
        {items.map((item, i) => {
          const color = PHASE_COLORS[i]!;
          return (
            <div
              key={i}
              className="card-surface-content flex items-start gap-3 p-3"
            >
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: color.bg }}
              >
                {PHASE_LETTERS[i]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-[var(--ink)]">
                  {item.label}
                </div>
                <div className="text-sm text-[var(--ink-body)] mt-0.5">
                  {item.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
