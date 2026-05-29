/**
 * 記事 slug → 表示する note マガジンのマッピング (Single Source of Truth)
 *
 * 設計方針:
 * - 完全一致 / Prefix 一致 / 動的パターン (regex) を組み合わせる
 * - 1 ページに複数マガジンを並べることが可能 (例: r07-secondary に 3 ペルソナ全部)
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
    .replace(/^civil-construction-1-/, '')
    .replace(/^civil-construction-2-/, '');
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
  if (persona.startsWith('road-municipality')) return 'essay-road-municipality-magazine';
  return null;
}

const ALL_PERSONA_MAGAZINES: readonly MagazineId[] = [
  'essay-river-consultant-magazine',
  'essay-general-contractor-magazine',
  'essay-road-municipality-magazine',
] as const;

/**
 * 2026-05-17 新規マガジン (Series 3/4)。M1「データ駆動戦略」は 2026-05-18 撤回、
 * M2「白書 R7 完全対応集」は 2026-05-25 に完全無料リード磁石へ戦略転換 (SoT 削除)。
 * 配置原則:
 * - r8-essay-forecast (¥2,480): R07 年度ページ + essay-exam-strategy hub
 * - essay-template-3d (¥2,980 プレミアム): essay-exam-strategy + pattern-essay 3 ペルソナハブ
 */
const NEW_MAGAZINES = {
  r8Forecast: 'r8-essay-forecast' as const,
  template3d: 'essay-template-3d' as const,
} satisfies Record<string, MagazineId>;

/**
 * slug + docGroup から、表示すべきマガジン配置を解決する。
 * 表示の最終可否 (公開済みか) は呼び出し側で getMagazine() で確認する。
 *
 * 注: essay-mlit-* 7 記事 (2026-05-18 撤回) と mlit-whitepaper-2025 (2026-05-18 撤回) の
 * 配線は削除済み。M2「白書 R7 完全対応集」は 2026-05-25 に完全無料リード磁石へ転換し
 * note 上の単独記事として SNS 集客 → 後続商品送客を担う (詳細:
 * docs/handoffs/2026-05-25-whitepaper-r7-free-lead-magnet.md)。
 */
export function resolvePlacement(slug: string, docGroup: DocGroupKey): ResolvedPlacement {
  // 1. 完全一致: 記述式戦略ハブは精読ガイド + 新規プレミアム + 全 3 ペルソナ模範論文を提示 (強 CTA)
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

  // 2.4. r8-essay-keyword-forecast (forecast hub) → R8 予想問題集マガジンへの強 CTA
  //      2026-05-26 改修: 9 テーマ俯瞰 → 6 テーマ俯瞰 + note 各記事への導線役に再設計。
  //      note 無料記事 (n8e92e4673a99) 公開済みに合わせて hub の役割を「予測解説」から
  //      「note 有料マガジン M3 へのリードページ」へ転換した（feedback by user 2026-05-26）。
  if (slug === 'pe-comprehensive-management-r8-essay-keyword-forecast') {
    return {
      inline: [
        slot(NEW_MAGAZINES.r8Forecast, slug, 'inline-1'),
        slot(NEW_MAGAZINES.template3d, slug, 'inline-2'),
      ],
      sidebar: [slot(NEW_MAGAZINES.r8Forecast, slug, 'sidebar-1')],
      inlineMobileOnly: false,
    };
  }

  // 2.5. r8-essay-theme-{topic} → R8 予想問題 spoke (固定 3 ペルソナ縦串学習、強 CTA)
  //     設計: spoke は固定 3 ペルソナ (ゼネコン/河川コンサル/自治体 道路担当) を縦串展開し、
  //     M3「R8 予想問題集」を主、M4「3D マトリクス」を業界外救済として副配置する。
  //     真実源: content-principles.md §21 + noteコンテンツ計画.md Red Line #8
  if (/^pe-comprehensive-management-r8-essay-theme-[a-z0-9-]+$/.test(slug)) {
    return {
      inline: [
        slot(NEW_MAGAZINES.r8Forecast, slug, 'inline-1'),
        slot(NEW_MAGAZINES.template3d, slug, 'inline-2'),
      ],
      sidebar: [slot(NEW_MAGAZINES.r8Forecast, slug, 'sidebar-1')],
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
  //       M2「白書 R7 完全対応集」は 2026-05-25 に完全無料リード磁石へ転換、note 単独記事化。

  // 4.6. management-tradeoffs (5管理間トレードオフ 横断ガイド) → 自治体 道路担当 magazine
  //     2026-05-28: 当初は記事末尾 inline + sidebar の両方を出していたが、
  //     ユーザ要望により inline を撤回し、本文中の <MagazineCard> 直接配置に切替。
  //     sidebar 側のみ placement 経由で維持（PC 右ペインの固定可視性を確保）。
  if (slug === 'pe-comprehensive-management-management-tradeoffs') {
    return {
      inline: [],
      sidebar: [slot('essay-road-municipality-magazine', slug, 'sidebar-1')],
      inlineMobileOnly: false,
    };
  }

  // 5. pillar → 精読ガイド単独 CTA（M1 撤回 2026-05-18 でエントリー CTA は精読ガイドに一本化）
  if (docGroup === 'pillar') {
    return {
      inline: [slot('tankan-reading-guide', slug, 'inline-1')],
      sidebar: [slot('tankan-reading-guide', slug, 'sidebar')],
      inlineMobileOnly: false,
    };
  }

  // 6. keyword / keyword-2026
  //    - hub (keyword-2026): 精読ガイドをサイドバーにコンテキスト一致 CTA として表示
  //    - 個別キーワード辞書ページ: 単一マガジン直送をやめ、サイドバーは空にして
  //      page.tsx 側で note 有料教材まとめ /links へ誘導するバナーを出す（2026-05-29 改修）。
  //      inline (モバイル) は従来どおり精読ガイドを維持。
  if (docGroup === 'keyword' || slug === 'pe-comprehensive-management-keyword-2026') {
    const isHub = slug === 'pe-comprehensive-management-keyword-2026';
    return {
      inline: [slot('tankan-reading-guide', slug, isHub ? 'inline-1' : 'inline-mobile')],
      sidebar: isHub ? [slot('tankan-reading-guide', slug, 'sidebar-1')] : [],
      inlineMobileOnly: !isHub,
    };
  }

  // 7. 2級土木 施工経験記述（guide / examples / 年度別 secondary r0X）
  //    → 完成答案集マガジン（civil-2-experience-essay）。
  //    published: false の間は getMagazine が null を返し CTA 非表示（防御的）。
  if (
    /^civil-construction-2-secondary-(experience-writing-(guide|examples)|r0[1-9])$/.test(slug)
  ) {
    return {
      inline: [slot('civil-2-experience-essay', slug, 'inline-1')],
      sidebar: [slot('civil-2-experience-essay', slug, 'sidebar-1')],
      inlineMobileOnly: false,
    };
  }

  return EMPTY;
}
