import { getCategoryHubPath } from '@/lib/categories';
import { getCategoryCurriculum } from '@/config/category-curriculum';
import { classifyDoc, isCareerDoc, type DocGroupKey } from '@/lib/doc-classifier';
import type { DocMeta } from '@/lib/docs';
import { examYearOrder } from '@/lib/exam-year-nav.mjs';

// guide（要点・概要）記事を読んだ人を「次のステップ（演習・テキスト・分野）」へ送る導線の解決。
// href はカテゴリページの sec-* アンカー（そこに直前期の note CTA も同居＝回遊と収益導線が接続）。
// アンカー slug は src/components/category/CategoryViews.tsx / CategorySections.tsx の section id と一致させる。

/** doc は行き先の節の代表の記事（サムネイル用）。見つからなければ無い */
export type NextStep = { label: string; hint: string; href: string; doc?: DocMeta };

type StepSpec = { anchor: string; label: string; hint: string };

const STEPS: Record<string, StepSpec[]> = {
  'civil-construction-1': [
    { anchor: 'primary', label: '過去問で実力をためす', hint: '年度別の第1次・第2次検定' },
    { anchor: 'textbook', label: 'テキストで体系的に学ぶ', hint: '章立ての本文解説・各章の要点' },
    // 1級の資格ページには分野別（#sec-fields）の節が無い（要点は教科書の章の入口）。無い節を指していた（2026-11-15）
    { anchor: 'secondary', label: '第2次検定の対策へ進む', hint: '経験記述・学科記述' },
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
  // 2026-11-15: 演習の節がある資格のガイドにも次の一歩を出す（DN-1219）。節の無い資格（ガイドだけの資格）には出さない
  'concrete-diagnostician': [
    { anchor: 'primary', label: '演習問題で確認する', hint: '分野別の四肢択一' },
    { anchor: 'textbook', label: 'テキストで体系的に学ぶ', hint: '劣化・調査・補修の本文解説' },
  ],
  'pe-first-stage': [
    { anchor: 'primary', label: '過去問で実力をためす', hint: '年度別の基礎・適性・専門' },
    { anchor: 'fields', label: '科目別の要点を見る', hint: '基礎科目の5群と適性科目' },
  ],
  surveyor: [
    { anchor: 'primary', label: '過去問で実力をためす', hint: '年度別の午前・午後' },
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

// 第2次検定（記述）のガイドは、第1次の過去問・分野別の要点ではなく第2次検定の節へ送る（2026-11-26・
// 2級の採点ガイドの「過去問で実力をためす」が第1次検定の過去問に、「他の分野の要点」が盛土の要点に行っていた）。
// 資格ページに #sec-secondary がある資格だけ。どのガイドが第2次かは分野別の並び（category-curriculum.json）の secondary の塊で決める。
const SECONDARY_STEP: StepSpec = { anchor: 'secondary', label: '第2次検定の過去問で答案を練習する', hint: '年度別の経験記述・学科記述' };
const SECONDARY_CATEGORIES = new Set(['civil-construction-1', 'civil-construction-2']);

/** 現在のガイドが第2次検定の塊に入っているか */
function isSecondaryGuide(category: string, currentSlug: string | undefined): boolean {
  if (!currentSlug) return false;
  const block = getCategoryCurriculum(category)?.fields?.blocks.find((b) => b.id === 'secondary');
  return Boolean(block?.slugs.some((suffix) => `${category}-${suffix}` === currentSlug));
}

/** アンカー（節の id）→ 記事型。`fields` は型でなく分野別の並び（category-curriculum.json）の先頭を使う */
const ANCHOR_GROUP: Record<string, DocGroupKey> = { primary: 'primary', secondary: 'secondary', textbook: 'textbook', pastExam: 'pastExam', keyword: 'keyword' };

/** 行き先の節の代表の記事。教科書は章順の先頭、ほかは最新の年度（年度の無い記事は一覧の並びの先頭）。現在の記事・転職記事は除く */
function representativeDoc(category: string, anchor: string, docs: readonly DocMeta[], currentSlug: string | undefined): DocMeta | undefined {
  const usable = docs.filter((doc) => doc.slug !== currentSlug && doc.published !== false && !isCareerDoc(doc));
  if (anchor === 'fields') {
    const slugs = getCategoryCurriculum(category)?.fields?.blocks.flatMap((block) => block.slugs.map((suffix) => `${category}-${suffix}`)) ?? [];
    return slugs.flatMap((slug) => usable.filter((doc) => doc.slug === slug))[0];
  }
  const group = ANCHOR_GROUP[anchor];
  if (!group) return undefined;
  const inGroup = usable.filter((doc) => doc.category === category && classifyDoc(doc) === group);
  if (group === 'textbook') return [...inGroup].sort((a, b) => (a.textbook_order ?? 999) - (b.textbook_order ?? 999))[0];
  // 過去問は最新の年度を代表にする（一覧の先頭は古い年度のことがある）
  return [...inGroup].sort((a, b) => (examYearOrder(b.slug) ?? -1) - (examYearOrder(a.slug) ?? -1))[0];
}

export function resolveNextSteps(category: string, docs: readonly DocMeta[] = [], currentSlug?: string): NextStep[] {
  const steps = SECONDARY_CATEGORIES.has(category) && isSecondaryGuide(category, currentSlug)
    ? [SECONDARY_STEP, ...(STEPS[category] ?? []).filter((s) => !['primary', 'fields', SECONDARY_STEP.anchor].includes(s.anchor))]
    : STEPS[category];
  if (!steps) return [];
  return steps.map((s) => {
    const doc = representativeDoc(category, s.anchor, docs, currentSlug);
    return {
      label: s.label,
      hint: s.hint,
      href: `${getCategoryHubPath(category)}#sec-${s.anchor}`,
      ...(doc ? { doc } : {}),
    };
  });
}
