'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * @description
 * テーマ切り替えボタンコンポーネント。
 * ライトモードとダークモードを切り替えるためのUIを提供します。
 * 
 * @component
 * 
 * @features
 * - ライト/ダークモードの切り替え機能
 * - アイコンとテキストによる視覚的フィードバック
 * - アニメーション付きのローディング状態
 * - アクセシビリティ対応（aria-label, title属性）
 * - ダークモード時の適切なスタイリング
 * 
 * @dependencies
 * - next-themes: テーマ管理用フック（useTheme）
 * - lucide-react: アイコンコンポーネント（Sun, Moon）
 * - React hooks: useState, useEffect
 * 
 * @styling
 * - Tailwind CSSによるスタイリング
 * - ホバーエフェクト
 * - フォーカスリング
 * - トランジションアニメーション
 * - レスポンシブデザイン
 * 
 * @accessibility
 * - 適切なaria-label（現在のモードに基づく切り替え説明）
 * - キーボード操作対応
 * - 高コントラストカラー
 * - ツールチップ（title属性）
 * 
 * @states
 * - mounted: クライアントサイドでのハイドレーション完了状態
 * - theme: 現在のテーマ設定（'light' | 'dark'）
 * 
 * @example
 * ```tsx
 * // ヘッダーなどで使用する例
 * import ThemeToggle from '@/components/ui/ThemeToggle/ThemeToggle';
 * 
 * export default function Header() {
 *   return (
 *     <header>
 *       <ThemeToggle />
 *     </header>
 *   );
 * }
 * ```
 * 
 * @returns {JSX.Element} テーマ切り替えボタンコンポーネント
 */
export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  if (!mounted) {
    return (
      <button
        className="h-11 w-11 animate-pulse rounded-card-inline bg-[var(--rule-soft)]"
        disabled
        aria-label="読み込み中..."
      />
    );
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (resolvedTheme === 'dark') {
      return <Sun className="w-5 h-5 text-yellow-500" />;
    }
    return <Moon className="w-5 h-5 text-[var(--ink-body)]" />;
  };

  const getAriaLabel = () => {
    return theme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え';
  };

  return (
    <button
      onClick={cycleTheme}
      className="focus-ring flex min-h-11 min-w-11 flex-col items-center justify-center space-y-1 rounded-card-inline bg-[var(--bg)] px-3 py-2 transition-colors duration-200 hover:bg-[var(--accent-fill)]"
      aria-label={getAriaLabel()}
      title={`現在: ${theme === 'dark' ? 'dark' : 'light'}モード`}
    >
      {getIcon()}
      <span className="hidden md:block text-xs font-medium text-[var(--ink-body)]">
        {theme === 'dark' ? 'dark' : 'light'}
      </span>
    </button>
  );
} 
