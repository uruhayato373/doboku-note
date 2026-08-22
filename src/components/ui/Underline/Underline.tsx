import React from "react";
import { cn } from "@/lib/cn";

interface UnderlineProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * @description
 * 文字の下半分にアクセントカラーのマーカー風アンダーラインを引くコンポーネント
 * 
 * @component
 * 
 * @props
 * - children: アンダーラインを引くテキスト
 * - className: 追加のCSSクラス（オプション）
 * 
 * @example
 * ```tsx
 * <Underline>重要なテキスト</Underline>
 * ```
 */
export default function Underline({
  children,
  className = "",
}: UnderlineProps) {
  return (
    <span className={cn("inline", "marker-underline", className)}>
      {children}
    </span>
  );
}
