import { getCategoryHubPath } from '@/lib/categories';

// guide（要点・概要）記事を読んだ人を「次のステップ（演習・テキスト・分野）」へ送る導線の解決。
// href はカテゴリページの sec-* アンカー（そこに直前期の note CTA も同居＝回遊と収益導線が接続）。
// アンカー slug は src/components/category/CategoryViews.tsx / CategorySections.tsx の section id と一致させる。

export type NextStep = { label: string; hint: string; href: string };

type StepSpec = { anchor: string; label: string; hint: string };

const STEPS: Record<string, StepSpec[]> = {
  'civil-construction-1': [
    { anchor: 'primary', label: '過去問で実力をためす', hint: '年度別の第1次・第2次検定' },
    { anchor: 'textbook', label: 'テキストで体系的に学ぶ', hint: '章立ての本文解説' },
    { anchor: 'fields', label: '他の分野の要点を見る', hint: '出題分野別のまとめ' },
  ],
  'civil-construction-2': [
    { anchor: 'primary', label: '過去問で実力をためす', hint: '年度別の第1次・第2次検定' },
    { anchor: 'fields', label: '他の分野の要点を見る', hint: '出題分野別のまとめ' },
  ],
  'concrete-engineer': [
    { anchor: 'textbook', label: '分野別テキストで基礎を固める', hint: '材料・配合・試験・製造・施工' },
    { anchor: 'primary', label: 'オリジナル問題で確認する', hint: '技士レベルの四肢択一' },
  ],
  'concrete-chief-engineer': [
    { anchor: 'primary', label: '過去問で実力をためす', hint: '分野別の四肢択一' },
    { anchor: 'textbook', label: 'テキストで体系的に学ぶ', hint: '章立ての本文解説' },
  ],
  'pe-construction': [
    { anchor: 'pastExam', label: '過去問で答案を練習する', hint: '科目×年度の記述式' },
    { anchor: 'keyword', label: '論点キーワードを調べる', hint: '科目別の論点集' },
  ],
  'pe-comprehensive-management': [
    { anchor: 'pastExam', label: '過去問で解答戦略を試す', hint: '択一・記述の年度別' },
    { anchor: 'keyword', label: 'キーワードを調べる', hint: '5管理×26セクションの索引' },
  ],
};

export function resolveNextSteps(category: string): NextStep[] {
  const steps = STEPS[category];
  if (!steps) return [];
  return steps.map((s) => ({
    label: s.label,
    hint: s.hint,
    href: `${getCategoryHubPath(category)}#sec-${s.anchor}`,
  }));
}
