/**
 * SourceBadges — 本文中の補助メタデータ（関連白書・関連法令など）を
 * 軽量チップ列で表示するインライン MDX コンポーネント。
 *
 * 用途想定:
 * - hub ページの各テーマセクションで「関連白書」を縦スキャンしやすく列挙
 * - <SeeAlso> / <SpokeNavCard> ほどの導線重みは不要だが、本文太字より視認性を上げたい場面
 *
 * 1 ページに 9 セクション × 3-4 項目が並んでも視覚的に重くならない構造
 * （Callout を 9 回繰り返すとページが重くなるため、その代替として導入）。
 */
interface SourceBadgesProps {
  readonly label?: string;
  readonly items: readonly string[];
}

export default function SourceBadges({ label = "関連白書", items }: SourceBadgesProps) {
  if (!items || items.length === 0) return null;
  return (
    <div className="not-prose my-4 flex items-baseline gap-2 flex-wrap">
      <span className="text-[11px] font-bold tracking-wider text-ink-muted dark:text-gray-400 uppercase shrink-0">
        {label}
      </span>
      <div className="flex gap-1.5 flex-wrap">
        {items.map((item) => (
          <span
            key={item}
            className="font-mono text-[11px] text-brand-deep dark:text-brand bg-brand-fill dark:bg-brand-fill/30 px-2.5 py-0.5 rounded-full whitespace-nowrap"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
