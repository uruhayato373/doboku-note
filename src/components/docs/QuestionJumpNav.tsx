import Link from 'next/link';
import Disclosure from '@/components/ui/Disclosure/Disclosure';
import { questionHeadings } from '@/lib/exam-question-number';

// 年度別過去問（問題番号が H2 で並ぶ 1 ページ）の問題番号ジャンプ。
// 通常 TOC は「問番号の羅列」になるため出していない（DocPage.isQuestionSeries）が、
// その結果モバイルで 5 万 px 超のページを目的の問まで手スクロールするしかなかった（2026-09 監査）。
// 見出しテキストから番号だけを取り出しチップにする（解析は PC の設問一覧と共通の src/lib/exam-question-number.ts）。番号が取れない見出しは無視する。
//
// 2026-11-26: 技術士第一次の見出し（「Ⅰ-1-1」「Ⅲ-1」）でも出るようにし、基礎科目は群ごとの行に分けた
// （群から 3 問ずつ選んで解く試験なので、自分が解く群へ直接行けるように）。
// あわせて、次の行き先（前後の年度・演習アプリ）を冒頭にも置く。1 回 20 分ほど解いた人の次の一手が、
// スマホではページの 87% の位置（年度の案内）まで下りないと見えなかった。

type Heading = { id: string; text: string; level: number };

/** 技術士第一次 基礎科目の群（試験の出題区分。Ⅰ-群-番号 の見出しのときだけ使う） */
const BASIC_GROUPS: Readonly<Record<number, string>> = {
  1: '設計・計画',
  2: '情報・論理',
  3: '解析',
  4: '材料・化学・バイオ',
  5: '環境・エネルギー・技術',
};

export interface QuestionJumpLink {
  readonly href: string;
  readonly label: string;
}

const CHIP =
  'focus-ring inline-flex h-11 min-w-11 items-center justify-center rounded-card-inline border border-(--rule-soft) px-2 font-mono text-[13px] tabular-nums text-(--ink-body) transition-colors hover:border-(--accent) hover:bg-(--accent-fill) hover:text-(--accent) dark:border-(--rule-soft)';
const NEXT_LINK =
  'focus-ring inline-flex min-h-11 items-center rounded-card-inline border border-(--rule-soft) px-3 text-[13px] text-brand transition-colors hover:border-brand dark:border-(--rule-soft)';

export default function QuestionJumpNav({
  headings,
  older,
  newer,
  quiz,
}: {
  headings: Heading[];
  /** 前の年度（同じ科目） */
  older?: QuestionJumpLink | null | undefined;
  /** 次の年度（同じ科目） */
  newer?: QuestionJumpLink | null | undefined;
  /** 演習アプリ */
  quiz?: QuestionJumpLink | null | undefined;
}) {
  const items = questionHeadings(headings);
  if (items.length < 5) return null;
  const grouped = items.every((it) => it.group !== undefined);
  const groups = grouped ? [...new Set(items.map((it) => it.group!))] : [];
  const chip = (it: (typeof items)[number]) => (
    <li key={it.id}>
      <a href={`#${it.id}`} aria-label={`問題 ${it.label} へ移動`} className={CHIP}>
        {it.label}
      </a>
    </li>
  );
  const hasNext = Boolean(older || newer || quiz);
  return (
    <nav
      aria-label="問題番号へ移動"
      data-cta="nav"
      data-cta-label="question-jump"
      className="mb-6 rounded-card-section border border-(--rule-soft) bg-(--paper) p-3 dark:border-(--rule-soft)"
    >
      <a
        href={`#${items[0]!.id}`}
        className="focus-ring mb-2 flex min-h-11 items-center justify-center rounded-card-inline border border-(--accent) bg-(--accent-fill) px-3 text-[14px] font-bold text-(--accent) dark:border-(--accent)"
      >
        問{items[0]!.label}から読む <span aria-hidden="true" className="ml-2">↓</span>
      </a>
      <Disclosure
        variant="plain"
        // 群から選んで解く基礎科目だけ最初から開く（ほかは番号の羅列なので閉じておき、本文を押し下げない）
        open={grouped}
        summaryClassName="text-[13px] font-bold text-(--ink)"
        summary={<>{grouped ? '群・問題番号を選ぶ' : '問題番号を選ぶ'} <span className="font-normal text-(--ink-muted)">（全{items.length}問）</span></>}
      >
        {grouped ? (
          <div className="mt-2 space-y-2">
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-1 text-[12px] text-(--ink-muted)">
                  {g}群{BASIC_GROUPS[g] ? ` ${BASIC_GROUPS[g]}` : ''}
                </p>
                <ol className="flex flex-wrap gap-1.5">{items.filter((it) => it.group === g).map(chip)}</ol>
              </div>
            ))}
          </div>
        ) : (
          <ol className="mt-2 flex flex-wrap gap-1.5">{items.map(chip)}</ol>
        )}
      </Disclosure>
      {hasNext && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-(--rule-soft) pt-3 dark:border-(--rule-soft)">
          {older && (
            <Link href={older.href} data-cta-label="question-jump-older" className={NEXT_LINK}>
              <span aria-hidden="true" className="mr-1">←</span>
              {older.label}
            </Link>
          )}
          {newer && (
            <Link href={newer.href} data-cta-label="question-jump-newer" className={NEXT_LINK}>
              {newer.label}
              <span aria-hidden="true" className="ml-1">→</span>
            </Link>
          )}
          {quiz && (
            <Link href={quiz.href} data-cta-label="question-jump-quiz" className={`${NEXT_LINK} font-bold`}>
              {quiz.label}
              <span aria-hidden="true" className="ml-1">→</span>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
