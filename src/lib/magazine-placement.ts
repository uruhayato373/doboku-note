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
 * slug + docGroup から、表示すべきマガジン配置を解決する。
 * 表示の最終可否 (公開済みか) は呼び出し側で getMagazine() で確認する。
 */
export function resolvePlacement(slug: string, docGroup: DocGroupKey): ResolvedPlacement {
  // 1. 完全一致: 記述式戦略ハブは精読ガイド + 全 4 ペルソナ模範論文を提示 (強 CTA)
  if (slug === 'pe-comprehensive-management-essay-exam-strategy') {
    return {
      inline: [
        slot('tankan-reading-guide', slug, 'inline-1'),
        ...ALL_PERSONA_MAGAZINES.map((m, i) => slot(m, slug, `inline-${i + 2}`)),
      ],
      sidebar: [slot('tankan-reading-guide', slug, 'sidebar')],
      inlineMobileOnly: false,
    };
  }

  // 2. pattern-essay-{persona} → 該当ペルソナ模範論文マガジン (ハブ、強 CTA)
  const patternMag = matchPatternEssay(slug);
  if (patternMag) {
    return {
      inline: [slot(patternMag, slug, 'inline')],
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

  // 4. r0X-secondary (年度別 記述式問題ページ) → 全ペルソナ模範論文 (年度ハブ、強 CTA)
  if (/^pe-comprehensive-management-r0[1-9]-secondary$/.test(slug)) {
    return {
      inline: ALL_PERSONA_MAGAZINES.map((m, i) => slot(m, slug, `inline-${i + 1}`)),
      sidebar: [slot('tankan-reading-guide', slug, 'sidebar')],
      inlineMobileOnly: false,
    };
  }

  // 5. pillar → 精読ガイド (既存通り inline + sidebar 両方で強訴求)
  if (docGroup === 'pillar') {
    return {
      inline: [slot('tankan-reading-guide', slug, 'inline')],
      sidebar: [slot('tankan-reading-guide', slug, 'sidebar')],
      inlineMobileOnly: false,
    };
  }

  // 6. keyword / keyword-2026 → 精読ガイド (個別キーワードは sidebar 主体)
  if (docGroup === 'keyword' || slug === 'pe-comprehensive-management-keyword-2026') {
    return {
      inline: [slot('tankan-reading-guide', slug, 'inline-mobile')],
      sidebar: [slot('tankan-reading-guide', slug, 'sidebar')],
      inlineMobileOnly: true,
    };
  }

  return EMPTY;
}
