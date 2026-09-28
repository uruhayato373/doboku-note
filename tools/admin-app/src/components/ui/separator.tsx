"use client"

// shadcn/ui 公式（new-york-v4）の separator.tsx をそのまま使う。変えたのは import 先（cn → @/lib/cn・Separator → @radix-ui/react-separator）だけ。
// 公式との差は npm run check-shadcn-parity が止める（参照: .claude/config/shadcn-reference/separator.tsx）。

import * as React from "react"
import { cn } from "@/lib/cn"
import * as SeparatorPrimitive from "@radix-ui/react-separator"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
