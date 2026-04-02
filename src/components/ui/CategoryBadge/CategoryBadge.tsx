import Link from "next/link";

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
 * - category: メインカテゴリー（"イケオジ" | "シゴデキ"）
 * - subCategory: サブカテゴリー（オプション）
 * 
 * @features
 * - メインカテゴリーのリンク付きバッジ
 * - サブカテゴリーの半透明バッジ（存在する場合）
 * - ホバーエフェクト
 * - シャドウエフェクト
 */
export default function CategoryBadge({ category, subCategory }: CategoryBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/category/${category === "1級土木施工管理技士" ? "civil-construction-manager" : "professional-engineer"}`}
        className="inline-block px-3 py-1 rounded text-sm bg-primary-500/80 text-white hover:bg-primary-600/90 transition-colors shadow-lg"
      >
        {category}
      </Link>
      {subCategory && (
        <span className="text-sm text-white font-medium bg-black/30 px-2 py-1 rounded">
          {subCategory}
        </span>
      )}
    </div>
  );
}
