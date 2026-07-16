interface SidebarAdBannerProps {
  readonly href: string;
  readonly imageSrc: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly pixelSrc?: string;
  /** GA4 クリック計測ラベル（例: "GKS" / "SAT"）。AnalyticsProvider のデリゲートリスナーが拾う。 */
  readonly trackLabel?: string;
}

/**
 * SidebarAdBanner — 右サイドバーに表示するアフィリエイト バナー（ディスプレイ枠）。
 *
 * ステマ規制（2023-10〜）対応のため「PR」バッジを必ず表示。
 * rel="nofollow sponsored noopener" / target="_blank" は自動付与。
 * pixelSrc に A8.net の計測ピクセル URL を渡すと 1x1 ピクセルを描画する。
 * （creative ごとに配信ドメインが異なるため、mat ではなく URL を丸ごと受け取る）
 *
 * 配置: docs ページ右サイドバー（デスクトップ ≥993px のみ表示）。
 * width / height は CLS 防止のため必須。
 */
export default function SidebarAdBanner({
  href,
  imageSrc,
  alt,
  width,
  height,
  pixelSrc,
  trackLabel,
}: SidebarAdBannerProps) {
  return (
    // 縦スペーシングは親の責務（docs=div.mb-3 / category サイドバー=space-y-3 / category モバイル=my-10）。
    // 自前の mt を持たせるとサイドバー先頭がメインカードより下がり上端がズレる（2026-07 上端揃え）。
    <div className="not-prose">
      <div className="card-surface-content relative overflow-hidden p-2">
        <span
          className="absolute right-2 top-2 z-10 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white"
          style={{ background: "var(--ink-muted)" }}
          aria-label="広告"
        >
          PR
        </span>
        <a
          href={href}
          rel="nofollow sponsored noopener"
          target="_blank"
          data-cta="affiliate"
          data-cta-label={trackLabel}
          className="block"
        >
          <img
            src={imageSrc}
            alt={alt}
            width={width}
            height={height}
            loading="lazy"
            className="block h-auto w-full"
          />
        </a>
      </div>
      {pixelSrc && (
        <img
          src={pixelSrc}
          width={1}
          height={1}
          alt=""
          aria-hidden
          style={{ position: "absolute", left: "-9999px" }}
          suppressHydrationWarning
        />
      )}
    </div>
  );
}
