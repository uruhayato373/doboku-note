/**
 * RelatedArticles — 記事末（AuthorCard の前）に固定配置する汎用「関連記事」セクション。
 *
 * 旧来 MDX 内に直書きされていた `## 関連記事` / `## 関連コンテンツ`（記事ごとにレイアウトが
 * バラバラ）をコンポーネント化して全資格・全記事種別で統一する。frontmatter の category +
 * tags から同カテゴリ近傍ページを **トピックタグの共通数** でランクして自動生成する。
 *
 * 自己抑制: 関連が 2 件未満なら何も描画しない（タグが薄い過去問ページ等で薄いセクションや
 * 既存の RelatedTextbooks / RelatedKeywords との重複を避ける）。
 */
import Link from 'next/link';
import type { DocMeta } from '@/lib/docs';
import MetaCard from '@/components/ui/MetaCard/MetaCard';

interface RelatedArticlesProps {
  currentMeta: DocMeta;
  categoryArticles: DocMeta[];
}

/** 構造タグ（記事種別）はトピック関連度の判定から除外する。 */
const STRUCTURAL_TAGS = new Set([
  'guide',
  'primary',
  'secondary',
  'textbook',
  'keyword',
  'pillar',
  'essay',
  'past-questions',
  'pastExam',
]);

function topicalTags(meta: DocMeta): string[] {
  return (meta.tags || []).filter((t) => !STRUCTURAL_TAGS.has(t));
}

export default function RelatedArticles({ currentMeta, categoryArticles }: RelatedArticlesProps) {
  const currentTags = new Set(topicalTags(currentMeta));
  if (currentTags.size === 0) return null;

  const related = categoryArticles
    .filter((m) => m.slug !== currentMeta.slug && m.published !== false)
    .map((m) => {
      const common = topicalTags(m).filter((t) => currentTags.has(t)).length;
      return { doc: m, score: common };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // 同スコアは新しい記事を優先
      const da = String(a.doc.date ?? '');
      const db = String(b.doc.date ?? '');
      return db.localeCompare(da);
    })
    .slice(0, 6)
    .map((s) => s.doc);

  if (related.length < 2) return null;

  return (
    <MetaCard trackNav="related-articles">
      <h2 className="mb-1 text-lg font-bold text-[var(--ink)]">関連記事</h2>
      <p className="mb-4 text-sm text-[var(--ink-muted)]">
        同じテーマの記事 ({related.length} 件)
      </p>
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {related.map((doc) => (
          <li key={doc.slug}>
            <Link
              href={`/docs/${doc.slug}`}
              className="block h-full rounded-sm border border-[var(--rule-soft)] px-4 py-3 transition-colors hover:border-brand dark:hover:border-brand"
            >
              <div className="text-sm font-semibold text-brand">{doc.title}</div>
              {doc.description && (
                <div className="mt-1 line-clamp-2 text-xs text-[var(--ink-body)]">
                  {doc.description}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
