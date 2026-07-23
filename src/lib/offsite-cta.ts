/**
 * 記事 slug → ココナラ / Brain（外部チャネル）CTA のマッピング (Single Source of Truth)
 *
 * note 有料マガジンの magazine-placement.ts と直交する「外部チャネル導線」の SoT。
 * 設計方針:
 * - **高適合ページに限定**して出す（全記事に撒かない）。対象は土木二次（経験記述／年度別過去問／学科記述／
 *   直前対策）と総監 記述系。1ページ最大 3 枚に抑える（クロップ防止）。1級/2級は slug prefix で PDF を出し分け。
 * - 表示の最終可否は coconala-services.ts / brain-products.ts の status='listed' で決まる
 *   （listed 以外は自動非表示＝出品前の wire-ahead）。ここでは「どのページに何を出すか」だけを定義する。
 * - 外部 URL に UTM は付けない（計測が外部で完結しパラメータが無駄に露出するため。links-hub.md と同方針）。
 *   クリック計測は data-cta="coconala"|"brain" で AnalyticsProvider が拾う。
 */
import { listedCoconalaServices } from './coconala-services';
import { listedBrainProducts } from './brain-products';

export type OffsiteChannel = 'coconala' | 'brain';

export interface OffsiteCtaItem {
  readonly channel: OffsiteChannel;
  readonly href: string;
  readonly shortTitle: string;
  readonly price: string;
  /** 文脈連動の1行コピー（なぜこの記事の読者に効くか） */
  readonly catch: string;
  /** GA4 の data-cta-label */
  readonly trackLabel: string;
}

interface OffsiteRule {
  readonly test: RegExp;
  readonly coconala?: readonly string[];
  readonly brain?: readonly string[];
  readonly coconalaCatch?: string;
  readonly brainCatch?: string;
}

// slug は category prefix 付きの完全形（例: civil-construction-1-secondary-experience-writing-guide）。
// RULES は上から最初にマッチした1件のみ採用（find）。パターンは相互排他に保つ。
const RULES: readonly OffsiteRule[] = [
  {
    // 施工経験記述（1級・2級）: 読者が自分の工事で答案を書く高 intent ページ。人の添削/診断が最も刺さる。
    test: /^civil-construction-[12]-secondary-experience-writing-(guide|examples)$/,
    coconala: ['coconala-shindan', 'coconala-tensaku-set'],
    brain: ['brain-civil-essay-kit'],
    coconalaCatch: '自分の答案を1本、プロの視点で見てほしい方へ。',
    brainCatch: '自分の工事経験から答案を自作したい方へ（Claude Code キット）。',
  },
  {
    // 1級 二次 年度別過去問（secondary-r03〜r09）: 経験記述 過去問模範答案＋学科記述攻略が刺さる。
    test: /^civil-construction-1-secondary-r0[3-9]$/,
    coconala: ['coconala-1kyu-kakomon-pdf', 'coconala-1kyu-gakka-pdf'],
    coconalaCatch: '年度別に過去問を仕上げたい方へ（模範答案・学科攻略 PDF）。',
  },
  {
    // 2級 二次 年度別過去問。
    test: /^civil-construction-2-secondary-r0[3-9]$/,
    coconala: ['coconala-2kyu-kakomon-pdf', 'coconala-2kyu-gakka-pdf'],
    coconalaCatch: '年度別に過去問を仕上げたい方へ（模範答案・学科攻略 PDF）。',
  },
  {
    // 1級 二次 学科記述の分野別ページ（コンクリート/施工計画/土工/品質の basics・past-problems）。
    test: /^civil-construction-1-secondary-(concrete|construction-plan|earthwork|quality-management)-(basics|past-problems)$/,
    coconala: ['coconala-1kyu-gakka-pdf'],
    coconalaCatch: '学科記述を出る順で仕上げたい方へ（攻略 PDF）。',
  },
  {
    // 1級 二次 入門・直前対策: 予想模試＋出題分析（直前重点）が刺さる。
    test: /^civil-construction-1-(secondary-getting-started|guide-last-minute-2026)$/,
    coconala: ['coconala-1kyu-moshi-pdf', 'coconala-bunseki-pdf'],
    coconalaCatch: '直前の総仕上げに（予想模試・出題分析 PDF）。',
  },
  {
    // 2級 二次 入門（直前対策 guide は 2級には無いため getting-started のみ）。
    test: /^civil-construction-2-secondary-getting-started$/,
    coconala: ['coconala-2kyu-moshi-pdf'],
    coconalaCatch: '直前の総仕上げに（予想模試 PDF）。',
  },
  {
    // 総監 記述系（模範論文解説 essay-* / pattern-essay-* / 二次過去問 h2X・r0X-secondary）:
    // 設問3の国家施策の備蓄（Brain）＋出題テーマの読み方（ココナラ分析 PDF）。
    test: /^pe-comprehensive-management-(essay-|pattern-essay-|(?:h\d{2}|r\d{2})-secondary$)/,
    coconala: ['coconala-sokan-bunseki-pdf'],
    brain: ['brain-sokan-policy-bank'],
    coconalaCatch: '出題テーマの読み方を押さえたい方へ（出題分析 PDF）。',
    brainCatch: '設問3の国家施策を根拠つきで備蓄したい方へ（Claude Code キット）。',
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
        href: svc.serviceUrl,
        shortTitle: svc.shortTitle,
        price: svc.price,
        catch: rule.coconalaCatch ?? '',
        trackLabel: `offsite-${id}`,
      });
    }
  }

  if (rule.brain?.length) {
    const listed = listedBrainProducts();
    for (const id of rule.brain) {
      const p = listed.find((x) => x.id === id);
      if (!p) continue;
      items.push({
        channel: 'brain',
        href: p.productUrl,
        shortTitle: p.shortTitle,
        price: p.price,
        catch: rule.brainCatch ?? '',
        trackLabel: `offsite-${id}`,
      });
    }
  }

  return items;
}
