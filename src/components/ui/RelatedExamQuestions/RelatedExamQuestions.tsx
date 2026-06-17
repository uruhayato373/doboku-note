/**
 * ピラーページ用: 該当する過去問設問を年度別に表示する。
 * 事前生成された `src/config/pillar-exam-questions.json` を参照する。
 * 更新は `npm run build-pillar-exam-questions` で再生成（refresh-indexes 経由）。
 *
 * Issue: #72 ピラーページ拡充
 */
'use client';

import Link from 'next/link';
import { useState } from 'react';
import pillarExamData from '@/config/pillar-exam-questions.json';

type PillarKey = 'economic' | 'human-resource' | 'information' | 'safety' | 'social-environment';

interface QuestionEntry {
  num: string;
  heading: string;
  anchor: string;
  keywords: string[];
}

interface YearEntry {
  year: string;
  exam_slug: string;
  questions: QuestionEntry[];
}

interface PillarEntry {
  label: string;
  total: number;
  by_year: YearEntry[];
}

interface PillarExamData {
  version: number;
  generated_at: string;
  pillars: Record<string, PillarEntry>;
}

interface RelatedExamQuestionsProps {
  pillar: PillarKey;
}

function yearLabel(year: string): string {
  // "r07" → "令和 7 年度"、"h26" → "平成 26 年度"
  const era = year[0] === 'r' ? '令和' : '平成';
  const num = parseInt(year.slice(1), 10);
  return `${era} ${num} 年度`;
}

export default function RelatedExamQuestions({ pillar }: RelatedExamQuestionsProps) {
  const data = pillarExamData as PillarExamData;
  const entry = data.pillars[pillar];

  // 最新年度のみ初期展開（残りは折りたたみ）
  const [openYears, setOpenYears] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (entry && entry.by_year[0]) initial.add(entry.by_year[0].year);
    return initial;
  });

  if (!entry || entry.by_year.length === 0) return null;

  const toggleYear = (year: string) => {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  return (
    <section
      aria-label={`${entry.label}に該当する過去問`}
      className="bg-white dark:bg-gray-800 rounded-card-section shadow-card-section border border-gray-200 dark:border-gray-700 p-6 sm:p-8 my-8"
    >
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        {entry.label} に該当する過去問
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        過去 17 年（H21〜R07）の択一式から、{entry.label}の論点を含む設問 <strong>{entry.total} 問</strong> を年度別に集約。年度の見出しをクリックで展開。
      </p>

      <ul className="space-y-2">
        {entry.by_year.map((y) => {
          const isOpen = openYears.has(y.year);
          return (
            <li key={y.year} className="border border-gray-200 dark:border-gray-700 rounded-card-content overflow-hidden">
              <button
                type="button"
                onClick={() => toggleYear(y.year)}
                aria-expanded={isOpen}
                className="w-full px-4 py-2.5 flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden className="text-gray-500 dark:text-gray-400 font-mono text-xs">
                    {isOpen ? '▼' : '▶'}
                  </span>
                  <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {yearLabel(y.year)}
                  </span>
                  <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
                    {y.questions.length} 問
                  </span>
                </span>
              </button>
              {isOpen && (
                <ul className="px-4 py-3 space-y-1.5">
                  {y.questions.map((q) => (
                    <li key={`${y.year}-${q.num}`}>
                      <Link
                        href={`/docs/${y.exam_slug}#${q.anchor}`}
                        className="inline-flex items-baseline gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                      >
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                          {q.heading}
                        </span>
                        <span className="text-gray-600 dark:text-gray-300 text-xs">
                          {q.keywords.slice(0, 3).join('・')}
                          {q.keywords.length > 3 ? ` ほか ${q.keywords.length - 3}` : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
