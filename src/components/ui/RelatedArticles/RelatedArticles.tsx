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
 *
 * 2026-11-26: 写真の大きいカード（スマホで 6 枚 約 1,800px）から、左に小さい写真の行（ArticleThumbRow）へ。
 * 記事末の回遊がスマホで本文の半分の長さになり、次の 1 本が目に入らなかった。次のステップ・前後の記事と同じ形にそろえる。
 */
import type { DocMeta } from '@/lib/docs';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import ArticleThumbRow from '@/components/ui/ArticleThumbRow/ArticleThumbRow';
import { articleCardProps } from '@/lib/article-card';
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
    <MetaCard trackNav="related-articles" title="関連記事" lead={`同じテーマの記事 (${related.length} 件)`}>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {related.map((doc) => {
          const card = articleCardProps(doc);
          return (
            <li key={doc.slug}>
              <ArticleThumbRow href={card.href} title={doc.shortTitle ?? card.title} caption={card.description} image={card.image} />
            </li>
          );
        })}
      </ul>
    </MetaCard>
  );
}
