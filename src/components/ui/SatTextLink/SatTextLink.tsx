import { ArrowRight } from "lucide-react";

interface SatTextLinkProps {
  /**
   * 計測ピクセル（1x1）を描画するか。
   * 同一 mat（5YJRM）の記事末 SchoolCourseCTA が既にピクセルを発火するページ
   * （2級 primary / secondary）では false にして二重計測を防ぐ。
   * 記事末に SAT がないページ（2級 guide）では先頭1枚のみ true にする（1ページ1ピクセル）。
   */
  readonly withPixel?: boolean;
}

/**
 * SatTextLink — SAT eラーニング（現場系国家資格・A8.net）の記事中インライン テキストリンク。
 *
 * creative（mat 4B3RUZ+6Y22UQ+5TRO+5YJRM）はこのコンポーネントに集約（真実源）。
 * 記事末カード SchoolCourseCTA の SCHOOL_SAT と同一 mat（級非依存・eラーニング訴求）。
 * creative 情報の台帳: docs/project/04_運営/02_アフィリエイト提携状況.md
 *
 * 2級土木の本文途中（## セクション境界）に差し込む軽量テキストリンク。
 * ステマ規制（2023-10〜）対応のため「PR」バッジを表示。
 * rel="nofollow sponsored noopener" / target="_blank" は自動付与。
 * 配置原則: 記事本文の途中。ファーストビュー禁止。
 */
const CREATIVE = {
  href: "https://px.a8.net/svt/ejp?a8mat=4B3RUZ+6Y22UQ+5TRO+5YJRM",
  pixelSrc: "https://www15.a8.net/0.gif?a8mat=4B3RUZ+6Y22UQ+5TRO+5YJRM",
  text: "すべての人に最高の教材を【eラーニング現場系・国家資格】",
} as const;

export default function SatTextLink({ withPixel = false }: SatTextLinkProps) {
  return (
    <div className="not-prose my-6">
      <div className="flex items-center gap-2 rounded-card-content border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-4 py-3">
        <span
          className="inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white"
          style={{ background: "var(--color-ink-muted)" }}
          aria-label="広告"
        >
          PR
        </span>
        <a
          href={CREATIVE.href}
          rel="nofollow sponsored noopener"
          target="_blank"
          className="inline-flex items-center gap-1 text-sm font-bold text-brand dark:text-brand hover:underline"
          style={{ textDecoration: "none" }}
        >
          <span>{CREATIVE.text}</span>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
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
