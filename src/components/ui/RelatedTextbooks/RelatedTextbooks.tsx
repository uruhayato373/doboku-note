/**
 * 関連テキスト（Civil第1次検定問題用）
 * 過去問のタグから関連する教科書章を抽出して表示。
 */
import Link from 'next/link';
import type { DocMeta } from '@/lib/docs';
import { classifyDoc } from '@/lib/doc-classifier';

interface RelatedTextbooksProps {
  currentMeta: DocMeta;
  categoryArticles: DocMeta[];
}

export default function RelatedTextbooks({ currentMeta, categoryArticles }: RelatedTextbooksProps) {
  const currentTags = new Set((currentMeta.tags || []).filter((t) => t !== 'primary' && t !== 'secondary' && t !== 'past-questions'));
  if (currentTags.size === 0) return null;

  const textbooks = categoryArticles.filter((m) => classifyDoc(m) === 'textbook');

  // タグ共通数でランキング
  const scored = textbooks
    .map((tb) => {
      const tbTags = (tb.tags || []).filter((t) => t !== 'textbook');
      const commonCount = tbTags.filter((t) => currentTags.has(t)).length;
      return { doc: tb, score: commonCount };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (scored.length === 0) return null;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-card-section shadow-card-section border border-gray-200/60 dark:border-gray-700/60 p-6 sm:p-8">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        関連するテキスト章
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        問題の分野に関連する教科書の章
      </p>
      <ul className="space-y-2">
        {scored.map(({ doc }) => (
          <li key={doc.slug}>
            <Link
              href={`/docs/${doc.slug}`}
              className="block rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
            >
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">{doc.title}</div>
              {doc.description && (
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{doc.description}</div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
