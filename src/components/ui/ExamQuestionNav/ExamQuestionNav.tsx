import { questionHeadings } from '@/lib/exam-question-number';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import type { TocHeading } from '@/lib/toc';

interface ExamQuestionNavProps {
  /** extractHeadings の結果。`## 問題 No.N` 見出しから設問グリッドを生成する。 */
  readonly headings: TocHeading[];
}

/**
 * ExamQuestionNav — 過去問（primary/一次）ページの設問グリッドナビ。
 *
 * 設問数が多い過去問ページでは TOC が「問題 No.1〜No.65」の羅列になりナビとして機能しないため
 * 非表示にしているが、代わりに番号グリッドのジャンプ UI を提供する。各ボタンは該当設問見出しの
 * アンカー（generateHeadingId 由来の `#問題-noN`）へスクロールする。
 */
export default function ExamQuestionNav({ headings }: ExamQuestionNavProps) {
  const questions = questionHeadings(headings);

  if (questions.length === 0) return null;

  const title = `設問一覧（全 ${questions.length} 問）`;

  const grid = (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((q) => (
        <a
          key={q.id}
          href={`#${q.id}`}
          className="focus-ring flex h-11 min-w-11 items-center justify-center rounded-card-inline border border-(--rule-soft) px-2 text-sm tabular-nums text-brand transition-colors hover:border-brand hover:bg-brand-fill hover:text-brand-deep dark:border-(--rule-soft)"
          aria-label={`問題 ${q.label} へ移動`}
        >
          {q.label}
        </a>
      ))}
    </div>
  );

  return (
    <MetaCard as="div" padding="compact" title={title}>
      {grid}
    </MetaCard>
  );
}
