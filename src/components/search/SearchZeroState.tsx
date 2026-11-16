import LinkRow, { LinkRowList, RankMarker } from '@/components/ui/LinkRow/LinkRow';
import LinkTile from '@/components/ui/LinkTile/LinkTile';
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
              <LinkTile
                key={cat.slug}
                href={getCategoryHubPath(cat.slug)}
                serif
                title={cat.label}
                description={cat.subtitle}
              />
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-bold text-(--ink) mb-1">よく読まれている記事</h2>
          <p className="text-sm text-(--ink-muted) mb-4">アクセスの多い記事から</p>
          <LinkRowList as="ol" className="card-surface-content overflow-hidden px-4 shadow-none">
            {popular.map((item) => (
              <LinkRow key={item.href} href={item.href} title={item.title} marker={<RankMarker rank={item.rank} />} serif tone="ink" />
            ))}
          </LinkRowList>
        </section>
      )}
    </div>
  );
}
