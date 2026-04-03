import Link from "next/link";
import { getCategoryLabel } from "@/lib/categories";

interface CategoryBadgeProps {
  category: string;
  subCategory?: string;
}

/**
 * @description
 * ブログ記事のカテゴリーバッジコンポーネント
 *
 * @component
 *
 * @props
 * - category: メインカテゴリーslug（e.g., "civil-construction-1", "pe-comprehensive-management"）
 * - subCategory: サブカテゴリー（オプション）
 *
 * @features
 * - メインカテゴリーのリンク付きバッジ
 * - サブカテゴリーの半透明バッジ（存在する場合）
 * - ホバーエフェクト
 * - シャドウエフェクト
 */
export default function CategoryBadge({ category, subCategory }: CategoryBadgeProps) {
  const categoryLabel = getCategoryLabel(category);

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/category/${category}`}
        className="inline-block px-3 py-1 rounded text-sm bg-primary-500/80 text-white hover:bg-primary-600/90 transition-colors shadow-lg"
      >
        {categoryLabel}
      </Link>
      {subCategory && (
        <span className="text-sm text-white font-medium bg-black/30 px-2 py-1 rounded">
          {subCategory}
        </span>
      )}
    </div>
  );
}
