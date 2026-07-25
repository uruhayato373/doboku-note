import { Check } from "lucide-react";
import {
  CIVIL_CAREER_AD,
  resolveCareerArticleEndCard,
} from "@/config/affiliate-creatives";
import {
  AFFILIATE_LINK_REL,
  AffiliateCta,
  AffiliatePrBadge,
  TrackingPixel,
} from "@/components/ui/AffiliateParts";

/**
 * プリセット案件の href を SSOT（affiliate-creatives.ts）から解決するための対応表。
 * MDX 本文では `href` に mat を直書きせず `program="gks"` を指定する（mat 変更時の
 * 全 MDX 置換を回避＝1 箇所変更で全インラインに反映）。
 *
 * 注意: `program="gks"` は「施工管理/建設の inline 転職枠」を表す**期間連動プリセット**で、
 * 現在は GKS 単体を指さない。campaign 期間（〜2026-08-31）はビルドジョブ（成果 ¥50,000）、
 * 9/1 以降は GKS（¥25,000）へ href・コピーごと自動で切り替わる（`resolveCareerArticleEndCard`
 * と同一 period 境界・ビルド時 SSG 確定）。この preset 指定時、MDX の service/description/points/cta は
 * resolver の文言で上書きされ無視される（景表法: 表示コピーと遷移先サービスを常に一致させるため）。
 * 真実源: docs/project/04_運営/02_アフィリエイト提携状況.md。
 */
const CAREER_PRESETS = {
  gks: CIVIL_CAREER_AD.href,
} as const;

interface CareerAffiliateProps {
  /** サービス名（例: "RSG建設転職"） */
  readonly service: string;
  /** カテゴリ・職種ラベル（例: "施工管理 転職エージェント"） */
  readonly category: string;
  /** 補足説明（任意） */
  readonly description?: string;
  /**
   * プリセット案件キー（任意）。指定すると `href` を SSOT から解決し、MDX に mat を直書きしない。
   * 現状 `gks`（CIVIL_CAREER_AD）のみ。`href` と併用時は `href` を優先。
   */
  readonly program?: keyof typeof CAREER_PRESETS;
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
}: CareerAffiliateProps) {
  // 期間連動プリセット（program="gks"）: 施工管理/建設の inline 転職枠を、記事末モバイルカードと
  // 同じ period 解決（resolveCareerArticleEndCard）で href・コピーごと出し分ける。
  // 〜2026-08-31 はビルドジョブ（¥50,000）／9/1 以降は GKS（¥25,000）に自動復帰。
  // この preset では MDX の service/description/points/cta は resolver の文言で統一する
  // （景表法: 表示コピーと遷移先サービスを常に一致させる）。href のみ＝計測ピクセルなし
  // （インプレッション計測はサイドバー側の 1 発火を唯一の源として維持＝1 ページ 1 ピクセル）。
  const campaignAware = program === "gks" ? resolveCareerArticleEndCard() : null;
  const effService = campaignAware?.service ?? service;
  const effCategory = campaignAware?.category ?? category;
  const effDescription = campaignAware?.description ?? description;
  const effPoints = campaignAware?.points ?? points;
  const effCta = campaignAware?.cta ?? cta;
  const resolvedHref =
    campaignAware?.href ?? href ?? (program ? CAREER_PRESETS[program] : undefined);
  return (
    <div className="not-prose my-6">
      <a
        href={resolvedHref}
        rel={AFFILIATE_LINK_REL}
        target="_blank"
        data-cta="affiliate"
        data-cta-label={effService}
        data-cta-placement={placement}
        className="card-surface-content focus-ring group relative flex flex-col sm:flex-row items-stretch gap-4 p-4 hover:shadow-card-hover hover:border-brand dark:hover:border-brand transition-shadow"
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
