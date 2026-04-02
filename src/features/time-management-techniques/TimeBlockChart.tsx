const BLOCKS = [
  { start: '8:30', end: '10:00', label: '集中作業タイム', sub: '政策立案・予算分析・報告書作成', color: '#3B82F6', minutes: 90 },
  { start: '10:00', end: '12:00', label: '会議・打ち合わせ', sub: '会議を午前中に集約（25分 or 50分）', color: '#10B981', minutes: 120 },
  { start: '12:00', end: '13:00', label: '昼休み', sub: '', color: '#E5E7EB', minutes: 60 },
  { start: '13:00', end: '14:30', label: 'ルーチンワーク', sub: 'メール返信・定型業務・書類整理', color: '#F59E0B', minutes: 90 },
  { start: '14:30', end: '15:00', label: 'バッファタイム', sub: '午前の積み残し・突発対応', color: '#F97316', minutes: 30 },
  { start: '15:00', end: '17:00', label: 'プロジェクト作業', sub: '長期案件・他部署調整・交渉準備', color: '#8B5CF6', minutes: 120 },
  { start: '17:00', end: '17:15', label: '終業準備', sub: '翌日のタスク整理・デスク清掃', color: '#6B7280', minutes: 15 },
];

const TOTAL_MINUTES = BLOCKS.reduce((sum, b) => sum + b.minutes, 0);

export default function TimeBlockChart() {
  const barY = 60;
  const barHeight = 48;
  const chartWidth = 720;
  const chartPadding = 24;
  const barWidth = chartWidth - chartPadding * 2;

  let offsetX = chartPadding;

  return (
    <div className="max-w-4xl mx-auto my-6">
      <svg
        viewBox={`0 0 ${chartWidth} 260`}
        role="img"
        aria-label="1日の時間ブロック設計：8:30〜17:15の業務時間を6つのブロックに分割したスケジュール図"
        className="w-full h-auto"
      >
        <title>1日の時間ブロック設計</title>
        <desc>
          8:30-10:00 集中作業タイム、10:00-12:00 会議・打ち合わせ、12:00-13:00 昼休み、
          13:00-14:30 ルーチンワーク、14:30-15:00 バッファタイム、15:00-17:00 プロジェクト作業、
          17:00-17:15 終業準備
        </desc>

        {/* タイトル */}
        <text x={chartWidth / 2} y={32} textAnchor="middle" className="fill-gray-800 dark:fill-gray-200" fontSize="18" fontWeight="bold">
          1日の時間ブロック設計
        </text>

        {/* ブロックバー */}
        {BLOCKS.map((block, i) => {
          const w = (block.minutes / TOTAL_MINUTES) * barWidth;
          const x = offsetX;
          offsetX += w;
          const isLunch = block.label === '昼休み';
          const isNarrow = w < 60;

          return (
            <g key={i}>
              <rect
                x={x}
                y={barY}
                width={w}
                height={barHeight}
                rx={i === 0 ? 6 : 0}
                ry={i === 0 ? 6 : 0}
                fill={block.color}
                opacity={isLunch ? 0.4 : 0.85}
                stroke="white"
                strokeWidth={1}
              />
              {/* 時刻ラベル（上） */}
              <text x={x + 2} y={barY - 6} fontSize="10" className="fill-gray-500 dark:fill-gray-400">
                {block.start}
              </text>
              {/* ブロック内ラベル */}
              {!isNarrow && (
                <text
                  x={x + w / 2}
                  y={barY + barHeight / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={isLunch ? 11 : 12}
                  fontWeight={isLunch ? 'normal' : 'bold'}
                  fill="white"
                >
                  {block.label}
                </text>
              )}
            </g>
          );
        })}
        {/* 最後の終了時刻 */}
        <text x={chartPadding + barWidth - 2} y={barY - 6} fontSize="10" textAnchor="end" className="fill-gray-500 dark:fill-gray-400">
          17:15
        </text>

        {/* 凡例 */}
        {(() => {
          const legendItems = BLOCKS.filter(b => b.label !== '昼休み');
          const legendY = barY + barHeight + 32;
          const colWidth = barWidth / 2;
          return legendItems.map((block, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const lx = chartPadding + col * colWidth;
            const ly = legendY + row * 42;
            return (
              <g key={`legend-${i}`}>
                <rect x={lx} y={ly} width={14} height={14} rx={3} fill={block.color} opacity={0.85} />
                <text x={lx + 20} y={ly + 11} fontSize="12" fontWeight="bold" className="fill-gray-800 dark:fill-gray-200">
                  {block.start}-{block.end} {block.label}
                </text>
                {block.sub && (
                  <text x={lx + 20} y={ly + 27} fontSize="10" className="fill-gray-500 dark:fill-gray-400">
                    {block.sub}
                  </text>
                )}
              </g>
            );
          });
        })()}
      </svg>
    </div>
  );
}
