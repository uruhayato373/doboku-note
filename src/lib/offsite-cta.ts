/**
 * 記事 slug → ココナラ（外部チャネル）CTA のマッピング (Single Source of Truth)
 *
 * note 有料マガジンの magazine-placement.ts と直交する「外部チャネル導線」の SoT。
 * 設計方針:
 * - **高適合ページに限定**して出す（全記事に撒かない）。対象は土木二次（経験記述／年度別過去問／学科記述／
 *   直前対策）と総監 記述系。1ページ最大 3 枚に抑える（クロップ防止）。1級/2級は slug prefix で PDF を出し分け。
 * - 表示の最終可否は coconala-services.ts の status='listed' で決まる
 *   （listed 以外は自動非表示＝出品前の wire-ahead）。ここでは「どのページに何を出すか」だけを定義する。
 * - 外部 URL に UTM は付けない（計測が外部で完結しパラメータが無駄に露出するため。links-hub.md と同方針）。
 *   クリック計測は data-cta="coconala" で AnalyticsProvider が拾う。
 * - ココナラは A8 の商品リンク（coconalaAffiliateHref・会員登録 ¥100）経由で出す（2026-09-24〜）。
 *   affiliate=true の項目は描画側で PR 表記・rel=sponsored・計測ピクセル（1 ページ 1 発）を付ける。
 */
import { listedCoconalaServices } from './coconala-services';
import { coconalaAffiliateHref } from '@/config/affiliate-creatives';

export type OffsiteChannel = 'coconala';

export interface OffsiteCtaItem {
  readonly channel: OffsiteChannel;
  readonly href: string;
  readonly shortTitle: string;
  readonly price: string;
  /** 文脈連動の1行コピー（なぜこの記事の読者に効くか） */
  readonly catch: string;
  /** GA4 の data-cta-label */
  readonly trackLabel: string;
  /** A8 経由のアフィリリンクか（PR 表記・rel=sponsored・計測ピクセルの対象） */
  readonly affiliate: boolean;
}

interface OffsiteRule {
  readonly test: RegExp;
  readonly coconala?: readonly string[];
  readonly coconalaCatch?: string;
}

// slug は category prefix 付きの完全形（例: civil-construction-1-secondary-experience-writing-guide）。
// OFFSITE_RULES は上から最初にマッチした1件のみ採用（find）。パターンは相互排他に保つ。
// 2026-09-30: 出品中（listed）の 6 件を配線。旧ルールは恒久廃止（retired）3件と試験後まで一時休止の出品だけを指し、
// 主任技士のルールも無かったため、2級・主任技士のページにココナラ導線が 1 枚も出ていなかった。retired を指すルールは tests/offsite-cta.test.mjs が落とす。
// 試験後まで一時休止（pauseReason:'absence'）の PDF はルールに残し、復帰したら自動で出す。総監 記述系は分析 PDF が retired でルールごと外した。
// coconala-2kyu-tensaku（absence）は 3 テーマ版と同じ添削なので載せない（復帰時に添削が 2 枚並ぶ）。
const OFFSITE_RULES: readonly OffsiteRule[] = [
  {
    // 施工経験記述（1級）: 読者が自分の工事で答案を書く高 intent ページ。人の添削と骨子からの指導が最も刺さる。
    test: /^civil-construction-1-secondary-experience-writing-(guide|examples)$/,
    coconala: ['coconala-tensaku-4theme', 'coconala-sakusei-4theme'],
    coconalaCatch: '10/4の本試験前に、全5テーマの答案を24時間で見てほしい方へ。',
  },
  {
    // 施工経験記述（2級）。
    test: /^civil-construction-2-secondary-experience-writing-(guide|examples|by-theme)$/,
    coconala: ['coconala-2kyu-tensaku-3theme', 'coconala-2kyu-sakusei-3theme'],
    coconalaCatch: '10/25の本試験前に、全3テーマの答案を24時間で見てほしい方へ。',
  },
  {
    // 1級 二次 年度別過去問（secondary-r03〜r09）: 模範答案を読んだあとに自分の答案を見てもらう。
    test: /^civil-construction-1-secondary-r0[3-9]$/,
    coconala: ['coconala-tensaku-4theme', 'coconala-sakusei-4theme', 'coconala-1kyu-full-pdf'],
    coconalaCatch: '過去問の模範答案を読んだら、次は自分の答案を見てもらう番です。',
  },
  {
    // 2級 二次 年度別過去問。
    test: /^civil-construction-2-secondary-r0[3-9]$/,
    coconala: ['coconala-2kyu-tensaku-3theme', 'coconala-2kyu-sakusei-3theme', 'coconala-2kyu-full-pdf'],
    coconalaCatch: '過去問の模範答案を読んだら、次は自分の答案を見てもらう番です。',
  },
  {
    // 1級 二次 学科記述の分野別ページ。フルパック PDF は試験後まで一時休止（absence）で、復帰すれば出る。
    test: /^civil-construction-1-secondary-(concrete|construction-plan|earthwork|quality-management)-(basics|past-problems)$/,
    coconala: ['coconala-1kyu-full-pdf'],
    coconalaCatch: '学科記述の攻略PDF入り 全部入りパックで仕上げたい方へ。',
  },
  {
    // 1級 二次 入門・直前対策。
    test: /^civil-construction-1-(secondary-getting-started|guide-last-minute-2026)$/,
    coconala: ['coconala-tensaku-4theme', 'coconala-sakusei-4theme', 'coconala-1kyu-moshi-pdf'],
    coconalaCatch: '直前の総仕上げに、自分の答案を24時間で見てもらう。',
  },
  {
    // 2級 二次 入門・直前2週間。
    test: /^civil-construction-2-secondary-(getting-started|last-two-weeks-plan)$/,
    coconala: ['coconala-2kyu-tensaku-3theme', 'coconala-2kyu-sakusei-3theme', 'coconala-2kyu-moshi-pdf'],
    coconalaCatch: '直前の総仕上げに、自分の答案を24時間で見てもらう。',
  },
  {
    // 資格トップ（カテゴリ hub・slug はカテゴリ名そのもの）。SNS から着地する入口（2026-09-27 配線監査 DN-0364）。
    test: /^civil-construction-1$/,
    coconala: ['coconala-tensaku-4theme', 'coconala-sakusei-4theme'],
    coconalaCatch: '自分の答案を見てほしい方・まだ書けていない方へ。',
  },
  {
    test: /^civil-construction-2$/,
    coconala: ['coconala-2kyu-tensaku-3theme', 'coconala-2kyu-sakusei-3theme'],
    coconalaCatch: '自分の答案を見てほしい方・まだ書けていない方へ。',
  },
  {
    // 施工経験記述 文字数チェッカー（/tools/keiken-charcount）。答案を書いている最中の人が来る。
    test: /^tools-keiken-charcount$/,
    coconala: ['coconala-tensaku-4theme', 'coconala-2kyu-tensaku-3theme'],
    coconalaCatch: '字数が収まったら、次は中身。自分の答案を見てほしい方へ。',
  },
  {
    // コンクリート主任技士: 資格トップと小論文ガイド。小論文の添削とまとめ買いの完全パック。
    test: /^concrete-chief-engineer(-guide-essay)?$/,
    coconala: ['coconala-cce-essay-tensaku', 'coconala-cce-full-pdf'],
    coconalaCatch: '小論文を人の目で確かめたい方・まとめて仕上げたい方へ。',
  },
];

/**
 * 記事 slug に対して出す外部チャネル CTA を解決する。
 * 非対象ページ・未 listed の商品は空配列（＝非表示）。
 */
export function resolveOffsiteCta(slug: string): OffsiteCtaItem[] {
  const rule = OFFSITE_RULES.find((r) => r.test.test(slug));
  if (!rule) return [];
  const items: OffsiteCtaItem[] = [];

  if (rule.coconala?.length) {
    const listed = listedCoconalaServices();
    for (const id of rule.coconala) {
      const svc = listed.find((s) => s.id === id);
      if (!svc) continue;
      items.push({
        channel: 'coconala',
        href: coconalaAffiliateHref(svc.serviceUrl),
        shortTitle: svc.shortTitle,
        price: svc.price,
        catch: rule.coconalaCatch ?? '',
        trackLabel: `offsite-${id}`,
        affiliate: true,
      });
    }
  }

  return items;
}
