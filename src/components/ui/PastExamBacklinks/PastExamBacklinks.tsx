/**
 * 過去問逆引きリンク
 *
 * 3 つのデータソースを統合:
 *   1. pe-comprehensive-management (PE 総監): past-exam-backlinks.json (キーワード→過去問)
 *   2. civil-construction-1: civil-exam-textbook-index.json の textbookToQuestions (教材→過去問)
 *   3. civil-construction-2: civil-exam-textbook-index-2.json の textbookToQuestions (2級用、Phase 1 投入後)
 *
 * 更新は `npm run build-backlinks` (PE) と
 * `node .claude/scripts/build-civil-exam-textbook-index.mjs` (Civil 1級/2級両方) で再生成。
 */
import Link from 'next/link';
import backlinksData from '@/config/past-exam-backlinks.json';
import civilExamTextbookIndex from '@/config/civil-exam-textbook-index.json';
import civilExamTextbookIndex2 from '@/config/civil-exam-textbook-index-2.json';
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

const CIVIL_INDEX_1 = civilExamTextbookIndex as unknown as CivilIndexShape;
const CIVIL_INDEX_2 = civilExamTextbookIndex2 as unknown as CivilIndexShape;

const CIVIL_CONFIGS: Record<string, { index: CivilIndexShape; prefix: string; label: string }> = {
  'civil-construction-1': { index: CIVIL_INDEX_1, prefix: 'civil-construction-1-', label: '1 級土木' },
  'civil-construction-2': { index: CIVIL_INDEX_2, prefix: 'civil-construction-2-', label: '2 級土木' },
};

export default function PastExamBacklinks({ category, currentSlug }: PastExamBacklinksProps) {
  // === Civil: textbook → 過去問 の逆引き（1級・2級共通ロジック） ===
  const civilConfig = CIVIL_CONFIGS[category];
  if (civilConfig) {
    const { index, prefix, label } = civilConfig;
    const shortSlug = currentSlug.startsWith(prefix)
      ? currentSlug.slice(prefix.length)
      : currentSlug;
    const civilEntries = index.textbookToQuestions?.[shortSlug];
    if (!civilEntries || civilEntries.length === 0) return null;

    return (
      <MetaCard ariaLabel="過去問での出題" trackNav="past-exam-backlinks">
        <h2 className="text-lg font-bold text-[var(--ink)] mb-1">
          過去問での出題
        </h2>
        <p className="text-sm text-[var(--ink-muted)] mb-4">
          この教材の分野が登場した {label}の過去問 ({civilEntries.length} 件)
        </p>
        <ul className="space-y-2">
          {civilEntries.map((b, i) => (
            <li key={`${b.examSlug}-${b.section}-${i}`}>
              <Link
                href={`/docs/${prefix}${b.examSlug}`}
                className="block group"
              >
                <MetaListItem
                  title={
                    <>
                      {b.examTitle}{' '}
                      <span className="text-[var(--ink-body)]">{b.section}</span>
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
    <MetaCard ariaLabel="過去問での出題" trackNav="past-exam-backlinks">
      <h2 className="text-lg font-bold text-[var(--ink)] mb-1">
        過去問での出題
      </h2>
      <p className="text-sm text-[var(--ink-muted)] mb-4">
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
                    <span className="text-[var(--ink-body)]">{b.question}</span>
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
