// shadcn/ui 公式（new-york-v4）の progress.tsx とクラス・構造・見た目は同じ。違いは Radix Progress を使わず
// サーバー描画の div にしたことだけ（値が変わらない表示なのでクライアント部品にする必要が無い）。
// 公式との差は npm run check-shadcn-parity が止める（参照: .claude/config/shadcn-reference/progress.tsx）。
import * as React from "react"
import { cn } from "@/lib/cn"

function Progress({
  className,
  value,
  indicatorClassName,
  ...props
}: React.ComponentProps<"div"> & { value?: number | null; indicatorClassName?: string }) {
  const pct = Math.max(0, Math.min(100, value || 0))
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className
      )}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - pct}%)` }}
      />
    </div>
  )
}

export { Progress }
