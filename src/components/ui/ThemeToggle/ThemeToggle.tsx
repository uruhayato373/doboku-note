'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import { useSyncExternalStore } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * テーマ切り替えボタン。テーマ管理は next-themes ではなく独自の
 * `@/components/providers/ThemeProvider`（`useTheme`）を使う。
 * `useSyncExternalStore` の第3引数（サーバースナップショット）は常に `false` を返し、
 * ハイドレーション完了までは disabled のプレースホルダを描画する
 * （SSR とクライアントの初期テーマ判定がずれて hydration mismatch になるのを防ぐため）。
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
