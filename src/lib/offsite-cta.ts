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
// RULES は上から最初にマッチした1件のみ採用（find）。パターンは相互排他に保つ。
const RULES: readonly OffsiteRule[] = [
  {
    // 施工経験記述（1級）: 読者が自分の工事で答案を書く高 intent ページ。人の添削/診断が最も刺さる。
    // 2026-09-25: coconala-tensaku-set は級別化で examScope が civil-1 専用になったため、
    // 1級/2級で別ルールに分割（旧: 単一ルールで両級に同じ1級専用サービスを出していた）。
    test: /^civil-construction-1-secondary-experience-writing-(guide|examples)$/,
    coconala: ['coconala-shindan', 'coconala-tensaku-set'],
    coconalaCatch: '自分の答案を1本、プロの視点で見てほしい方へ。',
  },
  {
    // 施工経験記述（2級）: 2級版の添削サービスは新設（coconala-2kyu-tensaku・2026-09-25）が
    // status:'draft'（未出品）のため、出品するまで listed フィルタで自動的に非表示のまま。
    test: /^civil-construction-2-secondary-experience-writing-(guide|examples)$/,
    coconala: ['coconala-shindan', 'coconala-2kyu-tensaku'],
    coconalaCatch: '自分の答案を1本、プロの視点で見てほしい方へ。',
  },
  {
    // 1級 二次 年度別過去問（secondary-r03〜r09）: 経験記述 過去問模範答案＋学科記述攻略が刺さる。
    test: /^civil-construction-1-secondary-r0[3-9]$/,
    // 2026-08-05 統廃合: 過去問模範答案・学科攻略の単品は停止（paused）→ 模範答案セット＋フルパックへ。
    coconala: ['coconala-kanseitoan-pdf', 'coconala-1kyu-full-pdf'],
    coconalaCatch: '過去問の模範答案で仕上げたい方へ（模範答案セット・全部入りパック PDF）。',
  },
  {
    // 2級 二次 年度別過去問。
    test: /^civil-construction-2-secondary-r0[3-9]$/,
    coconala: ['coconala-2kyu-kanseitoan-pdf', 'coconala-2kyu-full-pdf'],
    coconalaCatch: '過去問の模範答案で仕上げたい方へ（模範答案セット・全部入りパック PDF）。',
  },
  {
    // 1級 二次 学科記述の分野別ページ（コンクリート/施工計画/土工/品質の basics・past-problems）。
    test: /^civil-construction-1-secondary-(concrete|construction-plan|earthwork|quality-management)-(basics|past-problems)$/,
    coconala: ['coconala-1kyu-full-pdf'],
    coconalaCatch: '学科記述の攻略PDF入り 全部入りパックで仕上げたい方へ。',
  },
  {
    // 1級 二次 入門・直前対策: 予想模試＋出題分析（直前重点）が刺さる。
    test: /^civil-construction-1-(secondary-getting-started|guide-last-minute-2026)$/,
    coconala: ['coconala-1kyu-moshi-pdf', 'coconala-1kyu-full-pdf'],
    coconalaCatch: '直前の総仕上げに（予想模試・全部入りパック PDF）。',
  },
  {
    // 2級 二次 入門（直前対策 guide は 2級には無いため getting-started のみ）。
    test: /^civil-construction-2-secondary-getting-started$/,
    coconala: ['coconala-2kyu-moshi-pdf', 'coconala-2kyu-full-pdf'],
    coconalaCatch: '直前の総仕上げに（予想模試・全部入りパック PDF）。',
  },
  {
    // 総監 記述系（模範論文解説 essay-* / pattern-essay-* / 二次過去問 h2X・r0X-secondary）:
    // 出題テーマの読み方（ココナラ分析 PDF）。
    test: /^pe-comprehensive-management-(essay-|pattern-essay-|(?:h\d{2}|r\d{2})-secondary$)/,
    coconala: ['coconala-sokan-bunseki-pdf'],
    coconalaCatch: '出題テーマの読み方を押さえたい方へ（出題分析 PDF）。',
  },
];

/**
 * 記事 slug に対して出す外部チャネル CTA を解決する。
 * 非対象ページ・未 listed の商品は空配列（＝非表示）。
 */
export function resolveOffsiteCta(slug: string): OffsiteCtaItem[] {
  const rule = RULES.find((r) => r.test.test(slug));
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
