/**
 * 記事 slug → 表示する note マガジンのマッピング (Single Source of Truth)
 *
 * 設計方針:
 * - 完全一致 / Prefix 一致 / 動的パターン (regex) を組み合わせる
 * - 1 ページに複数マガジンを並べることが可能 (例: r07-secondary に 4 ペルソナ全部)
 * - inline (本文末尾) と sidebar (PC 右ペイン) を別指定し、モバイル/PC で出し分け
 * - 表示の最終可否は note-magazines.ts の published フラグ + noteUrl 空チェックで決まる
 *   ここでは「どのページに何を出すか」だけを定義する
 */
import type { DocGroupKey } from './doc-classifier';
import type { MagazineId } from './note-magazines';

export interface PlacementSlot {
  readonly magazineId: MagazineId;
  readonly utmContent: string;
}

export interface ResolvedPlacement {
  readonly inline: ReadonlyArray<PlacementSlot>;
  readonly sidebar: ReadonlyArray<PlacementSlot>;
  /**
   * true なら inline はモバイルのみ表示 (zenn-desktop:hidden)、PC は sidebar 側に任せる。
   * 主要ハブ (pillar / pattern-essay / r0X-secondary / essay-exam-strategy) は false にして、
   * inline を強い CTA として PC でも表示する。
   */
  readonly inlineMobileOnly: boolean;
}

const EMPTY: ResolvedPlacement = { inline: [], sidebar: [], inlineMobileOnly: true };

/**
 * slug → utm_content 用の短縮識別子。
 * "pe-comprehensive-management-keyword-2026" + "sidebar" → "keyword-2026-sidebar"
 */
function utmContentFor(slug: string, position: string): string {
  const short = slug
    .replace(/^pe-comprehensive-management-/, '')
    .replace(/^civil-construction-1-/, '');
  return `${short}-${position}`;
}

function slot(magazineId: MagazineId, slug: string, position: string): PlacementSlot {
  return { magazineId, utmContent: utmContentFor(slug, position) };
}

/**
 * pe-comprehensive-management-{r0X}-essay-{persona} → ペルソナ別 magazine。
 */
function matchPersonaEssay(slug: string): MagazineId | null {
  const m = slug.match(/^pe-comprehensive-management-r0[1-9]-essay-(.+)$/);
  if (!m) return null;
  const persona = m[1]!;
  if (persona.startsWith('river-consultant')) return 'essay-river-consultant-magazine';
  if (persona.startsWith('general-contractor')) return 'essay-general-contractor-magazine';
  if (persona.startsWith('environment-survey')) return 'essay-environment-survey-magazine';
  if (persona.startsWith('road-municipality')) return 'essay-road-municipality-magazine';
  return null;
}

/**
 * pattern-essay-{persona} → ペルソナ別 magazine。
 */
function matchPatternEssay(slug: string): MagazineId | null {
  const m = slug.match(/^pe-comprehensive-management-pattern-essay-(.+)$/);
  if (!m) return null;
  const persona = m[1]!;
  if (persona.startsWith('river-consultant')) return 'essay-river-consultant-magazine';
  if (persona.startsWith('general-contractor')) return 'essay-general-contractor-magazine';
  if (persona.startsWith('environment-survey')) return 'essay-environment-survey-magazine';
  if (persona.startsWith('road-municipality')) return 'essay-road-municipality-magazine';
  return null;
}

const ALL_PERSONA_MAGAZINES: readonly MagazineId[] = [
  'essay-river-consultant-magazine',
  'essay-general-contractor-magazine',
  'essay-environment-survey-magazine',
  'essay-road-municipality-magazine',
] as const;

/**
 * 2026-05-17 新規マガジン (Series 1/3/4/5)。M1「データ駆動戦略」は 2026-05-18 撤回。
 * 配置原則:
 * - whitepaper-r7-strategy (¥2,480): 白書テーマ記事 + mlit ハブ で primary CTA
 * - r8-essay-forecast (¥2,480): R07 年度ページ + essay-exam-strategy hub
 * - essay-template-3d (¥2,980 プレミアム): essay-exam-strategy + pattern-essay 4 ペルソナハブ
 */
const NEW_MAGAZINES = {
  whitepaperR7: 'whitepaper-r7-strategy' as const,
  r8Forecast: 'r8-essay-forecast' as const,
  template3d: 'essay-template-3d' as const,
} satisfies Record<string, MagazineId>;

/**
 * slug + docGroup から、表示すべきマガジン配置を解決する。
 * 表示の最終可否 (公開済みか) は呼び出し側で getMagazine() で確認する。
 *
 * 注: essay-mlit-* 7 記事 (2026-05-18 撤回) と mlit-whitepaper-2025 (2026-05-18 撤回) の
 * 配線は削除済み。白書 R7 × 16 ペア × 4 ペルソナの深掘りは M2 magazine
 * (whitepaper-r7-strategy) 独占に分業 (Red Line #7)。
 */
export function resolvePlacement(slug: string, docGroup: DocGroupKey): ResolvedPlacement {
  // 1. 完全一致: 記述式戦略ハブは精読ガイド + 新規プレミアム + 全 4 ペルソナ模範論文を提示 (強 CTA)
  if (slug === 'pe-comprehensive-management-essay-exam-strategy') {
    return {
      inline: [
        slot('tankan-reading-guide', slug, 'inline-1'),
        slot(NEW_MAGAZINES.template3d, slug, 'inline-2'),
        slot(NEW_MAGAZINES.r8Forecast, slug, 'inline-3'),
        ...ALL_PERSONA_MAGAZINES.map((m, i) => slot(m, slug, `inline-${i + 4}`)),
      ],
      sidebar: [
        slot('tankan-reading-guide', slug, 'sidebar-1'),
        slot(NEW_MAGAZINES.template3d, slug, 'sidebar-2'),
      ],
      inlineMobileOnly: false,
    };
  }

  // 1.5. (廃止) essay-data-2026 + M1「データ駆動戦略」は 2026-05-18 撤回済み

  // 2. pattern-essay-{persona} → 該当ペルソナ模範論文マガジン + テンプレ 3D (ハブ、強 CTA)
  const patternMag = matchPatternEssay(slug);
  if (patternMag) {
    return {
      inline: [
        slot(patternMag, slug, 'inline-1'),
        slot(NEW_MAGAZINES.template3d, slug, 'inline-2'),
      ],
      sidebar: [slot(patternMag, slug, 'sidebar')],
      inlineMobileOnly: false,
    };
  }

  // 3. r0X-essay-{persona} 個別年度ペルソナ記事 → 該当ペルソナマガジン (個別記事、sidebar 主体)
  const personaMag = matchPersonaEssay(slug);
  if (personaMag) {
    return {
      inline: [slot(personaMag, slug, 'inline')],
      sidebar: [slot(personaMag, slug, 'sidebar')],
      inlineMobileOnly: true,
    };
  }

  // 4. r0X-secondary (年度別 記述式問題ページ) → 全ペルソナ模範論文 + R07 のみ r8-forecast 強化 (年度ハブ、強 CTA)
  const secondaryMatch = slug.match(/^pe-comprehensive-management-r(0[1-9])-secondary$/);
  if (secondaryMatch) {
    const isR07 = secondaryMatch[1] === '07';
    const inline: PlacementSlot[] = ALL_PERSONA_MAGAZINES.map((m, i) =>
      slot(m, slug, `inline-${i + 1}`),
    );
    if (isR07) {
      inline.unshift(slot(NEW_MAGAZINES.r8Forecast, slug, 'inline-r8'));
    }
    return {
      inline,
      sidebar: [
        slot('tankan-reading-guide', slug, 'sidebar-1'),
      ],
      inlineMobileOnly: false,
    };
  }

  // 4.5. (廃止) 国土交通白書ハブ記事 (mlit-whitepaper-2025) は 2026-05-18 撤回済み。
  //       M2 magazine (whitepaper-r7-strategy) 独占に分業 (Red Line #7)。

  // 5. pillar → 精読ガイド単独 CTA（M1 撤回 2026-05-18 でエントリー CTA は精読ガイドに一本化）
  if (docGroup === 'pillar') {
    return {
      inline: [slot('tankan-reading-guide', slug, 'inline-1')],
      sidebar: [slot('tankan-reading-guide', slug, 'sidebar')],
      inlineMobileOnly: false,
    };
  }

  // 6. keyword / keyword-2026 → 精読ガイド単独 CTA（M1 撤回 2026-05-18、keyword-2026 ハブも精読ガイドに集約）
  if (docGroup === 'keyword' || slug === 'pe-comprehensive-management-keyword-2026') {
    const isHub = slug === 'pe-comprehensive-management-keyword-2026';
    return {
      inline: [slot('tankan-reading-guide', slug, isHub ? 'inline-1' : 'inline-mobile')],
      sidebar: [slot('tankan-reading-guide', slug, 'sidebar-1')],
      inlineMobileOnly: !isHub,
    };
  }

  return EMPTY;
}
