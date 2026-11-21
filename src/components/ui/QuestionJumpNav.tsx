import Disclosure from '@/components/ui/Disclosure/Disclosure';
import { questionHeadings } from '@/lib/exam-question-number';

// 年度別過去問（問題番号が H2 で並ぶ 1 ページ）の問題番号ジャンプ。
// 通常 TOC は「問番号の羅列」になるため出していない（DocPage.isQuestionSeries）が、
// その結果モバイルで 5 万 px 超のページを目的の問まで手スクロールするしかなかった（2026-09 監査）。
// 見出しテキストから番号だけを取り出しチップにする（解析は PC の設問一覧と共通の src/lib/exam-question-number.ts）。番号が取れない見出しは無視する。

type Heading = { id: string; text: string; level: number };

export default function QuestionJumpNav({ headings }: { headings: Heading[] }) {
  const items = questionHeadings(headings).map((q) => ({ id: q.id, n: String(q.no) }));
  if (items.length < 5) return null;
  return (
    <nav
      aria-label="問題番号へ移動"
      className="mb-6 rounded-card-section border border-(--rule-soft) bg-(--paper) p-3 dark:border-(--rule-soft)"
    >
      <a
        href={`#${items[0]!.id}`}
        className="focus-ring mb-2 flex min-h-11 items-center justify-center rounded-card-inline border border-(--accent) bg-(--accent-fill) px-3 text-[14px] font-bold text-(--accent) dark:border-(--accent)"
      >
        問{items[0]!.n}から読む <span aria-hidden="true" className="ml-2">↓</span>
      </a>
      <Disclosure
        variant="plain"
        summaryClassName="text-[13px] font-bold text-(--ink)"
        summary={<>問題番号を選ぶ <span className="font-normal text-(--ink-muted)">（全{items.length}問）</span></>}
      >
        <ol className="mt-2 flex flex-wrap gap-1.5">
          {items.map((it) => (
            <li key={it.id}>
              <a
                href={`#${it.id}`}
                aria-label={`問題 ${it.n} へ移動`}
                className="focus-ring inline-flex h-11 min-w-11 items-center justify-center rounded-card-inline border border-(--rule-soft) px-2 font-mono text-[13px] tabular-nums text-(--ink-body) transition-colors hover:border-(--accent) hover:bg-(--accent-fill) hover:text-(--accent) dark:border-(--rule-soft)"
              >
                {it.n}
              </a>
            </li>
          ))}
        </ol>
      </Disclosure>
    </nav>
  );
}
