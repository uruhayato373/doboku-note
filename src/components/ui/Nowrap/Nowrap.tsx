import React from "react";
import { cn } from "@/lib/cn";

interface NowrapProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * @description
 * 折り返しを禁止する inline コンポーネント。半角スペースを含むラベル
 * （例: 「令和 7 年度」「シールド工法」）が狭幅で改行されないようにする。
 * MDX 表のデフォルトでは最初列が globals.css 側で nowrap 化されているため、
 * Nowrap は最初列以外、または地の文中で個別にラップしたい箇所に使う。
 *
 * @component
 *
 * @props
 * - children: 折り返しを禁止する内容
 * - className: 追加 CSS クラス（オプション）
 *
 * @example
 * ```mdx
 * | 工法 | 概要 |
 * |---|---|
 * | 鉄筋工 | 鉄筋を <Nowrap>JIS G 3112</Nowrap> 規格で配筋する |
 * ```
 */
export default function Nowrap({ children, className = "" }: NowrapProps) {
  return (
    <span className={cn("whitespace-nowrap", className)}>{children}</span>
  );
}
