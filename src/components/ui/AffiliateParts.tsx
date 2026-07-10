import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

export const AFFILIATE_LINK_REL = "nofollow sponsored noopener";

export function AffiliatePrBadge({ className = "" }: { readonly className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white ${className}`}
      style={{ background: "var(--ink-muted)" }}
      aria-label="広告"
    >
      PR
    </span>
  );
}

export function AffiliateCta({ children }: { readonly children: ReactNode }) {
  return (
    <div className="mt-2.5 inline-flex items-center gap-1 text-sm font-bold text-brand dark:text-brand group-hover:gap-2 transition-all">
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
