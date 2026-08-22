import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * クラス名を結合し、Tailwind CSSの競合を解決するユーティリティ関数
 * clsx + tailwind-merge の組み合わせ
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 