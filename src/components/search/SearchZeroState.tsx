import Link from "next/link";
import { type CategoryDef } from "@/lib/categories";
import { type PopularDoc } from "@/lib/popular";

interface SearchZeroStateProps {
  categories: CategoryDef[];
  popular: PopularDoc[];
}

/**
 * 検索クエリ未入力時のゼロステート。空のプレースホルダ文だけで終わらせず、
 * 「試験から探す」(全資格カテゴリ) と「よく読まれている記事」(GA4 上位) の 2 導線を提示して
 * 検索語を思いつかないユーザーを回遊させる。popular はデータ無しなら graceful 非表示。
 */
export function SearchZeroState({ categories, popular }: SearchZeroStateProps) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-serif text-lg font-bold text-[var(--ink)] mb-1">試験から探す</h2>
        <p className="text-sm text-[var(--ink-muted)] mb-4">資格ごとのまとめページへ</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="focus-ring card-surface-content group flex flex-col gap-1 p-4 transition-[border-color,box-shadow] hover:border-[var(--accent)] hover:shadow-soft"
            >
              <span className="font-serif font-bold text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                {cat.label}
              </span>
              <span className="text-sm text-[var(--ink-muted)] line-clamp-1">{cat.subtitle}</span>
            </Link>
          ))}
        </div>
      </section>

      {popular.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-bold text-[var(--ink)] mb-1">よく読まれている記事</h2>
          <p className="text-sm text-[var(--ink-muted)] mb-4">アクセスの多い記事から</p>
          <ol className="card-surface-content overflow-hidden shadow-none">
            {popular.map((item) => (
              <li key={item.doc.slug}>
                <Link
                  href={`/docs/${item.doc.slug}`}
                  className="focus-ring group flex gap-3 border-b border-[var(--rule-soft)] px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--accent-fill)]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-card-inline bg-[var(--accent-fill)] font-mono text-xs font-bold text-[var(--accent)]">
                    {item.rank}
                  </span>
                  <span className="font-serif text-[14px] font-bold leading-tight text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
                    {item.doc.shortTitle || item.doc.title}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
