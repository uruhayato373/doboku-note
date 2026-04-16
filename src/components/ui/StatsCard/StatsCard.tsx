/**
 * 統計カード
 * 合格率・受験者数などの統計情報を視覚的に表示。
 * ラベル＋大きな数値＋補足のパターン。
 */

interface StatItem {
  label: string;      // 例: "令和6年度"
  value: string;      // 例: "約13%"
  sub?: string;       // 例: "3,500人中450人"
}

interface StatsCardProps {
  title?: string;
  items: StatItem[];
}

export default function StatsCard({ title, items }: StatsCardProps) {
  return (
    <div className="my-6">
      {title && (
        <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          {title}
        </div>
      )}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-card-content border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center"
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{item.label}</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{item.value}</div>
            {item.sub && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.sub}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
