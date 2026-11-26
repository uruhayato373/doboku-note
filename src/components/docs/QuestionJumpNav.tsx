import Disclosure from '@/components/ui/Disclosure/Disclosure';
import { questionHeadings } from '@/lib/exam-question-number';
import { QuestionChipList, isGrouped, type QuestionNextLinks } from './QuestionChips';
import QuestionStickyBar from './QuestionStickyBar';

// 年度別過去問（問題番号が H2 で並ぶ 1 ページ）の問題番号ジャンプ。
// 通常 TOC は「問番号の羅列」になるため出していない（DocPage.isQuestionSeries）が、
// その結果モバイルで 5 万 px 超のページを目的の問まで手スクロールするしかなかった（2026-09 監査）。
// 見出しテキストから番号だけを取り出しチップにする（解析は PC の設問一覧と共通の src/lib/exam-question-number.ts）。番号が取れない見出しは無視する。
//
// 2026-11-26: 技術士第一次の見出し（「Ⅰ-1-1」「Ⅲ-1」）でも出るようにし、基礎科目は群ごとの行に分けた。
// 冒頭は「群・問題番号を選ぶ」の 1 行だけ（閉じた状態）。「問○から読む」は問1 がすぐ下にあるので置かず、
// 前後の年度と演習アプリは解き始める前の出口になるので冒頭に置かない（追従バーの一覧とページの最後の年度の案内・無料ツールにある）。
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
      <Disclosure
        variant="plain"
        summaryClassName="text-[13px] font-bold text-(--ink)"
        summary={<>{isGrouped(items) ? '群・問題番号を選ぶ' : '問題番号を選ぶ'} <span className="font-normal text-(--ink-muted)">（全{items.length}問）</span></>}
      >
        <div className="mt-2">
          <QuestionChipList items={items} />
        </div>
      </Disclosure>
      <QuestionStickyBar items={items} links={links} />
    </nav>
  );
}
