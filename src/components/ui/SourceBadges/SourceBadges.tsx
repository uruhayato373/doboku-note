/**
 * SourceBadges — 本文中の補助メタデータ（関連白書・関連法令など）を
 * 軽量チップ列で表示するインライン MDX コンポーネント。
 *
 * 用途想定:
 * - hub ページの各テーマセクションで「関連白書」を縦スキャンしやすく列挙
 * - <SeeAlso> / <SpokeNavCard> ほどの導線重みは不要だが、本文太字より視認性を上げたい場面
 *
 * リンク挙動:
 * - items の各文字列が `src/lib/whitepapers.ts` の registry に存在する場合は <a> 化（新規タブ、政府公式 URL）
 * - 存在しない場合は <span> でフォールバック表示（既存挙動）
 *
 * 1 ページに 9 セクション × 3-4 項目が並んでも視覚的に重くならない構造
 * （Callout を 9 回繰り返すとページが重くなるため、その代替として導入）。
 */
import { getWhitepaper } from "@/lib/whitepapers";

interface SourceBadgesProps {
  readonly label?: string;
  readonly items: readonly string[];
}

const BASE_CLASS =
  "font-mono text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap text-brand-deep dark:text-brand bg-brand-fill dark:bg-brand-fill/30";

const LINK_EXTRA_CLASS =
  "hover:bg-brand-fill/70 dark:hover:bg-brand-fill/50 transition-colors underline decoration-dotted underline-offset-2";

export default function SourceBadges({ label = "関連白書", items }: SourceBadgesProps) {
  if (!items || items.length === 0) return null;
  return (
    <div className="not-prose my-4 flex items-baseline gap-2 flex-wrap">
      <span className="text-[11px] font-bold tracking-wider text-ink-muted uppercase shrink-0">
        {label}
      </span>
      <div className="flex gap-1.5 flex-wrap">
        {items.map((item) => {
          const wp = getWhitepaper(item);
          if (wp) {
            return (
              <a
                key={item}
                href={wp.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${BASE_CLASS} ${LINK_EXTRA_CLASS}`}
                aria-label={`${item}（${wp.ministry}、新規タブで開く）`}
              >
                {item}
              </a>
            );
          }
          return (
            <span key={item} className={BASE_CLASS}>
              {item}
            </span>
          );
        })}
      </div>
    </div>
  );
}
