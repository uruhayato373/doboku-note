/**
 * qualification-bridge.ts — 非受験層（実務記事・共通仕様書の読者）を資格の入口へつなぐ橋渡しカードの SSOT。
 *
 * なぜ要るか: `/practice/`・`/standards/` の読者は業務の悩みで検索して来ており、資格を意識していない。
 *   実務記事は本文に試験文脈を入れない規約（exam-content-policy「土木施工の実務」）なので、
 *   本文の外（記事末）に 1 枚だけ「いまの業務経験は資格に使える」ことを示し、立場別の入口へ送る。
 *   方針の真実源: docs/strategy/13_土木公務員SEO戦略2026-08.md「非受験層を受験者へ育てる導線」。
 *
 * 計測: カード root の data-cta="qualification-bridge" で表示（qualification_bridge_impression・label=card）、
 *   各リンクの data-cta-label=key でクリック（qualification_bridge_click・label=key）を送る。
 *   GA4 は pagePath を自動付与するので、ページ × 立場（key）× 面（placement）で集計できる。
 *   効果測定は experiments.json の EXP-012。
 *
 * 文言の根拠（誇張しない）:
 *   - orderer: 受検の手引で「発注者として発注工事の施工を指導・監督した経験」は実務経験の対象（要件は個別確認）
 *     → civil-construction-1/public-servant-merit の FAQ と同じ表現に揃える。
 *   - contractor: 令和6年度改正で 1級第一次検定は年度末に満19歳以上なら実務経験を問わず受検可
 *     → civil-construction-1/guide-exam-overview の「受験資格」節と同じ表現に揃える。
 */
import { getPublicDocPath } from '@/lib/content-routes';

/** 立場の分岐。GA4 の click label にそのまま使う（値を変えると過去データと連続しない）。 */
type QualificationBridgeKey = 'orderer' | 'contractor' | 'qualification-map';

/** 表示面。GA4 の cta_placement に使う。 */
export type QualificationBridgeSurface = 'practice-footer' | 'standards-chapter-footer';

export interface QualificationBridgeOption {
  readonly key: QualificationBridgeKey;
  readonly title: string;
  readonly reason: string;
  readonly slug: string;
}

const QUALIFICATION_BRIDGE_OPTIONS: readonly QualificationBridgeOption[] = [
  {
    key: 'orderer',
    title: '発注者として工事監督・検査をしている',
    reason:
      '発注工事の施工を指導・監督した経験は、1級土木の実務経験の対象になります（要件は個別に確認）。取る意味と経験の棚卸しへ。',
    slug: 'civil-construction-1-public-servant-merit',
  },
  {
    key: 'contractor',
    title: '施工会社で現場を担当している',
    reason: '1級土木の第一次検定は、年度末に満19歳以上なら実務経験を問わず受検できます。試験の全体像へ。',
    slug: 'civil-construction-1-guide-exam-overview',
  },
  {
    key: 'qualification-map',
    title: 'どの資格から取るか迷っている',
    reason: '1級土木・技術士・RCCM を、担当業務と取得順で比べます。',
    slug: 'pe-comprehensive-management-public-engineer-qualification-map',
  },
];

/** 実務記事のうち、橋渡しカードを出さない slug（civil-practice- 接頭辞なし）。空＝全記事に出す。 */
const PRACTICE_EXCLUDED = new Set<string>();

export function shouldShowQualificationBridge(category: string | undefined, slug: string): boolean {
  if (category !== 'civil-practice') return false;
  return !PRACTICE_EXCLUDED.has(slug.replace(/^civil-practice-/, ''));
}

export function resolveQualificationBridge(): Array<QualificationBridgeOption & { href: string }> {
  return QUALIFICATION_BRIDGE_OPTIONS.map((option) => ({ ...option, href: getPublicDocPath(option.slug) }));
}
