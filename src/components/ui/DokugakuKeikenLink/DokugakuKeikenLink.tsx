interface DokugakuKeikenLinkProps {
  /**
   * 計測ピクセル（1x1）を描画するか。
   * 同一 mat（64RJ6）を 1 ページに複数置く場合、先頭の 1 つだけ true にして
   * インプレッションの二重計測を防ぐ（1 ページ 1 ピクセル）。
   */
  readonly withPixel?: boolean;
}

/**
 * DokugakuKeikenLink — 独学サポート（1級土木 経験記述 添削・A8.net）の
 * 本文中インライン テキストリンク。
 *
 * creative（mat 4B3VR8+FAQ04A+4ASS+64RJ6・pixel www11）はこのコンポーネントに集約（真実源）。
 * MDX 本文では mat を直書きせず `<DokugakuKeikenLink withPixel />` を文中に置く。
 * creative 情報の台帳: docs/project/04_運営/02_アフィリエイト提携状況.md
 *
 * 段落の文中に差し込む純インライン要素（ラップ div を持たない）。
 * rel="nofollow sponsored noopener" / target="_blank" は自動付与。
 * 配置原則: 経験記述の文脈。ファーストビュー禁止。
 */
const CREATIVE = {
  href: "https://px.a8.net/svt/ejp?a8mat=4B3VR8+FAQ04A+4ASS+64RJ6",
  pixelSrc: "https://www11.a8.net/0.gif?a8mat=4B3VR8+FAQ04A+4ASS+64RJ6",
  text: "独学サポートの経験記述 添削",
} as const;

export default function DokugakuKeikenLink({ withPixel = false }: DokugakuKeikenLinkProps) {
  return (
    <>
      <a
        href={CREATIVE.href}
        rel="nofollow sponsored noopener"
        target="_blank"
        className="font-bold text-brand dark:text-brand hover:underline"
      >
        {CREATIVE.text}
      </a>
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
    </>
  );
}
