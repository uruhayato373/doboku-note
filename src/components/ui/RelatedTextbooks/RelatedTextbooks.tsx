/**
 * 関連テキスト（Civil第1次/第2次検定問題用）
 *
 * 順位づけ（過去問→教材インデックス優先・0 件ならタグの共通数）は src/lib/related-textbooks.ts に集約している
 * （右の欄の rail-textbooks と共有）。ここは並んだ章に記事の title・description を添えて描画するだけ。
 */
import ArticleThumbRow from '@/components/ui/RelatedArticles/ArticleThumbRow';
import { getCardImage } from '@/lib/site-thumbnail';
import { getPublicDocPath } from '@/lib/content-routes';
import type { DocMeta } from '@/lib/docs';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { relatedTextbooks } from '@/lib/related-textbooks';

interface RelatedTextbooksProps {
  currentMeta: DocMeta;
  categoryArticles: DocMeta[];
}

export default function RelatedTextbooks({ currentMeta, categoryArticles }: RelatedTextbooksProps) {
  const bySlug = new Map(categoryArticles.map((m) => [m.slug, m]));
  const entries = relatedTextbooks(currentMeta, categoryArticles).map((item) => {
    const meta = bySlug.get(item.slug);
    return { slug: item.slug, title: meta?.title || item.title, description: meta?.description, category: meta?.category ?? currentMeta.category };
  });

  if (entries.length === 0) return null;

  return (
    <MetaCard trackNav="related-textbooks" title="この試験で扱われた教材" lead={`問題の分野に関連する教科書の章 (${entries.length} 件)`}>
      <ul className="space-y-2">
        {entries.map((doc) => (
          <li key={doc.slug}>
            <ArticleThumbRow href={getPublicDocPath(doc.slug)} title={doc.title} caption={doc.description} image={getCardImage(doc.category ? { slug: doc.slug, category: doc.category } : { slug: doc.slug })} />
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
