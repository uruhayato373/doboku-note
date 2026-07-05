import Link from "next/link";
import { ArrowRight, BookmarkPlus } from "lucide-react";

interface SpokeNavCardProps {
  readonly href: string;
  readonly label: string;
  readonly title: string;
}

/**
 * SpokeNavCard — hub-spoke ナビ専用のコンパクトリンクカード。
 *
 * hub ページから個別 spoke (深掘りページ) へ誘導する用途。
 * SeeAlso（1 記事 5 個以内、汎用「あわせて読みたい」）と異なり、
 * テーマセクション末尾に並ぶ「定型ナビゲーション」として個数上限なし。
 *
 * 使い分け:
 * - <SeeAlso>: 文中で 1 件強調誘導 (5 個以内 / 「あわせて読みたい」ラベル + reason)
 * - <SpokeNavCard>: hub のテーマセクション末尾で spoke へのナビ (個数上限なし / label + title のみ)
 * - 本文 inline link: 軽い参照
 *
 * 1 ページに 9 個並ぶこともある（R8 予測 hub の T1-T9 が典型）。
 */
export default function SpokeNavCard({ href, label, title }: SpokeNavCardProps) {
  return (
    <Link
      href={href}
      className="card-interactive not-prose group my-4 flex items-center gap-3 rounded-card-content border border-[var(--rule-soft)] bg-[var(--paper)] px-4 py-3 shadow-card-content hover:shadow-card-hover hover:border-brand"
      style={{ textDecoration: "none" }}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: "var(--color-brand)" }}
        aria-hidden
      >
        <BookmarkPlus className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-[11px] font-bold tracking-wider text-brand-deep dark:text-brand uppercase">
          {label}
        </div>
        <div className="mt-0.5 text-[14px] font-bold text-ink-strong group-hover:underline truncate">
          {title}
        </div>
      </div>

      <ArrowRight
        className="h-4 w-4 shrink-0 text-ink-muted group-hover:text-brand transition-colors"
        aria-hidden
      />
    </Link>
  );
}
