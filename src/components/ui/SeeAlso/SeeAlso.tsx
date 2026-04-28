import Link from "next/link";
import { ArrowRight, BookOpenCheck } from "lucide-react";

interface SeeAlsoProps {
  readonly href: string;
  readonly title: string;
  readonly reason?: string;
}

/**
 * SeeAlso — 本文中の内部リンクを「併せて読みたい」カードとして強調するコンポーネント。
 *
 * Callout（1 記事 3 個ルール）から独立した、内部リンク専用の誘導カード。
 * 「ここで深掘りせず、別記事に集約しているもの」を本文中で目立たせる用途。
 *
 * 使い分け:
 * - 本文 inline link: 軽い参照（「詳細は [X] 参照」程度）
 * - SeeAlso: 別ページに論点を切り出していて、回遊を強く促したい時
 * - RelatedKeywords: 末尾の関連キーワード一覧（slate トーン）
 * - LinkCard: 外部 URL（メタデータ自動取得あり）
 *
 * 上限: 1 記事 5 個以内（content-principles 準拠、過剰な装飾を避ける）。
 */
export default function SeeAlso({ href, title, reason }: SeeAlsoProps) {
  return (
    <Link
      href={href}
      className="not-prose group my-5 flex items-start gap-3 rounded-card-content border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3.5 shadow-card-content hover:shadow-card-hover hover:border-brand dark:hover:border-brand transition-shadow"
      style={{ textDecoration: "none" }}
    >
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: "var(--color-brand)" }}
        aria-hidden
      >
        <BookOpenCheck className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold tracking-wider text-brand-deep dark:text-brand uppercase">
          あわせて読みたい
        </div>
        <div className="mt-0.5 text-[15px] font-bold text-ink-strong dark:text-gray-100 group-hover:underline">
          {title}
        </div>
        {reason && (
          <div className="mt-1 text-sm leading-6 text-ink-body dark:text-gray-400">
            {reason}
          </div>
        )}
      </div>

      <ArrowRight
        className="mt-1 h-4 w-4 shrink-0 text-ink-muted group-hover:text-brand transition-colors"
        aria-hidden
      />
    </Link>
  );
}
