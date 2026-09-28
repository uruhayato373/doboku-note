// shadcn/ui 公式（new-york-v4）の skeleton.tsx をそのまま使う。変えたのは import 先（cn → @/lib/cn）だけ。
// 公式との差は npm run check-shadcn-parity が止める（参照: .claude/config/shadcn-reference/skeleton.tsx）。
import { cn } from "@/lib/cn"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-accent", className)}
      {...props}
    />
  )
}

export { Skeleton }
