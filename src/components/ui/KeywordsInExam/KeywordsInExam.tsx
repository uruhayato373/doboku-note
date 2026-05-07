/**
 * 過去問で扱われたキーワード一覧
 * 事前生成された `src/config/exam-question-keywords.json` を参照する。
 * 更新は `npm run build-backlinks` で再生成。
 */
import Link from 'next/link';
import type { DocMeta } from '@/lib/docs';
import questionKeywordsData from '@/config/exam-question-keywords.json';
import MetaCard from '@/components/ui/MetaCard/MetaCard';

interface KeywordsInExamProps {
  currentSlug: string;
  categoryArticles: DocMeta[];
  category: string;
}

interface QuestionData {
  heading: string;
  slugs: string[];
}

export default function KeywordsInExam({ currentSlug, categoryArticles, category }: KeywordsInExamProps) {
  const examData = (questionKeywordsData as Record<string, Record<string, QuestionData>>)[currentSlug];
  if (!examData) return null;

  // 全設問からユニークなslugを集約
  const allSlugs = new Set<string>();
  for (const q of Object.values(examData)) {
    for (const s of q.slugs) allSlugs.add(s);
  }
  if (allSlugs.size === 0) return null;

  // slug → title のマップを作成（カテゴリの全ドキュメントから）
  const prefix = category + '-';
  const slugToTitle = new Map<string, string>();
  for (const doc of categoryArticles) {
    if (doc.slug && doc.slug.startsWith(prefix)) {
      slugToTitle.set(doc.slug.slice(prefix.length), doc.title);
    }
  }

  // 存在するキーワードだけを残し、titleでソート
  const sorted = Array.from(allSlugs)
    .filter((s) => slugToTitle.has(s))
    .map((s) => ({ shortSlug: s, title: slugToTitle.get(s)! }))
    .sort((a, b) => a.title.localeCompare(b.title, 'ja'));

  if (sorted.length === 0) return null;

  return (
    <MetaCard>
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        この試験で扱われたキーワード
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {sorted.length} 件のキーワードページへリンク
      </p>
      <div className="flex flex-wrap gap-2">
        {sorted.map((kw) => (
          <Link
            key={kw.shortSlug}
            href={`/docs/${prefix}${kw.shortSlug}`}
            className="text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {kw.title}
          </Link>
        ))}
      </div>
    </MetaCard>
  );
}
