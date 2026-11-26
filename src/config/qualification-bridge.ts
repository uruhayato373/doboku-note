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
 *
 * 立場の出し分け（2026-10-21・DN-0810）: 自治体の土木担当シリーズ（タグ 地方公共団体）の記事の読み手はほぼ発注者なので、
 *   施工会社向けの選択肢を外し、技術士（土木公務員が取る意味）を出し、立場のテーマ /topics/municipal-civil-engineers
 *   （資格の記事と総監の自治体ペルソナの教材をまとめたページ）へのリンクを添える（label municipal-hub）。
 */
import { getPublicDocPath } from '@/lib/content-routes';

/** 立場の分岐。GA4 の click label にそのまま使う（値を変えると過去データと連続しない）。 */
type QualificationBridgeKey = 'orderer' | 'contractor' | 'qualification-map' | 'public-pe';

/** 読み手の立場。記事のタグから決める（地方公共団体 → municipal） */
export type QualificationBridgeAudience = 'municipal';

/** 表示面。GA4 の cta_placement に使う。 */
export type QualificationBridgeSurface = 'practice-footer' | 'standards-chapter-footer' | 'standards-bridge-sidebar';

export interface QualificationBridgeOption {
  readonly key: QualificationBridgeKey;
  /** 読み手の立場（カードでは題名の上の小さな行・右の欄では題名） */
  readonly title: string;
  /** 選ぶと何ができるか（カードの題名。2026-11-26 に立場の題名から替えた・表示 1,687 に対しクリック 8） */
  readonly headline: string;
  readonly reason: string;
  /** 行き先のガイドの資格（写真サムネイルを引くのに使う） */
  readonly category: string;
  readonly slug: string;
}

const QUALIFICATION_BRIDGE_OPTIONS: readonly QualificationBridgeOption[] = [
  {
    key: 'orderer',
    title: '発注者として工事監督・検査をしている',
    headline: '監督・検査の経験で、1級土木を受ける',
    category: 'civil-construction-1',
    reason:
      '発注工事の施工を指導・監督した経験は、1級土木の実務経験の対象になります（要件は個別に確認）。取る意味と経験の棚卸しへ。',
    slug: 'civil-construction-1-public-servant-merit',
  },
  {
    key: 'contractor',
    title: '施工会社で現場を担当している',
    headline: '19歳から、1級土木の第一次検定を受ける',
    category: 'civil-construction-1',
    reason: '1級土木の第一次検定は、年度末に満19歳以上なら実務経験を問わず受検できます。試験の全体像へ。',
    slug: 'civil-construction-1-guide-exam-overview',
  },
  {
    key: 'qualification-map',
    title: 'どの資格から取るか迷っている',
    headline: '1級土木・技術士・RCCMを、業務で比べる',
    category: 'pe-comprehensive-management',
    reason: '1級土木・技術士・RCCM を、担当業務と取得順で比べます。',
    slug: 'pe-comprehensive-management-public-engineer-qualification-map',
  },
];

/** 自治体の土木担当シリーズで施工会社向けの選択肢と入れ替える選択肢 */
const MUNICIPAL_OPTION: QualificationBridgeOption = {
  key: 'public-pe',
  title: '技術士を目指したい',
  headline: '土木公務員が技術士を取る意味を知る',
  category: 'pe-construction',
  reason: '技術士（建設部門）を土木公務員が取る意味と、受験で気をつけることへ。',
  slug: 'pe-construction-public-servant-merit',
};

/** 立場のテーマ（自治体の土木職）。カードの選択肢の下に 1 行で添える */
export const MUNICIPAL_HUB = { href: '/topics/municipal-civil-engineers', label: '自治体の土木職の記事・資格・教材をまとめて見る' } as const;

/** 実務記事のうち、橋渡しカードを出さない slug（civil-practice- 接頭辞なし）。空＝全記事に出す。 */
const PRACTICE_EXCLUDED = new Set<string>();

export function shouldShowQualificationBridge(category: string | undefined, slug: string): boolean {
  if (category !== 'civil-practice') return false;
  return !PRACTICE_EXCLUDED.has(slug.replace(/^civil-practice-/, ''));
}

export function resolveQualificationBridge(audience?: QualificationBridgeAudience): Array<QualificationBridgeOption & { href: string }> {
  const options = audience === 'municipal'
    ? QUALIFICATION_BRIDGE_OPTIONS.map((option) => (option.key === 'contractor' ? MUNICIPAL_OPTION : option))
    : QUALIFICATION_BRIDGE_OPTIONS;
  return options.map((option) => ({ ...option, href: getPublicDocPath(option.slug) }));
}
