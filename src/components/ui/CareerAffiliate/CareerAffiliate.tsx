import { Check } from "lucide-react";
import type { CareerNeed } from "@/config/career-pathways";
import type { ResolvedPlacement } from "@/lib/affiliate-placement";
import {
  AFFILIATE_LINK_REFERRER_POLICY,
  AFFILIATE_LINK_REL,
  AffiliateCta,
  AffiliatePrBadge,
  TrackingPixel,
} from "@/components/ui/AffiliateParts";

interface CareerAffiliateProps {
  /** サービス名（例: "RSG建設転職"） */
  readonly service: string;
  /** カテゴリ・職種ラベル（例: "施工管理 転職エージェント"） */
  readonly category: string;
  /** 補足説明（任意） */
  readonly description?: string;
  /**
   * 本文中の転職枠の印（任意）。指定すると案件・リンク・文言は配置ルール（config/affiliate-placements.json）の解決結果
   * `inlineCard` で決め、MDX の service/description/points/cta は使わない（表示コピーと遷移先を常に一致させる＝景表法）。
   * `"gks"` は歴史的な名前で GKS 案件を指さない（MDX 202 か所を書き換えずに残すための別名）。新しく書くときは `"career"`。
   * ルールの無いカテゴリでは描画しない（黙って別の案件に倒さない）。
   */
  readonly program?: "career" | "gks";
  /** 配置ルールで解決した、この面に出す案件（DocPage・診断ツールが渡す）。program 指定時だけ使う */
  readonly inlineCard?: ResolvedPlacement | null | undefined;
  /** アフィリエイトリンク URL（`program` 指定時は省略可） */
  readonly href?: string;
  /** バナー画像 URL（任意。無い場合はテキスト主体カードで描画） */
  readonly imageSrc?: string;
  /**
   * 計測ピクセルの完全 URL（任意）。
   * ASP ごとに配信ドメインが異なる（A8 は www10〜www29、ValueCommerce / アクセストレード等は別）ため、
   * ドメインをハードコードせず、発行された 1x1 ピクセル URL をそのまま渡す。
   */
  readonly trackingPixelUrl?: string;
  /** 訴求ポイントの箇条書き（任意、最大 3 件目安）。転職サービスの強み訴求に使う */
  readonly points?: readonly string[];
  /** CTA ボタンテキスト（デフォルト「無料で相談する」） */
  readonly cta?: string;
  /** GA4 の表示位置。MDX 直書きは article-inline、記事末は呼び出し側で article-end。 */
  readonly placement?: string;
  /**
   * 掲載記事の slug（任意）。悩み別 CTA（career-pathways.ts）の解決に使う。
   * MDX 本文からは書かず、docs ページ側が components map で自動注入する。
   */
  readonly slug?: string | undefined;
  /**
   * 悩み（任意）。slug を持たない面（診断ツール等）で CTA 文言を決めるために直接渡す。
   * 指定すると slug からの解決より優先する。
   */
  readonly need?: CareerNeed | null | undefined;
  /**
   * 強調表示（任意）。本文フローに置くとき、白背景のままだと本文カードに溶け込んで
   * 見落とされるため、アクセント地色（`--accent-fill`・dark 定義あり）を敷く。
   * 旧 MidArticleCta の career テキスト CTA が使っていた地色と同じ。
   * MDX 直書き（168 箇所）は既定 false のまま＝見た目を変えない。
   */
  readonly emphasis?: boolean;
}

/**
 * CareerAffiliate — 建設・施工管理の転職サービスのアフィリエイトリンクを統一カードで表示する。
 *
 * doboku-note で唯一稼働しているアフィリエイト（講座/教材/添削・書籍は完全廃止）。転職案件向けの仕様:
 * - `trackingPixelUrl` を完全 URL で受け取り、ASP（A8 / ValueCommerce / アクセストレード / レントラックス等）の
 *   配信ドメイン差を吸収する
 * - `points` で「年収 UP 率」「求人数」などの訴求ポイントを箇条書き表示できる
 * - `imageSrc` を任意にし、バナーが無い案件でもテキスト主体カードで描画できる
 *
 * ステマ規制（2023-10〜）対応のため「PR」バッジを必ず表示。
 * rel="nofollow sponsored noopener" / target="_blank" は自動付与。
 *
 * 配置原則: 記事末・hub 末の CTA、年収/キャリア文脈の Callout 内。
 * ファーストビュー禁止（「ここだけで合格できる」メイン導線と矛盾するため）。
 */
export default function CareerAffiliate({
  service,
  category,
  description,
  program,
  href,
  imageSrc,
  trackingPixelUrl,
  points,
  cta = "無料で相談する",
  placement = "article-inline",
  slug,
  need,
  emphasis = false,
  inlineCard,
}: CareerAffiliateProps) {
  // 本文中の転職枠（program 指定）: 案件と文言は配置ルールの解決結果で決める。ルールが無ければ出さない。
  // href のみ＝計測ピクセルなし（1 ページ 1 ピクセルの発火源は DocPage が決める）。
  if (program && !inlineCard) return null;
  const ruled = program && inlineCard ? inlineCard.card(slug, need) : null;
  const effService = ruled?.service ?? service;
  const effCategory = ruled?.category ?? category;
  const effDescription = ruled?.description ?? description;
  const effPoints = ruled?.points ?? points;
  const effCta = ruled?.cta ?? cta;
  const resolvedHref = ruled?.href ?? href;
  return (
    <div className="not-prose my-6">
      <a
        href={resolvedHref}
        rel={AFFILIATE_LINK_REL}
        referrerPolicy={AFFILIATE_LINK_REFERRER_POLICY}
        target="_blank"
        data-cta="affiliate"
        data-cta-label={effService}
        data-cta-placement={placement}
        className={`card-surface-content focus-ring group relative flex flex-col sm:flex-row items-stretch gap-4 p-4 hover:shadow-card-hover hover:border-brand dark:hover:border-brand transition-shadow${
          emphasis ? ' border-l-4 border-l-brand bg-(--accent-fill) dark:border-l-brand' : ''
        }`}
        style={{ textDecoration: "none" }}
      >
        <AffiliatePrBadge className="absolute right-3 top-3" />

        {imageSrc && (
          <div className="flex shrink-0 items-center justify-center sm:w-40 w-full">
            <img
              src={imageSrc}
              alt={`${effService} ${effCategory}`}
              loading="lazy"
              className="max-h-32 sm:max-h-28 w-auto object-contain"
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col justify-center pr-10 sm:pr-12">
          <div className="text-[11px] font-bold tracking-wider text-brand-deep dark:text-brand uppercase">
            {effCategory}
          </div>
          <div className="mt-0.5 text-[15px] font-bold text-ink-strong group-hover:underline">
            {effService}
          </div>
          {effDescription && (
            <div className="mt-1.5 text-sm leading-6 text-ink-body">
              {effDescription}
            </div>
          )}
          {effPoints && effPoints.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1">
              {effPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-1.5 text-sm leading-6 text-ink-body"
                >
                  <Check
                    className="mt-1 h-3.5 w-3.5 shrink-0 text-brand"
                    aria-hidden
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          )}
          <AffiliateCta>{effCta}</AffiliateCta>
        </div>
      </a>

      <TrackingPixel src={trackingPixelUrl} />
    </div>
  );
}
