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
  // 記事冒頭（本文 prose の前）に出す 1 行テキスト CTA。二次系の高 intent ページのみ設定する。
  // 末尾の画像カード（inline）と重複してよい（形が違い・記事が長いため）。未設定＝冒頭 CTA なし。
  readonly top?: PlacementSlot;
}

const EMPTY: ResolvedPlacement = { inline: [], sidebar: [] };

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
 * 1級・2級土木 guide ページの journey stage 分類（2026-07-01 再設計）。
 * 検索着地の guide を「一次/学習の上流」「二次隣接（直前）」「career/転職」で出し分けるための集合。
 * bare slug（civil-construction-{1,2}- 接頭辞を除いた部分）で判定する。両級で共通の suffix を使う。
 * - EXAM_PREP: 一次・学習法・試験概要・分野別要点＝早期読者。低コミットの会員（伴走）を lead に、
 *   ¥9,800 完全攻略パック等のハード二次商品は demote（早期読者に二次を正面売りは低転換）。
 * - SECONDARY_ADJACENT: 直前対策＝二次購入 intent が立つ。旗艦パック led を維持（civil-1 のみ実在）。
 * - それ以外（career/年収/転職/比較）: note 二次 CTA を出さない（本文 <CareerAffiliate> ＋ サイドバー
 *   転職枠 resolveDocsCareerSidebarAd が転職導線を担う。memory affiliate-career-only 準拠）。
 */
const CIVIL_EXAM_PREP_GUIDES: ReadonlySet<string> = new Set([
  'guide-strategy',
  'guide-exam-overview',
  'guide-overview',
  'guide-study-plan',
  'guide-study-method',
  'guide-difficulty',
  'guide-four-management',
  'guide-quality-management',
  'guide-schedule-management',
  'guide-law-key-points',
  'guide-earthwork-key-points',
  'guide-concrete-key-points',
  'guide-concrete-maintenance',
  'guide-textbooks',
  // 「重要ポイント」試験系シリーズの配線漏れ是正（2026-07-04）。土工/コンクリ/法規/品質/工程は
  // 既に入っていたが、施工計画・基礎工・安全管理・測量・建設機械・環境保全が欠落し CTA ゼロだった。
  'guide-construction-plan',            // 1級 施工計画の重要ポイント
  'guide-foundation',                   // 1級 基礎工の重要ポイント
  'guide-safety-management',            // 1級・2級 安全管理の重要ポイント（bare 共有）
  'guide-surveying',                    // 1級 測量の重要ポイント
  'guide-machinery',                    // 1級 建設機械の重要ポイント
  'guide-environment-management',       // 1級 環境保全管理の重要ポイント
  'guide-foundation-key-points',        // 2級 基礎工の重要ポイント
  'guide-construction-plan-key-points', // 2級 施工計画の重要ポイント
  'keyword-2026',                       // 1級 全分野キーワード索引（GA4 上位着地）
  'guide-1-vs-2',                       // 1級と2級の違い（受験選択＝guide-difficulty と同枠）
]);

const CIVIL_SECONDARY_ADJACENT_GUIDES: ReadonlySet<string> = new Set([
  'guide-last-minute-2026',
]);

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
    // sidebar は精読ガイドを据える（記事末尾の footer 集約時に inline と dedup 統合される）。
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
    };
  }

  // 1.65. 建設部門 コンピテンシー改訂（令和8年度〜）→ 必須科目I 模範解答集。
  //       W33 レビューで note CTA ゼロと判明（115 users・全ページ 8 位）。改訂の影響を答案で
  //       確かめる面なので、論文ガイド（pe-secondary-essay-guide）と同じ必須科目I へ送る。
  //       本文 4,443 字 / h2 8 で MidCta の下限（h2>=5 かつ 8,000 字）に届かないため top で出す。
  if (slug === 'pe-construction-competency-revision-r8') {
    return {
      top: slot('pe-construction-required-magazine', slug, 'top'),
      inline: [],
      sidebar: [],
    };
  }

  // 1.7. 技術士 建設部門 2次: 必須科目I・道路 過去問 + 論文ガイド → 該当 BK 模範解答集（公開時に発火）
  const peEssayMag = matchPeConstructionEssay(slug);
  if (peEssayMag) {
    return {
      inline: [slot(peEssayMag, slug, 'inline-1')],
      sidebar: [slot(peEssayMag, slug, 'sidebar-1')],
    };
  }

  // 4.2. 総監 択一（過去問1次 r0X-primary / h2X-primary 全 18 本）→ 年代一致の「択一 過去問PDF」。
  //      2026-08-17: 全 18 本が EMPTY に落ちて note CTA ゼロだった。とくに r08-primary は
  //      GA4 全ページ 1 位（481 users・W33 レビュー）でありながら、文脈が完全一致する
  //      択一 過去問PDF ¥980（令和/平成）が published:true のまま **placement から一度も
  //      参照されていない孤立マガジン**になっていた。
  //      **top（冒頭 CTA）で出す**: inline は MidCta の供給源だが、その midEligibleGroup は
  //      guide/pillar/textbook/civil-secondary 限定で pastExam を含まない（page.tsx）。
  //      よって inline を足しても描画されない（concrete 2 件で 2026-07/08 に判明した構造と同じ）。
  const takuitsuMatch = slug.match(/^pe-comprehensive-management-(r0[1-9]|h(?:2[1-9]|30))-primary$/);
  if (takuitsuMatch) {
    const isReiwa = takuitsuMatch[1]!.startsWith('r');
    return {
      top: slot(isReiwa ? 'tankan-takuitsu-reiwa-pdf' : 'tankan-takuitsu-heisei-pdf', slug, 'top'),
      inline: [],
      sidebar: [],
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
    };
  }

  // 3. r0X-essay-{persona} 個別年度ペルソナ記事 → 該当ペルソナマガジン (個別記事、sidebar 主体)
  const personaMag = matchPersonaEssay(slug);
  if (personaMag) {
    return {
      inline: [slot(personaMag, slug, 'inline')],
      sidebar: [slot(personaMag, slug, 'sidebar')],
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
    };
  }

  // 5. pillar → 精読ガイド単独 CTA（M1 撤回 2026-05-18 でエントリー CTA は精読ガイドに一本化）
  if (docGroup === 'pillar') {
    return {
      inline: [slot('tankan-reading-guide', slug, 'inline-1')],
      sidebar: [slot('tankan-reading-guide', slug, 'sidebar')],
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
      // R8 予想を加えて予想・直前需要も拾う。sidebar は R8 予想 + 精読ガイド。
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
      };
    }
    return {
      inline: [slot('tankan-reading-guide', slug, 'inline-mobile')],
      sidebar: [],
    };
  }

  // 7. 2級土木 施工経験記述 → 2マガジン（過去問年度別 / テーマ別完成答案集）。
  //    年度別ページ(r0X)は過去問が主、guide/examples は完成答案集が主。
  //    published: false の間は getMagazine が null を返し CTA 非表示（防御的）。
  //    （予想問題集 civil-2-yosou-essay は 2026-06-02 退役。環境対策のみ完成答案集へ昇格）
  if (/^civil-construction-2-secondary-r0[1-9]$/.test(slug)) {
    return {
      top: slot('civil-2-koji-bank', slug, 'top'),
      inline: [
        slot('civil-membership-lab', slug, 'inline-1'), // 本文中間 CTA = 会員（合格ラボ）
        slot('civil-2-koji-bank', slug, 'inline-2'),
        slot('civil-2-gakka-kijutsu', slug, 'inline-3'), // 学科記述（問題2〜9）
        slot('civil-2-anki-note', slug, 'inline-4'), // 直前暗記ノート
        slot('civil-2-pastexam-essay', slug, 'inline-5'),
        slot('civil-2-experience-essay', slug, 'inline-6'),
      ],
      sidebar: [slot('civil-2-koji-bank', slug, 'sidebar-1')],
    };
  }
  if (/^civil-construction-2-secondary-experience-writing-(guide|examples)$/.test(slug)) {
    return {
      top: slot('civil-2-koji-bank', slug, 'top'),
      inline: [
        slot('civil-membership-lab', slug, 'inline-1'), // 本文中間 CTA = 会員（合格ラボ）
        slot('civil-2-koji-bank', slug, 'inline-2'),
        slot('civil-2-experience-essay', slug, 'inline-3'),
        slot('civil-2-pastexam-essay', slug, 'inline-4'),
      ],
      sidebar: [slot('civil-2-koji-bank', slug, 'sidebar-1')],
    };
  }
  // 7.5. 2級 二次ブリッジ磁石（二次の始め方）→ 二次ラインの面を提示（経験記述の柱＋完成答案集＋学科＋暗記＋会員）。
  //      top-of-funnel の入口記事。civil-2 は catch-all が無いため明示ブランチが必要（2026-07-04 新設）。
  if (slug === 'civil-construction-2-secondary-getting-started') {
    return {
      top: slot('civil-2-koji-bank', slug, 'top'),
      inline: [
        slot('civil-membership-lab', slug, 'inline-1'), // 本文中間 CTA = 会員（合格ラボ）
        slot('civil-2-koji-bank', slug, 'inline-2'),
        slot('civil-2-experience-essay', slug, 'inline-3'),
        slot('civil-2-gakka-kijutsu', slug, 'inline-4'),
        slot('civil-2-anki-note', slug, 'inline-5'),
      ],
      sidebar: [slot('civil-2-koji-bank', slug, 'sidebar-1')],
    };
  }

  // 8. 1級土木 施工経験記述 → 旗艦（完全攻略パック・最上位）＋ 3マガジン（過去問年度別＋テーマ別5管理＋2テーマ組合せ大全）。
  //    旗艦 civil-1-keiken-complete-pack は landingUrl（無料の想定工事100索引）へ着地させる front-door。
  //    年度別ページ(r0X)は過去問(pastexam)が年度一致で主、テーマ別(experience)・組合せ大全(combo)が副。
  //    guide/examples はテーマ別が主、過去問・組合せ大全が副。published: false の間は CTA 非表示。
  //    （予想問題集 civil-1-yosou-essay は 2026-06-02 退役、combo へ置換）
  if (/^civil-construction-1-secondary-r0[1-9]$/.test(slug)) {
    return {
      top: slot('civil-1-niji-marugoto-pack', slug, 'top'),
      inline: [
        slot('civil-membership-lab', slug, 'inline-1'), // 本文中間 CTA = 会員（合格ラボ）
        slot('civil-1-r8-bunseki', slug, 'inline-2'), // 出題分析・直前重点（入口）→ 下位で上位商品へ
        slot('civil-1-niji-marugoto-pack', slug, 'inline-3'), // 二次まるごと（経験+学科+暗記の最上位バンドル）
        slot('civil-1-keiken-complete-pack', slug, 'inline-4'),
        slot('civil-1-gakka-kijutsu', slug, 'inline-5'), // 学科記述（問題2〜11）
        slot('civil-1-pastexam-essay', slug, 'inline-6'),
        slot('civil-1-experience-essay', slug, 'inline-7'),
        slot('civil-1-combo-essay', slug, 'inline-8'),
      ],
      sidebar: [slot('civil-1-pastexam-essay', slug, 'sidebar-1')],
    };
  }
  if (/^civil-construction-1-secondary-experience-writing-(guide|examples)$/.test(slug)) {
    return {
      top: slot('civil-1-keiken-complete-pack', slug, 'top'),
      inline: [
        slot('civil-membership-lab', slug, 'inline-1'), // 本文中間 CTA = 会員（合格ラボ）
        slot('civil-1-keiken-complete-pack', slug, 'inline-2'),
        slot('civil-1-niji-marugoto-pack', slug, 'inline-3'), // 経験+学科+暗記の二次まるごと（upsell）
        slot('civil-1-experience-essay', slug, 'inline-4'),
        slot('civil-1-pastexam-essay', slug, 'inline-5'),
        slot('civil-1-combo-essay', slug, 'inline-6'),
      ],
      sidebar: [slot('civil-1-experience-essay', slug, 'sidebar-1')],
    };
  }

  // 8.4. 1級土木 二次ブリッジ磁石（一次合格 → 二次の始め方）→ 会員（伴走・低コミット）を lead に。
  //      一次合格発表 2026-08-13（公式 jctc.jp で確認）直後に着地する top-of-funnel 面で、
  //      本文の主張は「最初の一歩は経験記述の題材を1つ決める」。8.5 の catch-all に落ちると
  //      top が学科記述になり**本文と CTA が食い違う**ため明示分岐する（2級は 7.5 で分岐済み）。
  //      会員は完成答案ライブラリを内包し「自分の工種を探せる」＝この地点の需要に最も近い
  //      （noteコンテンツ計画.md §1.4／2026-07-01 のライブラリ内包転換）。旗艦 ¥9,800 は次点。
  if (slug === 'civil-construction-1-secondary-getting-started') {
    return {
      top: slot('civil-membership-lab', slug, 'top'),
      inline: [
        slot('civil-membership-lab', slug, 'inline-1'),
        slot('civil-1-keiken-complete-pack', slug, 'inline-2'),
        slot('civil-1-gakka-kijutsu', slug, 'inline-3'),
        slot('civil-1-anki-note', slug, 'inline-4'),
      ],
      sidebar: [],
    };
  }

  // 8.5. 1級土木 secondary テーマ別残余（basics / past-problems 等）→ 3マガジン
  //      secondary-r0X / experience-writing 以外の secondary ページ（分野別）をカバー。
  if (docGroup === 'secondary' && slug.startsWith('civil-construction-1-')) {
    // past-problems 等の分野別二次ページは学科記述（問題2〜11）と直結 → 学科記述セット・暗記を上位に。
    return {
      top: slot('civil-1-gakka-kijutsu', slug, 'top'),
      inline: [
        slot('civil-membership-lab', slug, 'inline-1'), // 本文中間 CTA = 会員（合格ラボ）
        slot('civil-1-gakka-kijutsu', slug, 'inline-2'), // 学科記述 テーマ別出る順
        slot('civil-1-r8-bunseki', slug, 'inline-3'), // 出題分析・直前重点（入口）
        slot('civil-1-niji-marugoto-pack', slug, 'inline-4'), // 二次まるごと
        slot('civil-1-anki-note', slug, 'inline-5'), // 直前暗記ノート
        slot('civil-1-keiken-complete-pack', slug, 'inline-6'),
        slot('civil-1-pastexam-essay', slug, 'inline-7'),
      ],
      sidebar: [slot('civil-1-gakka-kijutsu', slug, 'sidebar-1')],
    };
  }

  // 10/11. 1級・2級土木 guide（検索着地）→ journey stage で出し分け（2026-07-01 再設計）。
  //   注（2026-07 統一）: 記事末尾の個別マガジンタイルは廃止し、末尾＋サイドバーは資格別「もくじタイル」
  //   （resolveHubCta）に一本化した。placement.inline は記事内 中間 CTA（MidCta）の note 供給源＝
  //   先頭 1 誌としてのみ生きる。top（二次系の冒頭 CTA）はそのまま。ここでは「どの商品を・どの順で」
  //   中間 CTA に出すかを journey stage で決める（sidebar 別出しはしない）。
  //   - 一次/学習系（EXAM_PREP）: 早期読者。低コミットの会員「土木セコカン合格ラボ」（伴走・月¥1,480〜）を
  //     lead に据え、¥9,800 完全攻略パック等のハード二次商品は demote。会員は published:false の間
  //     getMagazine が null → 防御スキップし launch で自動発火（wire-ahead）。launch 前の live は
  //     完成答案集（¥2,480/¥1,980）が soft lead、パックは demote 表示。
  //   - 二次隣接（SECONDARY_ADJACENT＝直前対策）: 二次購入 intent が立つ高 intent 面。旗艦パック led＋会員。
  //   - career/年収/転職・比較（residual）: note 二次 CTA を出さない（EMPTY）。本文 <CareerAffiliate> と
  //     サイドバー転職枠（resolveDocsCareerSidebarAd）が転職導線を担う。二次経験記述¥9,800 を「辞めたい/
  //     年収」読者に正面売りは二重ミスマッチ（2026-07-01 是正・memory affiliate-career-only 準拠）。
  if (
    docGroup === 'guide' &&
    (slug.startsWith('civil-construction-1-') || slug.startsWith('civil-construction-2-'))
  ) {
    const isCivil1 = slug.startsWith('civil-construction-1-');
    const bare = slug.replace(/^civil-construction-[12]-/, '');
    if (CIVIL_EXAM_PREP_GUIDES.has(bare)) {
      const soft: MagazineId = isCivil1 ? 'civil-1-experience-essay' : 'civil-2-experience-essay';
      const flagship: MagazineId = isCivil1 ? 'civil-1-keiken-complete-pack' : 'civil-2-koji-bank';
      return {
        inline: [
          slot('civil-membership-lab', slug, 'inline-1'),
          slot(soft, slug, 'inline-2'),
          slot(flagship, slug, 'inline-3'),
        ],
        sidebar: [],
      };
    }
    if (isCivil1 && CIVIL_SECONDARY_ADJACENT_GUIDES.has(bare)) {
      // 直前対策（civil-1 のみ実在）: 二次まるごと旗艦 led ＋ 直前暗記 ＋ 学科記述 ＋ 会員伴走。
      return {
        top: slot('civil-1-niji-marugoto-pack', slug, 'top'),
        inline: [
          slot('civil-membership-lab', slug, 'inline-1'), // 本文中間 CTA = 会員（合格ラボ）
          slot('civil-1-niji-marugoto-pack', slug, 'inline-2'), // 経験+学科+暗記の最上位バンドル
          slot('civil-1-anki-note', slug, 'inline-3'), // 直前暗記ノート（赤シートPDF付）
          slot('civil-1-gakka-kijutsu', slug, 'inline-4'), // 学科記述 テーマ別出る順
          slot('civil-1-keiken-complete-pack', slug, 'inline-5'),
        ],
        sidebar: [],
      };
    }
    // career/年収/転職・比較系 residual → note 二次 CTA なし（転職導線が担う）
    return EMPTY;
  }

  // 12. 1級土木 textbook（一次テキスト学習）→ 会員（伴走）lead＋完成答案集の軽め CTA（2026-07-01）。
  //     一次学習中の上流読者なので、二次単品より低コミットの伴走会員へ回遊（会員は launch で自動発火・
  //     launch 前は完成答案集が live）。
  if (docGroup === 'textbook' && slug.startsWith('civil-construction-1-')) {
    return {
      inline: [
        slot('civil-membership-lab', slug, 'inline-1'),
        slot('civil-1-experience-essay', slug, 'inline-2'),
      ],
      sidebar: [],
    };
  }

  // 13. 1級土木 primary（一次過去問）→ 一次「出る順 合格ノート」lead＋会員（伴走）＋完成答案集（一次演習中の直結商品）
  if (docGroup === 'primary' && slug.startsWith('civil-construction-1-')) {
    return {
      inline: [
        slot('civil-1-ichiji-ronten', slug, 'inline-1'), // 一次の出る順ノート（一次演習中に直結）
        slot('civil-membership-lab', slug, 'inline-2'),
        slot('civil-1-experience-essay', slug, 'inline-3'),
      ],
      sidebar: [],
    };
  }

  // 14. 2級土木 primary（一次過去問）→ 会員（伴走）lead＋完成答案集の軽め CTA
  if (docGroup === 'primary' && slug.startsWith('civil-construction-2-')) {
    return {
      inline: [
        slot('civil-membership-lab', slug, 'inline-1'),
        slot('civil-2-experience-essay', slug, 'inline-2'),
      ],
      sidebar: [],
    };
  }

  // 9. コンクリート主任技士 小論文 → 小論文 模範答案集マガジン。
  //    小論文対策ガイド(guide-essay)が最も整合する送客元。published: false の間は
  //    getMagazine が null を返し CTA 非表示（防御的）。
  //    2026-08-13: マガジン公開後にライブ実査したところ **CTA が 1 つも出ていなかった**。
  //    診断士で 2026-07-31 に判明したのと同じ構造（下の 10 番のコメント参照）＝
  //    sidebar は CTA 統一以降どこからも参照されない死に配線、concrete 系は非 HUB で
  //    もくじタイルも出ない。本記事は 15,533 字 / h2 6 で inline の条件自体は満たすが、
  //    それでも出なかったため確実に出る **top（冒頭 CTA）** を追加した（診断士と同じ形）。
  if (slug === 'concrete-chief-engineer-guide-essay') {
    return {
      top: slot('cce-essay-magazine', slug, 'top'),
      inline: [slot('cce-essay-magazine', slug, 'inline-1')],
      sidebar: [],
    };
  }

  // 10. コンクリート診断士 記述式 → 記述式 模範答案集マガジン。
  //     送客元は「記述式の書き方を知りたい人が必ず通る面」に絞る。
  //     - guide-essay: 記述式対策ガイド（最も整合）
  //     - textbook-assessment / textbook-repair: 問題B の答案で中核になる
  //       「評価・予測」と「対策の選定」の解説。読者が答案の書き方を求める地点
  //     2026-07-31: マガジン公開時に「配線はあるのに CTA が 1 つも出ない」ことが判明した。
  //     inline は中間 CTA 経由（h2>=5 かつ本文 8,000 字が条件）だが診断士は最長 7,364 字で
  //     届かず、sidebar は 2026-07 の CTA 統一以降どこからも参照されていない（死に配線）。
  //     concrete 系は非 HUB 資格でもくじタイルも出ない。よって **top（冒頭 CTA）で出す**。
  //     textbook 2 本は本文の文脈に紐付けたいので MDX 内 <MagazineCard> が担う（top は置かない）。
  if (slug === 'concrete-diagnostician-guide-essay') {
    return {
      top: slot('cd-essay-magazine', slug, 'top'),
      inline: [slot('cd-essay-magazine', slug, 'inline-1')],
      sidebar: [],
    };
  }

  return EMPTY;
}

// カテゴリ hub（/category/{slug}）の note CTA は、上位数誌の直リンク列（旧 CATEGORY_MAGAZINES /
// resolveCategoryMagazines）を廃し、資格別リッチ背景×HTML文字＋もくじ集約の resolveHubCta
// （src/lib/hub-cta.ts）へ一本化した（2026-07-06）。旧「季節モード」（resolveSeasonalHubMagazine/
// SEASONAL_HUB）は 2026-07-05 に resolveHubCta へ置き換えて撤去済み。
