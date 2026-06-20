/**
 * 教科書の前後章ナビゲーション
 * textbook_order でソートし、現在ページの前後を表示。
 */
import Link from 'next/link';
import type { DocMeta } from '@/lib/docs';
import { classifyDoc } from '@/lib/doc-classifier';
import MetaCard from '@/components/ui/MetaCard/MetaCard';

interface TextbookNavProps {
  currentSlug: string;
  categoryArticles: DocMeta[];
}

export default function TextbookNav({ currentSlug, categoryArticles }: TextbookNavProps) {
  const textbooks = categoryArticles
    .filter((m) => classifyDoc(m) === 'textbook')
    .sort((a, b) => (a.textbook_order ?? 999) - (b.textbook_order ?? 999));

  const idx = textbooks.findIndex((m) => m.slug === currentSlug);
  if (idx === -1) return null;

  const prev = idx > 0 ? textbooks[idx - 1] : null;
  const next = idx < textbooks.length - 1 ? textbooks[idx + 1] : null;

  if (!prev && !next) return null;

  return (
    <MetaCard>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        テキスト章ナビゲーション
      </h2>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/docs/${prev.slug}`}
            className="block rounded-sm border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">← 前の章</div>
            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">{prev.title}</div>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/docs/${next.slug}`}
            className="block rounded-sm border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-right"
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">次の章 →</div>
            <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">{next.title}</div>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </MetaCard>
  );
}
