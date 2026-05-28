import Link from "next/link";
import Callout from "../Callout/Callout";

interface KeywordItem {
  label: string;
  slug?: string;
}

interface RelatedKeywordsProps {
  items: KeywordItem[];
}

const KNOWN_CATEGORY_PREFIXES = [
  "pe-comprehensive-management-",
  "civil-construction-1-",
  "civil-construction-2-",
];

function buildHref(slug: string): string {
  if (KNOWN_CATEGORY_PREFIXES.some((p) => slug.startsWith(p))) {
    return `/docs/${slug}`;
  }
  return `/docs/pe-comprehensive-management-${slug}`;
}

/**
 * RelatedKeywords — 関連キーワード誘導ボックス。
 *
 * 2026-04-24 から <Callout type="reference" title="関連キーワード"> のラッパーとして再実装
 * （コンポーネント統一）。左アクセント・円形 Link2 アイコン・slate トーンで参考文献誘導として
 * 視覚的に整理。旧実装のハードコード色とモバイル余白を廃止。
 *
 * API（items: { label, slug? }[]）は 666 MDX 呼び出しと完全互換。
 * slug が既知のカテゴリ接頭辞（pe-comprehensive-management- / civil-construction-1- /
 * civil-construction-2-）で始まる場合はそのまま /docs/{slug} を生成、それ以外は
 * legacy bare slug として pe-comprehensive-management- を補完する（後方互換）。
 */
export default function RelatedKeywords({ items }: RelatedKeywordsProps) {
  if (!items || items.length === 0) return null;

  return (
    <Callout type="reference" title="関連キーワード">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          if (item.slug) {
            return (
              <span key={index} className="inline-flex items-center">
                <Link
                  href={buildHref(item.slug)}
                  className="text-sm text-blue-700 dark:text-blue-400 hover:underline"
                >
                  {item.label}
                </Link>
                {!isLast && (
                  <span className="text-gray-400 dark:text-gray-500 ml-1">|</span>
                )}
              </span>
            );
          }
          return (
            <span key={index} className="inline-flex items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {item.label}
              </span>
              {!isLast && (
                <span className="text-gray-300 dark:text-gray-600 ml-1">|</span>
              )}
            </span>
          );
        })}
      </div>
    </Callout>
  );
}
