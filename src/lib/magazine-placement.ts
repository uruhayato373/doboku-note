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

// 「全ペルソナ模範論文」配置用（essay-exam-strategy ハブ + r0X-secondary 年度ハブ）。
// 14 ペルソナ全マガジンを立場別（受注者→発注者）に並べる。これ以前は 3 ペルソナのみで
// 自治体系 10 + コンサル 2 が「サイトから一切送客されない孤立マガジン」だった（2026-06-13 拡張）。
// spoke 個別記事（pattern-essay / r0X-essay）の固定 3 ペルソナ縦串とは別系統。
const ALL_PERSONA_MAGAZINES: readonly MagazineId[] = [
  // 受注者系（ゼネコン・建設コンサル）
  'essay-general-contractor-magazine',
  'essay-river-consultant-magazine',
  'essay-road-consultant-magazine',
  'essay-urban-consultant-magazine',
  // 発注者系（自治体）
  'essay-road-municipality-magazine',
  'essay-river-municipality-magazine',
  'essay-urban-municipality-magazine',
  'essay-sewage-municipality-magazine',
  'essay-water-municipality-magazine',
  'essay-sabo-municipality-magazine',
  'essay-port-municipality-magazine',
  'essay-park-municipality-magazine',
  'essay-procurement-municipality-magazine',
  'essay-standards-municipality-magazine',
] as const;

/**
 * 技術士 建設部門 2次（pe-construction）。
 * 必須科目I・道路 の過去問ページ（pe-construction-r0X-{required,road}）と論文の書き方
 * ガイドを、該当する BK 模範解答集へ送客する。公開可否は呼び出し側 getMagazine() で判定
 * （現状 published:false のため CTA は表示されない＝公開時に自動発火）。
 */
function matchPeConstructionEssay(slug: string): MagazineId | null {
  if (/^pe-construction-r0[1-9]-required$/.test(slug)) return 'pe-construction-required-magazine';
  if (/^pe-construction-r0[1-9]-road$/.test(slug)) return 'pe-construction-road-magazine';
  if (/^pe-construction-r0[1-9]-river-coast$/.test(slug)) return 'pe-construction-river-coast-magazine';
  if (/^pe-construction-r0[1-9]-urban-planning$/.test(slug)) return 'pe-construction-urban-planning-magazine';
  if (/^pe-construction-r0[1-9]-geotechnical$/.test(slug)) return 'pe-construction-geotechnical-magazine';
  if (/^pe-construction-r0[1-9]-steel-concrete$/.test(slug)) return 'pe-construction-steel-concrete-magazine';
  if (/^pe-construction-r0[1-9]-construction-planning$/.test(slug)) return 'pe-construction-construction-planning-magazine';
  if (/^pe-construction-r0[1-9]-environment$/.test(slug)) return 'pe-construction-environment-magazine';
  if (/^pe-construction-r0[1-9]-port-airport$/.test(slug)) return 'pe-construction-port-airport-magazine';
  if (/^pe-construction-r0[1-9]-power-civil$/.test(slug)) return 'pe-construction-power-civil-magazine';
  if (/^pe-construction-r0[1-9]-railway$/.test(slug)) return 'pe-construction-railway-magazine';
  if (/^pe-construction-r0[1-9]-tunnel$/.test(slug)) return 'pe-construction-tunnel-magazine';
  // 論文の書き方ガイドは全受験者向けの必須科目I マガジンへ送客
  if (slug === 'pe-construction-pe-secondary-essay-guide') return 'pe-construction-required-magazine';
  return null;
}

/**
 * 2026-05-17 新規マガジン (Series 3/4)。M1「データ駆動戦略」は 2026-05-18 撤回、
 * M2「白書 R7 完全対応集」は 2026-05-25 に完全無料リード磁石へ戦略転換 (SoT 削除)。
 * 配置原則:
 * - r8-essay-forecast (¥2,480): R07 年度ページ + essay-exam-strategy hub
 * - essay-complete-pack / tradeoff-5kanri / setsumon3-policy-bank (2026-06-03 配線):
 *   essay-exam-strategy hub にパイプライン順で追加。完全パックを筆頭の強 CTA に。
 *
 * 注: essay-template-3d「解答テンプレ 3D」(¥2,980) は 2026-06-01 企画中止により配線削除。
 */
const NEW_MAGAZINES = {
  completePack: 'essay-complete-pack' as const,
  corePack: 'essay-core-pack' as const,
  tradeoff5kanri: 'tradeoff-5kanri' as const,
  setsumon3Bank: 'setsumon3-policy-bank' as const,
  r8Forecast: 'r8-essay-forecast' as const,
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
    // パイプライン順 (完全パック → コアパック → 型 → 設問3 → 予想 → 模範論文 → 精読基礎)。
    // 上段=完全パック¥9,800 を筆頭の強 CTA、下段=コアパック¥5,480 を次点（2段ラダー）。
    // sidebar は sidebarImageUrl を持つ精読ガイドを維持（パックは sidebarImageUrl 未設定）。
    return {
      inline: [
        slot(NEW_MAGAZINES.completePack, slug, 'inline-1'),
        slot(NEW_MAGAZINES.corePack, slug, 'inline-2'),
        slot(NEW_MAGAZINES.tradeoff5kanri, slug, 'inline-3'),
        slot(NEW_MAGAZINES.setsumon3Bank, slug, 'inline-4'),
        slot(NEW_MAGAZINES.r8Forecast, slug, 'inline-5'),
        ...ALL_PERSONA_MAGAZINES.map((m, i) => slot(m, slug, `inline-${i + 6}`)),
        slot('tankan-reading-guide', slug, 'inline-tankan'),
      ],
      sidebar: [
        slot('tankan-reading-guide', slug, 'sidebar-1'),
      ],
      inlineMobileOnly: false,
    };
  }

  // 1.5. (廃止) essay-data-2026 + M1「データ駆動戦略」は 2026-05-18 撤回済み

  // 1.6. 受験期 guide 系ハブ（直前対策 / 試験ガイド索引）→ 完全パック + R8 予想 強 CTA。
  //     これらは group:guide のため従来 resolvePlacement が EMPTY に落ち、/links フォールバック
  //     (keyword 限定) も発火せず "無導線" だった。予想・直前需要が実際に着地する高トラフィック
  //     ハブなので明示配線する（2026-06-06: GA4 で last-minute-2026 / exam-index への
  //     予想・直前意図の流入を確認。r8-essay-keyword-forecast hub も最終ステップとして
  //     last-minute-2026 へ送客している）。
  if (
    slug === 'pe-comprehensive-management-last-minute-2026' ||
    slug === 'pe-comprehensive-management-exam-index'
  ) {
    return {
      inline: [
        slot(NEW_MAGAZINES.completePack, slug, 'inline-1'),
        slot(NEW_MAGAZINES.r8Forecast, slug, 'inline-2'),
      ],
      sidebar: [slot(NEW_MAGAZINES.r8Forecast, slug, 'sidebar-1')],
      inlineMobileOnly: false,
    };
  }

  // 1.7. 技術士 建設部門 2次: 必須科目I・道路 過去問 + 論文ガイド → 該当 BK 模範解答集（公開時に発火）
  const peEssayMag = matchPeConstructionEssay(slug);
  if (peEssayMag) {
    return {
      inline: [slot(peEssayMag, slug, 'inline-1')],
      sidebar: [slot(peEssayMag, slug, 'sidebar-1')],
      inlineMobileOnly: false,
    };
  }

  // 2. pattern-essay-{persona} → 該当ペルソナ模範論文マガジン (ハブ、強 CTA)
  const patternMag = matchPatternEssay(slug);
  if (patternMag) {
    return {
      inline: [
        slot(patternMag, slug, 'inline-1'),
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
      ],
      sidebar: [slot(NEW_MAGAZINES.r8Forecast, slug, 'sidebar-1')],
      inlineMobileOnly: false,
    };
  }

  // 2.5. r8-essay-theme-{topic} → R8 予想問題 spoke (固定 3 ペルソナ縦串学習、強 CTA)
  //     設計: spoke は固定 3 ペルソナ (ゼネコン/河川コンサル/自治体 道路担当) を縦串展開し、
  //     M3「R8 予想問題集」を主配置する。
  //     （M4「3D マトリクス」副配置は 2026-06-01 企画中止により削除）
  //     真実源: content-principles.md §21 + noteコンテンツ計画.md Red Line #8
  if (/^pe-comprehensive-management-r8-essay-theme-[a-z0-9-]+$/.test(slug)) {
    return {
      inline: [
        slot(NEW_MAGAZINES.r8Forecast, slug, 'inline-1'),
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

  // 4. r0X-secondary (年度別 記述式問題ページ) → ペルソナ導線は記事内 <PersonaSelector> に一本化。
  //    記事外は非重複の横断CTA（R07のみ R8予想問題集 → 完全パック → コアパック）+ 精読サイドバー。
  //    旧実装は ALL_PERSONA_MAGAZINES を記事下に全列挙していたが、記事内 PersonaSelector（厳選3）と
  //    二重表示（記事下=公開済14ペルソナ）になり過剰だったため 2026-06-16 撤去（ユーザー判断:
  //    「解答ペルソナ導線は記事内のシンプルリンクに統一」）。ペルソナ単品 CTA は記事内 PersonaSelector が担う。
  const secondaryMatch = slug.match(/^pe-comprehensive-management-r(0[1-9])-secondary$/);
  if (secondaryMatch) {
    const isR07 = secondaryMatch[1] === '07';
    const inline: PlacementSlot[] = [
      slot(NEW_MAGAZINES.completePack, slug, 'inline-1'),
      slot(NEW_MAGAZINES.corePack, slug, 'inline-2'),
    ];
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

  // 4.7. course-selection-guide（独学か講座か 選び方） → 完全パック + 精読ガイド
  //      「穴を埋めるなら note の完成答案集から」のメッセージと整合させた配線（2026-06-11）。
  if (slug === 'pe-comprehensive-management-course-selection-guide') {
    return {
      inline: [
        slot(NEW_MAGAZINES.completePack, slug, 'inline-1'),
        slot('tankan-reading-guide', slug, 'inline-2'),
      ],
      sidebar: [
        slot(NEW_MAGAZINES.completePack, slug, 'sidebar-1'),
        slot('tankan-reading-guide', slug, 'sidebar-2'),
      ],
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
    if (isHub) {
      // 受験期最大の入口（GA4 トップ）。精読ガイド（文脈一致）を軸に据えつつ、完全パック +
      // R8 予想を加えて予想・直前需要も拾う。sidebar は sidebarImageUrl を持つ R8 予想 + 精読ガイド。
      return {
        inline: [
          slot(NEW_MAGAZINES.completePack, slug, 'inline-1'),
          slot(NEW_MAGAZINES.r8Forecast, slug, 'inline-2'),
          slot('tankan-reading-guide', slug, 'inline-3'),
        ],
        sidebar: [
          slot(NEW_MAGAZINES.r8Forecast, slug, 'sidebar-1'),
          slot('tankan-reading-guide', slug, 'sidebar-2'),
        ],
        inlineMobileOnly: false,
      };
    }
    return {
      inline: [slot('tankan-reading-guide', slug, 'inline-mobile')],
      sidebar: [],
      inlineMobileOnly: true,
    };
  }

  // 7. 2級土木 施工経験記述 → 2マガジン（過去問年度別 / テーマ別完成答案集）。
  //    年度別ページ(r0X)は過去問が主、guide/examples は完成答案集が主。
  //    published: false の間は getMagazine が null を返し CTA 非表示（防御的）。
  //    （予想問題集 civil-2-yosou-essay は 2026-06-02 退役。環境対策のみ完成答案集へ昇格）
  if (/^civil-construction-2-secondary-r0[1-9]$/.test(slug)) {
    return {
      inline: [
        slot('civil-2-pastexam-essay', slug, 'inline-1'),
        slot('civil-2-experience-essay', slug, 'inline-2'),
        slot('civil-membership-lab', slug, 'inline-3'),
      ],
      sidebar: [slot('civil-2-pastexam-essay', slug, 'sidebar-1')],
      inlineMobileOnly: false,
    };
  }
  if (/^civil-construction-2-secondary-experience-writing-(guide|examples)$/.test(slug)) {
    return {
      inline: [
        slot('civil-2-experience-essay', slug, 'inline-1'),
        slot('civil-2-pastexam-essay', slug, 'inline-2'),
        slot('civil-membership-lab', slug, 'inline-3'),
      ],
      sidebar: [slot('civil-2-experience-essay', slug, 'sidebar-1')],
      inlineMobileOnly: false,
    };
  }

  // 8. 1級土木 施工経験記述 → 3マガジン（過去問年度別＋テーマ別5管理＋2テーマ組合せ大全）。
  //    年度別ページ(r0X)は過去問(pastexam)が年度一致で主、テーマ別(experience)・組合せ大全(combo)が副。
  //    guide/examples はテーマ別が主、過去問・組合せ大全が副。published: false の間は CTA 非表示。
  //    （予想問題集 civil-1-yosou-essay は 2026-06-02 退役、combo へ置換）
  if (/^civil-construction-1-secondary-r0[1-9]$/.test(slug)) {
    return {
      inline: [
        slot('civil-1-pastexam-essay', slug, 'inline-1'),
        slot('civil-1-experience-essay', slug, 'inline-2'),
        slot('civil-1-combo-essay', slug, 'inline-3'),
        slot('civil-membership-lab', slug, 'inline-4'),
      ],
      sidebar: [slot('civil-1-pastexam-essay', slug, 'sidebar-1')],
      inlineMobileOnly: false,
    };
  }
  if (/^civil-construction-1-secondary-experience-writing-(guide|examples)$/.test(slug)) {
    return {
      inline: [
        slot('civil-1-experience-essay', slug, 'inline-1'),
        slot('civil-1-pastexam-essay', slug, 'inline-2'),
        slot('civil-1-combo-essay', slug, 'inline-3'),
        slot('civil-membership-lab', slug, 'inline-4'),
      ],
      sidebar: [slot('civil-1-experience-essay', slug, 'sidebar-1')],
      inlineMobileOnly: false,
    };
  }

  // 8.5. 1級土木 secondary テーマ別残余（basics / past-problems 等）→ 3マガジン
  //      secondary-r0X / experience-writing 以外の secondary ページ（分野別）をカバー。
  if (docGroup === 'secondary' && slug.startsWith('civil-construction-1-')) {
    return {
      inline: [
        slot('civil-1-pastexam-essay', slug, 'inline-1'),
        slot('civil-1-experience-essay', slug, 'inline-2'),
        slot('civil-1-combo-essay', slug, 'inline-3'),
        slot('civil-membership-lab', slug, 'inline-4'),
      ],
      sidebar: [slot('civil-1-experience-essay', slug, 'sidebar-1')],
      inlineMobileOnly: false,
    };
  }

  // 10. 1級土木 guide（試験概要・学習法・戦略等の検索着地ページ）→ 3マガジン + 会員 強 CTA
  if (docGroup === 'guide' && slug.startsWith('civil-construction-1-')) {
    return {
      inline: [
        slot('civil-1-experience-essay', slug, 'inline-1'),
        slot('civil-1-pastexam-essay', slug, 'inline-2'),
        slot('civil-1-combo-essay', slug, 'inline-3'),
        slot('civil-membership-lab', slug, 'inline-4'),
      ],
      sidebar: [slot('civil-1-experience-essay', slug, 'sidebar-1')],
      inlineMobileOnly: false,
    };
  }

  // 11. 2級土木 guide（試験概要・学習法・戦略等の検索着地ページ）→ 2マガジン + 会員 強 CTA
  if (docGroup === 'guide' && slug.startsWith('civil-construction-2-')) {
    return {
      inline: [
        slot('civil-2-experience-essay', slug, 'inline-1'),
        slot('civil-2-pastexam-essay', slug, 'inline-2'),
        slot('civil-membership-lab', slug, 'inline-3'),
      ],
      sidebar: [slot('civil-2-experience-essay', slug, 'sidebar-1')],
      inlineMobileOnly: false,
    };
  }

  // 12. 1級土木 textbook → sidebar のみ軽め CTA（テキスト学習者に二次検定への橋渡し）
  if (docGroup === 'textbook' && slug.startsWith('civil-construction-1-')) {
    return {
      inline: [slot('civil-1-experience-essay', slug, 'inline-mobile')],
      sidebar: [slot('civil-1-experience-essay', slug, 'sidebar-1')],
      inlineMobileOnly: true,
    };
  }

  // 13. 1級土木 primary（一次過去問）→ sidebar のみ軽め CTA（一次合格後に二次を意識させる）
  if (docGroup === 'primary' && slug.startsWith('civil-construction-1-')) {
    return {
      inline: [slot('civil-1-experience-essay', slug, 'inline-mobile')],
      sidebar: [slot('civil-1-experience-essay', slug, 'sidebar-1')],
      inlineMobileOnly: true,
    };
  }

  // 14. 2級土木 primary（一次過去問）→ sidebar のみ軽め CTA
  if (docGroup === 'primary' && slug.startsWith('civil-construction-2-')) {
    return {
      inline: [slot('civil-2-experience-essay', slug, 'inline-mobile')],
      sidebar: [slot('civil-2-experience-essay', slug, 'sidebar-1')],
      inlineMobileOnly: true,
    };
  }

  // 9. コンクリート主任技師 小論文 → 小論文 模範答案集マガジン。
  //    小論文対策ガイド(guide-essay)が最も整合する送客元。published: false の間は
  //    getMagazine が null を返し CTA 非表示（防御的）。
  if (slug === 'concrete-chief-engineer-guide-essay') {
    return {
      inline: [slot('cce-essay-magazine', slug, 'inline-1')],
      sidebar: [slot('cce-essay-magazine', slug, 'sidebar-1')],
      inlineMobileOnly: false,
    };
  }

  return EMPTY;
}

/**
 * カテゴリ ランディング（/category/{slug}）に出す note マガジン配置。
 *
 * docs ページ（resolvePlacement）と異なり、カテゴリ hub は試験単位の広い入口なので
 * 「その試験の旗艦商品」を文脈一致 CTA として並べる。表示の最終可否は呼び出し側で
 * getMagazine() が公開判定（published + noteUrl）する（未公開は防御的に非表示）。
 *
 * 2026-06-06 新設: GA4 で /category/pe-comprehensive-management が全体 2 位の高流入
 * ながら収益導線ゼロだったため、カテゴリ hub にも CTA を張る。
 */
const CATEGORY_MAGAZINES: Partial<Record<string, readonly MagazineId[]>> = {
  "pe-comprehensive-management": ["essay-complete-pack", "essay-core-pack", "tankan-reading-guide"],
  "civil-construction-1": ["civil-1-experience-essay", "civil-1-pastexam-essay", "civil-membership-lab"],
  "civil-construction-2": ["civil-2-experience-essay", "civil-2-pastexam-essay", "civil-membership-lab"],
  "concrete-chief-engineer": ["cce-essay-magazine"],
  "concrete-diagnostician": ["cd-essay-magazine"],
};

export function resolveCategoryMagazines(category: string): PlacementSlot[] {
  const ids = CATEGORY_MAGAZINES[category] ?? [];
  return ids.map((magazineId, i) => ({
    magazineId,
    utmContent: `category-${category}-${i + 1}`,
  }));
}
