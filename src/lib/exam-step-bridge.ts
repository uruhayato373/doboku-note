import { getCategoryHubPath } from '@/lib/categories';
import { getPublicDocPath } from '@/lib/content-routes';

/**
 * exam-step-bridge.ts — 技術士第一次試験の過去問ページの記事末に出す「一次の次は二次」の行き先を、科目から決める。
 *
 * なぜ要るか: 一次の過去問の読者は二次（記述式）の入口を知らないまま離脱していた（2026-11 の SEO 計画 §1）。
 *   専門科目の部門（建設・上下水道・水産）がそのまま二次の受験部門になるので、部門ごとの入口へ送る。
 *   基礎・適性科目は全部門共通なので、受験者の多い建設部門を主にして、他の 2 部門を添える。
 * 計測: ExamStepBridge の MetaCard trackNav="exam-step"（internal_nav_click・label=exam-step）。
 */

interface ExamStepLink {
  readonly href: string;
  readonly label: string;
  readonly hint: string;
}

export interface ExamStepBridgeData {
  readonly heading: string;
  readonly lead: string;
  readonly links: readonly ExamStepLink[];
}

type Department = 'construction' | 'water-supply' | 'fisheries';

const SECOND_STAGE: Record<Department, readonly ExamStepLink[]> = {
  construction: [
    { href: getCategoryHubPath('pe-construction'), label: '二次試験 建設部門の過去問と論文対策', hint: '必須科目I・選択科目11科目の記述式（令和元〜8年度）' }, // qualification-ssot: allow 二次試験の入口へのリンクの文言で資格名の対応表ではない
    { href: getPublicDocPath('pe-construction-secondary-study-method'), label: '建設部門 二次試験の勉強法', hint: '独学の進め方と学習ロードマップ' },
  ],
  'water-supply': [
    { href: getPublicDocPath('pe-water-supply-guide-overview'), label: '二次試験 上下水道部門とは', hint: '試験の形式・受験資格・日程' },
    { href: getPublicDocPath('pe-water-supply-guide-study-plan'), label: '上下水道部門 二次試験の学習計画', hint: '筆記試験から逆算する進め方' },
  ],
  fisheries: [
    { href: getPublicDocPath('pe-fisheries-guide-overview'), label: '二次試験 水産部門とは', hint: '試験の形式・受験資格・日程' },
    { href: getPublicDocPath('pe-fisheries-guide-study-plan'), label: '水産部門 二次試験の学習計画', hint: '筆記試験から逆算する進め方' },
  ],
};

/** slug（例 pe-first-stage-r07-water-supply・pe-first-stage-r01-retry-construction）の末尾から科目を読む */
function subjectOf(slug: string): Department | 'common' | null {
  const m = slug.match(/^pe-first-stage-(?:h\d{2}|r\d{2})-(?:retry-)?(basic|aptitude|construction|water-supply|fisheries)$/);
  if (!m) return null;
  const s = m[1];
  return s === 'basic' || s === 'aptitude' ? 'common' : (s as Department);
}

/** 一次の過去問ページなら行き先を返す。それ以外（ガイド・他資格）は null */
export function resolveExamStepBridge(category: string | undefined, docGroup: string, slug: string): ExamStepBridgeData | null {
  if (category !== 'pe-first-stage' || docGroup !== 'primary') return null;
  const subject = subjectOf(slug);
  if (!subject) return null;
  if (subject === 'common') {
    return {
      heading: '一次の次は二次試験（記述式）',
      lead: '基礎・適性科目は全部門共通です。二次試験は一次で選んだ部門の記述式に進みます。',
      links: [SECOND_STAGE.construction[0]!, SECOND_STAGE['water-supply'][0]!, SECOND_STAGE.fisheries[0]!],
    };
  }
  return {
    heading: '一次の次は二次試験（記述式）',
    lead: '一次の専門科目の部門が、そのまま二次試験の受験部門になります。記述式の出題と準備の進め方へ。',
    links: SECOND_STAGE[subject],
  };
}
