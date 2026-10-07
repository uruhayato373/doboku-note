import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export const AFFILIATE_LINK_REL = "nofollow sponsored noopener";

/**
 * 広告リンクだけはクリックしたページの URL を丸ごと ASP へ渡す。
 * サイト既定の Referrer-Policy（public/_headers の strict-origin-when-cross-origin）のままだと
 * ASP にはドメインしか届かず、A8 の成果別レポートの「リファラ」が `https://doboku-note.com/` になって
 * どのページの広告から成果が出たか分からない（2026-10-05 のビルドジョブ 1 件で発生。GA4 もクリックを取りこぼしていた）。
 * ページの URL に個人情報は含まないので、広告リンクに限って緩める。rel と必ず対で付ける（tests/affiliate-link-referrer.test.mjs）。
 */
export const AFFILIATE_LINK_REFERRER_POLICY = "no-referrer-when-downgrade";

export function AffiliatePrBadge({ className = "" }: { readonly className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white ${className}`}
      style={{ background: "var(--ink-muted-fill)" }}
      aria-label="広告"
    >
      PR
    </span>
  );
}

export function AffiliateCta({ children }: { readonly children: ReactNode }) {
  return (
    <div className="mt-2.5 inline-flex items-center gap-1 text-sm font-bold text-brand transition-[gap] group-hover:gap-2 dark:text-brand">
      {children}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </div>
  );
}

export function TrackingPixel({ src }: { readonly src: string | undefined }) {
  if (!src) return null;
  return (
    <img
      src={src}
      width={1}
      height={1}
      alt=""
      aria-hidden
      style={{ position: "absolute", left: "-9999px" }}
      suppressHydrationWarning
    />
  );
}
