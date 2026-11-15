/**
 * 関連テキスト（Civil第1次/第2次検定問題用）
 *
 * 順位づけ（過去問→教材インデックス優先・0 件ならタグの共通数）は src/lib/related-textbooks.ts に集約している
 * （右の欄の rail-textbooks と共有）。ここは並んだ章に記事の title・description を添えて描画するだけ。
 */
import Link from 'next/link';
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
    return { slug: item.slug, title: meta?.title || item.title, description: meta?.description };
  });

  if (entries.length === 0) return null;

  return (
    <MetaCard trackNav="related-textbooks">
      <h2 className="text-lg font-bold text-(--ink) mb-1">
        この試験で扱われた教材
      </h2>
      <p className="text-sm text-(--ink-muted) mb-4">
        問題の分野に関連する教科書の章 ({entries.length} 件)
      </p>
      <ul className="space-y-2">
        {entries.map((doc) => (
          <li key={doc.slug}>
            <Link
              href={getPublicDocPath(doc.slug)}
              className="block rounded-card-content border border-(--rule-soft) px-4 py-3 transition-colors hover:border-(--accent)"
            >
              <div className="text-sm font-semibold text-(--accent)">{doc.title}</div>
              {doc.description && (
                <div className="text-xs text-(--ink-body) mt-1 line-clamp-2">{doc.description}</div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
