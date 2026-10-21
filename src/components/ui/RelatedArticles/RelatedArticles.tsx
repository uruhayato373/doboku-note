/**
 * RelatedArticles — 記事末（AuthorCard の前）に固定配置する汎用「関連記事」セクション。
 *
 * 旧来 MDX 内に直書きされていた `## 関連記事` / `## 関連コンテンツ`（記事ごとにレイアウトが
 * バラバラ）をコンポーネント化して全資格・全記事種別で統一する。frontmatter の category +
 * tags から同カテゴリ近傍ページを **トピックタグの共通数** でランクして自動生成する
 * 資格・実務を横断して共通タグとテーマを評価する（ランク算法は rankRelated に集約し
 * MidArticleCta と共有）。同資格は小さく加点し、6 件のうち 4 件までにする（content-taxonomy.md §6-3）。
 *
 * 2026-07: テキストリンクから OGP サムネイル カードグリッドへ刷新（クリック誘発）。
 * 自己抑制: 関連が 2 件未満なら何も描画しない（タグが薄い過去問ページ等で薄いセクションや
 * 既存の RelatedTextbooks / RelatedKeywords との重複を避ける）。
 */
import type { DocMeta } from '@/lib/docs';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import RelatedArticleCard from './RelatedArticleCard';
import { rankRelated } from '@/lib/related-score';

interface RelatedArticlesProps {
  currentMeta: DocMeta;
  categoryArticles: DocMeta[];
  /** 記事末の先のカード（根拠法令・この記事のテーマ）で出した記事。同じ記事を 2 度並べない */
  exclude?: ReadonlySet<string>;
}

export default function RelatedArticles({ currentMeta, categoryArticles, exclude }: RelatedArticlesProps) {
  const related = rankRelated(currentMeta, categoryArticles, 6, exclude);
  if (related.length < 2) return null;

  return (
    <MetaCard trackNav="related-articles">
      <h2 className="mb-1 text-lg font-bold text-(--ink)">関連記事</h2>
      <p className="mb-4 text-sm text-(--ink-muted)">
        同じテーマの記事 ({related.length} 件)
      </p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 zenn-desktop:grid-cols-3">
        {related.map((doc) => (
          <li key={doc.slug}>
            <RelatedArticleCard doc={doc} />
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
