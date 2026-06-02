interface DokugakuBannerProps {
  /**
   * 計測ピクセル（1x1）を描画するか。
   * 1ページに複数枚並べる場合、最初の1枚だけ true にして
   * 同一 mat のインプレッション二重計測を防ぐ（1ページ1ピクセル）。
   */
  readonly withPixel?: boolean;
}

/**
 * DokugakuBanner — 独学サポート（1級土木施工管理技士・A8.net）の 468×60 横長バナーを
 * 記事本文の途中に差し込むためのインライン ディスプレイ広告コンポーネント。
 *
 * creative（mat 4B3VR8+FAQ04A+4ASS+691UP）はこのコンポーネントに集約（真実源）。
 * mat 変更時はここ1箇所のみ編集すればよい。
 * creative 情報の台帳: docs/project/04_運営/02_アフィリエイト提携状況.md
 *
 * ステマ規制（2023-10〜）対応のため「PR」バッジを必ず表示。
 * rel="nofollow sponsored noopener" / target="_blank" は自動付与。
 * width / height（468×60）を指定し CLS を防止、loading="lazy" でファーストビュー外の負荷を抑える。
 * モバイル（<468px）では max-w-full + h-auto で原比率のまま縮小。
 *
 * 配置原則: 記事本文の途中（セクション境界）。ファーストビュー禁止。
 * 1ページに複数配置可。計測ピクセルは先頭の1枚（withPixel）のみが発火する。
 */
const CREATIVE = {
  href: "https://px.a8.net/svt/ejp?a8mat=4B3VR8+FAQ04A+4ASS+691UP",
  imageSrc:
    "https://www23.a8.net/svt/bgt?aid=260521604925&wid=002&eno=01&mid=s00000020062001050000&mc=1",
  pixelSrc: "https://www16.a8.net/0.gif?a8mat=4B3VR8+FAQ04A+4ASS+691UP",
  alt: "独学サポート 1級土木施工管理技士 受験対策講座",
  width: 468,
  height: 60,
} as const;

export default function DokugakuBanner({ withPixel = false }: DokugakuBannerProps) {
  return (
    <div className="not-prose my-6 flex flex-col items-center">
      <div className="relative inline-block max-w-full overflow-hidden rounded-card-content border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 shadow-card-content">
        <span
          className="absolute right-2 top-2 z-10 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white"
          style={{ background: "var(--color-ink-muted)" }}
          aria-label="広告"
        >
          PR
        </span>
        <a
          href={CREATIVE.href}
          rel="nofollow sponsored noopener"
          target="_blank"
          className="block"
        >
          <img
            src={CREATIVE.imageSrc}
            alt={CREATIVE.alt}
            width={CREATIVE.width}
            height={CREATIVE.height}
            loading="lazy"
            className="block h-auto max-w-full"
          />
        </a>
      </div>
      {withPixel && (
        <img
          src={CREATIVE.pixelSrc}
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
