import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { getPublicDocPath } from '@/lib/content-routes';
import { getCategoryHubPath } from '@/lib/categories';
import { examYearLabel, getPillarExamQuestions } from '@/lib/pillar-exam-questions';

/** 直近から何年度分を出すか。全年度は資格ページの過去問の節へ送る */
const RECENT_YEARS = 3;

/**
 * 総監の 5 管理のページの記事末: この管理のキーワードが問われた択一の設問（直近 3 年度）。
 * 設問は過去問ページの見出しのアンカーへ直接飛ぶ。クリックは internal_nav_click（label=pillar-exam-questions）。
 */
export default function PillarExamQuestions({ slug }: { slug: string }) {
  const pillar = getPillarExamQuestions(slug);
  if (!pillar) return null;
  const years = pillar.by_year.slice(0, RECENT_YEARS);
  return (
    <MetaCard trackNav="pillar-exam-questions" title={<>{pillar.label}の過去問</>} lead={<>この管理のキーワードが問われた択一の設問（直近{years.length}年度・全{pillar.total}問）</>}>
      <div className="space-y-4">
        {years.map((y) => (
          <section key={y.year}>
            <h3 className="mb-2 text-sm font-bold text-(--ink)">
              <Link href={getPublicDocPath(y.exam_slug)} className="hover:text-(--accent) hover:underline">
                {examYearLabel(y.year)}
              </Link>
              <span className="ml-2 font-normal text-(--ink-muted)">{y.questions.length}問</span>
            </h3>
            <ul className="flex flex-wrap gap-2">
              {y.questions.map((q) => (
                <li key={q.anchor}>
                  <Link
                    href={`${getPublicDocPath(y.exam_slug)}#${q.anchor}`}
                    className="focus-ring inline-flex min-h-11 items-center rounded-card-inline border border-(--rule-soft) px-3 text-sm text-(--ink) transition-colors hover:border-(--accent) hover:text-(--accent) dark:border-(--rule-soft)"
                  >
                    {q.heading}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-4 text-sm">
        <Link href={`${getCategoryHubPath('pe-comprehensive-management')}#sec-pastExam`} className="font-bold text-(--accent) hover:underline">
          全年度の過去問を見る
        </Link>
      </p>
    </MetaCard>
  );
}
