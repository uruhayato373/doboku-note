interface MagazineTopBannerProps {
  readonly url: string;
  /** マガジンの短縮タイトル（shortTitle） */
  readonly title: string;
  /** 価格文字列（例: "¥2,480"）。マガジンにより未設定のことがある。 */
  readonly price?: string | undefined;
  /** 種別バッジ（例: "note 限定" / "メンバーシップ"） */
  readonly badge: string;
  /** GA4 クリック計測ラベル（通常は utm_content）。AnalyticsProvider のデリゲートが拾う。 */
  readonly trackLabel?: string;
}

/**
 * MagazineTopBanner — 記事冒頭（本文 prose の前）に置くコンパクトな 1 行テキスト CTA。
 *
 * 末尾のブランドタイル（NoteMagazineTile / MagazineInlineCard）とは別物の軽量型。
 * 二次系の高 intent ページのみ resolvePlacement().top で設定され、記事が長いため冒頭にも
 * 到達導線を 1 本置く。冒頭=テキスト1行・末尾=画像カードで形が異なり重複感を避ける。
 * 表示可否は呼び出し側で getMagazine()（published + noteUrl）ゲートを通す（未公開は非表示）。
 */
export default function MagazineTopBanner({
  url,
  title,
  price,
  badge,
  trackLabel,
}: MagazineTopBannerProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-cta="note"
      data-cta-label={trackLabel}
      className="not-prose group mb-8 flex items-center gap-2.5 rounded-card-content border border-[var(--rule-soft)] bg-[var(--paper)] px-4 py-2.5 shadow-card-content hover:border-brand dark:hover:border-brand transition-shadow"
    >
      <span className="shrink-0 rounded-sm bg-brand px-1.5 py-0.5 text-[10px] font-medium text-white">
        {badge}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] sm:text-[14px] font-bold text-ink-strong group-hover:text-brand-deep dark:group-hover:text-brand transition-colors">
        {title}
      </span>
      {price && (
        <span className="shrink-0 text-[13px] sm:text-[14px] font-bold text-ink-strong">
          {price}
        </span>
      )}
      <span className="shrink-0 text-brand-deep dark:text-brand" aria-hidden="true">
        &rarr;
      </span>
    </a>
  );
}
