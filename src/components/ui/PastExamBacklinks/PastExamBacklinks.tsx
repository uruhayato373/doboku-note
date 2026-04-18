/**
 * 過去問逆引きリンク（キーワードページ用）
 * 事前生成された `src/config/past-exam-backlinks.json` を参照する。
 * 更新は `npm run build-backlinks` で再生成。
 */
import Link from 'next/link';
import backlinksData from '@/config/past-exam-backlinks.json';

interface PastExamBacklinksProps {
  category: string;
  currentSlug: string; // フル slug: 'pe-comprehensive-management-business-continuity-plan'
}

interface BacklinkEntry {
  examSlug: string;
  year: string;
  question: string;
  anchor: string;
}

export default function PastExamBacklinks({ category, currentSlug }: PastExamBacklinksProps) {
  // カテゴリ prefix を除去してキーを取得
  const prefix = category + '-';
  const shortSlug = currentSlug.startsWith(prefix) ? currentSlug.slice(prefix.length) : currentSlug;

  const backlinks = (backlinksData as Record<string, BacklinkEntry[]>)[shortSlug];
  if (!backlinks || backlinks.length === 0) return null;

  return (
    <section aria-label="過去問での出題" className="bg-white dark:bg-gray-800 rounded-card-section shadow-card-section border border-gray-200/60 dark:border-gray-700/60 p-6 sm:p-8">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        過去問での出題
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        このキーワードが登場した過去問の設問
      </p>
      <ul className="space-y-2">
        {backlinks.map((b, i) => (
          <li key={`${b.examSlug}-${b.anchor}-${i}`}>
            <Link
              href={`/docs/${b.examSlug}#${b.anchor}`}
              className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
            >
              <span className="text-gray-500 dark:text-gray-400">→</span>
              <span>
                {b.year} <span className="text-gray-700 dark:text-gray-300">{b.question}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
