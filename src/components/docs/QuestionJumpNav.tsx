import Disclosure from '@/components/ui/Disclosure/Disclosure';
import { questionHeadings } from '@/lib/exam-question-number';
import { QuestionChipList, QuestionNextLinkRow, isGrouped, type QuestionNextLinks } from './QuestionChips';
import QuestionStickyBar from './QuestionStickyBar';

// 年度別過去問（問題番号が H2 で並ぶ 1 ページ）の問題番号ジャンプ。
// 通常 TOC は「問番号の羅列」になるため出していない（DocPage.isQuestionSeries）が、
// その結果モバイルで 5 万 px 超のページを目的の問まで手スクロールするしかなかった（2026-09 監査）。
// 見出しテキストから番号だけを取り出しチップにする（解析は PC の設問一覧と共通の src/lib/exam-question-number.ts）。番号が取れない見出しは無視する。
//
// 2026-11-26: 技術士第一次の見出し（「Ⅰ-1-1」「Ⅲ-1」）でも出るようにし、基礎科目は群ごとの行に分けた。
// 番号の一覧は閉じておき（開くと約 560px で本文を押し下げていた）、前後の年度と演習アプリは閉じていても見える行に置く。
// 読み進めた先からは、上端の追従バー（QuestionStickyBar）で同じ番号・行き先を開ける。

type Heading = { id: string; text: string; level: number };

export default function QuestionJumpNav({ headings, older, newer, quiz }: { headings: Heading[] } & QuestionNextLinks) {
  const items = questionHeadings(headings);
  if (items.length < 5) return null;
  const links = { older, newer, quiz };
  return (
    <nav
      id="question-jump"
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
        summaryClassName="text-[13px] font-bold text-(--ink)"
        summary={<>{isGrouped(items) ? '群・問題番号を選ぶ' : '問題番号を選ぶ'} <span className="font-normal text-(--ink-muted)">（全{items.length}問）</span></>}
      >
        <div className="mt-2">
          <QuestionChipList items={items} />
        </div>
      </Disclosure>
      <div className="mt-2">
        <QuestionNextLinkRow {...links} labelPrefix="question-jump" />
      </div>
      <QuestionStickyBar items={items} links={links} />
    </nav>
  );
}
