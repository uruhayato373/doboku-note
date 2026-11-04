import type { DocMeta } from '@/lib/docs';
import { findYearSiblings } from '@/lib/exam-year-nav.mjs';
import PrevNextNav from './PrevNextNav';

interface ExamYearNavProps {
  currentSlug: string;
  categoryArticles: DocMeta[];
}

/** 過去問の年度ナビ。同じ試験の前後の年度へ、記事を読み終えた位置から移れるようにする */
export default function ExamYearNav({ currentSlug, categoryArticles }: ExamYearNavProps) {
  const { older, newer } = findYearSiblings(currentSlug, categoryArticles.map((m) => m.slug));
  const find = (slug: string | null) => categoryArticles.find((m) => m.slug === slug) ?? null;

  return (
    <div className="mt-8">
      <PrevNextNav
        heading="ほかの年度の過去問"
        track="exam-year-nav"
        prev={find(older)}
        next={find(newer)}
        prevLabel="前の年度"
        nextLabel="次の年度"
      />
    </div>
  );
}
