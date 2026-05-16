/**
 * 過去問逆引きリンク
 *
 * 2 つのデータソースを統合:
 *   1. pe-comprehensive-management (PE 総監): past-exam-backlinks.json (キーワード→過去問)
 *   2. civil-construction-1: civil-exam-textbook-index.json の textbookToQuestions (教材→過去問)
 *
 * 更新は `npm run build-backlinks` (PE) と
 * `node .claude/scripts/build-civil-exam-textbook-index.mjs` (Civil) で再生成。
 */
import Link from 'next/link';
import backlinksData from '@/config/past-exam-backlinks.json';
import civilExamTextbookIndex from '@/config/civil-exam-textbook-index.json';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import MetaListItem from '@/components/ui/MetaListItem/MetaListItem';

interface PastExamBacklinksProps {
  category: string;
  currentSlug: string;
}

interface BacklinkEntry {
  examSlug: string;
  year: string;
  question: string;
  anchor: string;
}

interface CivilBacklinkEntry {
  examSlug: string;
  examTitle: string;
  section: string;
  score: number;
}

interface CivilIndexShape {
  textbookToQuestions: Record<string, CivilBacklinkEntry[]>;
}

const CIVIL_INDEX = civilExamTextbookIndex as unknown as CivilIndexShape;
const SHORT_SLUG_PREFIX = 'civil-construction-1-';

export default function PastExamBacklinks({ category, currentSlug }: PastExamBacklinksProps) {
  // === Civil: textbook → 過去問 の逆引き ===
  if (category === 'civil-construction-1') {
    const shortSlug = currentSlug.startsWith(SHORT_SLUG_PREFIX)
      ? currentSlug.slice(SHORT_SLUG_PREFIX.length)
      : currentSlug;
    const civilEntries = CIVIL_INDEX.textbookToQuestions?.[shortSlug];
    if (!civilEntries || civilEntries.length === 0) return null;

    return (
      <MetaCard ariaLabel="過去問での出題">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
          過去問での出題
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          この教材の分野が登場した 1 級土木の過去問 ({civilEntries.length} 件)
        </p>
        <ul className="space-y-2">
          {civilEntries.map((b, i) => (
            <li key={`${b.examSlug}-${b.section}-${i}`}>
              <Link
                href={`/docs/${SHORT_SLUG_PREFIX}${b.examSlug}`}
                className="block group"
              >
                <MetaListItem
                  title={
                    <>
                      {b.examTitle}{' '}
                      <span className="text-gray-700 dark:text-gray-300">{b.section}</span>
                    </>
                  }
                />
              </Link>
            </li>
          ))}
        </ul>
      </MetaCard>
    );
  }

  // === PE 総監: キーワード → 過去問 の逆引き（既存） ===
  const prefix = category + '-';
  const shortSlug = currentSlug.startsWith(prefix) ? currentSlug.slice(prefix.length) : currentSlug;

  const backlinks = (backlinksData as Record<string, BacklinkEntry[]>)[shortSlug];
  if (!backlinks || backlinks.length === 0) return null;

  return (
    <MetaCard ariaLabel="過去問での出題">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        過去問での出題
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        このキーワードが登場した過去問の設問
      </p>
      <ul className="space-y-2">
        {backlinks.map((b, i) => (
          <li key={`${b.examSlug}-${b.anchor}-${i}`}>
            <Link href={`/docs/${b.examSlug}#${b.anchor}`} className="block group">
              <MetaListItem
                title={
                  <>
                    {b.year}{' '}
                    <span className="text-gray-700 dark:text-gray-300">{b.question}</span>
                  </>
                }
              />
            </Link>
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}
