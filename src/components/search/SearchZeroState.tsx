import Link from "next/link";
// バレル @/components/home を通すと LatestArticles 等まで client バンドルへ入る。実体を直接 import する。
import { ExamCard, type ExamData } from "@/components/home/ExamCards";
import { type CategoryDef } from "@/lib/categories";
import { getCategoryHubPath } from '@/lib/categories';

/**
 * よく読まれている記事の 1 行。href は server（src/app/search/page.tsx）で解決して渡す。
 * ここで @/lib/content-routes の getPublicDocPath を呼ぶと doc-meta-index.json（約 930KB）が
 * /search の client チャンクに同梱される（2026-10-11 実測 1.66MB・DN-0684）。
 */
export interface PopularLink {
  rank: number;
  href: string;
  title: string;
}

interface SearchZeroStateProps {
  examCards: ExamData[];
  otherCategories: CategoryDef[];
  popular: PopularLink[];
}

/**
 * 検索クエリ未入力時のゼロステート。空のプレースホルダ文だけで終わらせず、
 * 「試験から探す」(全資格カテゴリ) と「よく読まれている記事」(GA4 上位) の 2 導線を提示して
 * 検索語を思いつかないユーザーを回遊させる。popular はデータ無しなら graceful 非表示。
 *
 * 「試験から探す」はトップページ（ExamCards）と同じ写真背景カードを流用（DN-0079③・2026-08-28）。
 * 資格に紐づかないカテゴリ（civil-practice 等）は home-exam-cards.json にエントリが無いため
 * 資格カードには出せず、従来どおりシンプルなテキストカードで別枠に残す。
 */
export function SearchZeroState({ examCards, otherCategories, popular }: SearchZeroStateProps) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-serif text-lg font-bold text-(--ink) mb-1">試験から探す</h2>
        <p className="text-sm text-(--ink-muted) mb-4">資格ごとのまとめページへ</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {examCards.map((e) => (
            <ExamCard key={e.slug} e={e} />
          ))}
        </div>
      </section>

      {otherCategories.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-bold text-(--ink) mb-1">その他のカテゴリ</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {otherCategories.map((cat) => (
              <Link
                key={cat.slug}
                href={getCategoryHubPath(cat.slug)}
                className="focus-ring card-surface-content group flex flex-col gap-1 p-4 transition-[border-color,box-shadow] hover:border-(--accent) hover:shadow-soft"
              >
                <span className="font-serif font-bold text-(--ink) group-hover:text-(--accent) transition-colors">
                  {cat.label}
                </span>
                <span className="text-sm text-(--ink-muted) line-clamp-1">{cat.subtitle}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-bold text-(--ink) mb-1">よく読まれている記事</h2>
          <p className="text-sm text-(--ink-muted) mb-4">アクセスの多い記事から</p>
          <ol className="card-surface-content overflow-hidden shadow-none">
            {popular.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="focus-ring group flex gap-3 border-b border-(--rule-soft) px-4 py-3 transition-colors last:border-b-0 hover:bg-(--accent-fill)"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-card-inline bg-(--accent-fill) font-mono text-xs font-bold text-(--accent)">
                    {item.rank}
                  </span>
                  <span className="font-serif text-[14px] font-bold leading-tight text-(--ink) group-hover:text-(--accent) transition-colors line-clamp-2">
                    {item.title}
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
