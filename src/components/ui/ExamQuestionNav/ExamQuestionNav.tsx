import MetaCard from '@/components/ui/MetaCard/MetaCard';
import type { TocHeading } from '@/lib/toc';

interface ExamQuestionNavProps {
  /** extractHeadings の結果。`## 問題 No.N` 見出しから設問グリッドを生成する。 */
  readonly headings: TocHeading[];
  /** サイドバー（300px・コンパクト）か、モバイル本文中（広め）か。 */
  readonly variant?: 'sidebar' | 'mobile';
}

/** 見出しテキストから設問番号を取り出す。"問題 No.1" / "No.1" / "問1" / "第1問" 等に対応。 */
function parseQuestionNo(text: string): number | null {
  const m =
    text.match(/(?:問題\s*)?No\.?\s*(\d+)/i) ??
    text.match(/第\s*(\d+)\s*問/) ??
    text.match(/問\s*(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * ExamQuestionNav — 過去問（primary/一次）ページの設問グリッドナビ。
 *
 * 設問数が多い過去問ページでは TOC が「問題 No.1〜No.65」の羅列になりナビとして機能しないため
 * 非表示にしているが、代わりに番号グリッドのジャンプ UI を提供する。各ボタンは該当設問見出しの
 * アンカー（generateHeadingId 由来の `#問題-noN`）へスクロールする。
 */
export default function ExamQuestionNav({ headings, variant = 'sidebar' }: ExamQuestionNavProps) {
  const questions = headings
    .map((h) => ({ no: parseQuestionNo(h.text), id: h.id }))
    .filter((q): q is { no: number; id: string } => q.no !== null);

  if (questions.length === 0) return null;

  const title = `設問一覧（全 ${questions.length} 問）`;

  const grid = (
    <div className="flex flex-wrap gap-1.5">
      {questions.map((q) => (
        <a
          key={q.id}
          href={`#${q.id}`}
          className="flex h-9 min-w-9 items-center justify-center rounded-card-inline border border-[var(--rule-soft)] px-2 text-sm tabular-nums text-brand transition-colors hover:border-brand hover:bg-brand-fill hover:text-brand-deep"
          aria-label={`問題 ${q.no} へ移動`}
        >
          {q.no}
        </a>
      ))}
    </div>
  );

  if (variant === 'mobile') {
    return (
      <MetaCard trackNav="exam-question-nav">
        <h2 className="mb-4 text-lg font-bold text-[var(--ink)]">{title}</h2>
        {grid}
      </MetaCard>
    );
  }

  return (
    <MetaCard as="div" padding="compact">
      <div className="nav-card-title text-[var(--ink)]">{title}</div>
      {grid}
    </MetaCard>
  );
}
