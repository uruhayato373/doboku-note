import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import { type ExamTopicQuestion } from '@/lib/exam-topic-bridge';

/** 問題文の **強調** だけを <strong> にする（他の記法は exam-topic-bridge.ts の選定で除いている） */
function Emphasis({ text }: { text: string }) {
  return <>{text.split('**').map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))}</>;
}

/**
 * ExamTopicBridge — 実務記事の記事末で、読んだ論点が 1級土木の過去問に出ることを実物の 1 問で示す。
 * <summary> は「解答・解説」のまま（AnalyticsProvider の answer_reveal が拾う。cta_placement は直前の H2 の文言）。
 */
export default function ExamTopicBridge({ question }: { question: ExamTopicQuestion }) {
  return (
    <MetaCard ariaLabel="この論点が出る1級土木の過去問" trackNav="exam-topic">
      <h2 className="text-lg font-bold text-(--ink) mb-1">この論点が出る1級土木の過去問</h2>
      <p className="text-sm text-(--ink-muted) mb-3">{question.label}</p>
      <div className="text-[15px] leading-7 text-(--ink-body) whitespace-pre-line">
        <Emphasis text={question.body} />
      </div>
      <ol className="mt-3 space-y-1.5 text-[15px] leading-7 text-(--ink-body)">
        {question.options.map((o) => (
          <li key={o.num} className="flex gap-2">
            <span className="shrink-0 font-semibold">({o.num})</span>
            <span>{o.text}</span>
          </li>
        ))}
      </ol>
      <details className="mt-4 rounded-card-content border border-(--rule-soft) px-4 py-2 dark:border-(--rule)">
        <summary className="cursor-pointer font-bold text-(--ink)">解答・解説</summary>
        <p className="mt-2 text-[15px] leading-7 text-(--ink-body)">
          正解は ({question.correct})。{question.explanation}
        </p>
      </details>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link href={question.examHref} className="font-semibold text-(--accent) hover:underline">この年度の過去問を全部解く →</Link>
        {question.textbook && (
          <Link href={question.textbook.href} className="font-semibold text-(--accent) hover:underline">教科書「{question.textbook.title}」で確認する →</Link>
        )}
      </div>
    </MetaCard>
  );
}
