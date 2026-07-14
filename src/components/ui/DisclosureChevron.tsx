interface DisclosureChevronProps {
  /** ラッパー span に付与するクラス（サイズ・色・回転は使用側で指定）。 */
  readonly className?: string | undefined;
}

/**
 * アコーディオン（`<details>`）開閉用の細線シェブロン（右向き ›）。
 * サイトのアコーディオン開閉アイコンの単一実装。閉=右向き、開くと 90°回転で下向きにする。
 *
 * 回転は固定クラス `.disclosure-chevron` に対する globals.css の素の CSS で行う。
 * ※ Tailwind の transform 系（`rotate-90` 合成・`[transform:...]` arbitrary variant）は本 build で
 *   それぞれ「--tw-rotate リセットに潰れる／JIT がクラスを拾えずルール未生成」で効かないため。
 *   再利用可能な見た目を globals.css に集約する既存方針（.card-interactive 等）に一貫させる。
 * 色は `currentColor` を継承（使用側の text-* で決める）。lucide 系の細線規約に合わせる。
 * MDX 記事内 details（prose）の CSS `::before` も同一 path をマスクで使う（path の真実源はここ）。
 */
export default function DisclosureChevron({ className }: DisclosureChevronProps) {
  return (
    <span
      aria-hidden="true"
      className={`disclosure-chevron inline-flex shrink-0 items-center justify-center${className ? ` ${className}` : ''}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 3.5 10.5 8 6 12.5" />
      </svg>
    </span>
  );
}
