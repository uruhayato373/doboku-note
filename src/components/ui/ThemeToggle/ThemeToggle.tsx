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
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  // 読込み前の枠は、読込み後のボタンと同じ大きさにする（PC は文字の行のぶん高い。44px 角の枠だとヘッダーが 20px 伸びて CLS になる）
  if (!mounted) {
    return (
      <button
        className="flex min-h-11 min-w-11 flex-col items-center justify-center space-y-1 rounded-card-inline px-3 py-2"
        disabled
        aria-label="読み込み中..."
      >
        <span className="block h-5 w-5 animate-pulse rounded-card-inline bg-(--rule-soft)" />
        <span className="invisible hidden md:block text-xs font-medium" aria-hidden="true">light</span>
      </button>
    );
  }

  const cycleTheme = () => {
    if (resolvedTheme === 'light') {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    if (resolvedTheme === 'dark') {
      return <Sun className="w-5 h-5 text-yellow-500" />;
    }
    return <Moon className="w-5 h-5 text-(--ink-body)" />;
  };

  const getAriaLabel = () => {
    return resolvedTheme === 'light' ? 'ダークモードに切り替え' : 'ライトモードに切り替え';
  };

  return (
    <button
      onClick={cycleTheme}
      className="focus-ring flex min-h-11 min-w-11 flex-col items-center justify-center space-y-1 rounded-card-inline bg-(--bg) px-3 py-2 transition-colors duration-200 hover:bg-(--accent-fill)"
      aria-label={getAriaLabel()}
      title={`現在: ${resolvedTheme === 'dark' ? 'dark' : 'light'}モード`}
    >
      {getIcon()}
      <span className="hidden md:block text-xs font-medium text-(--ink-body)">
        {resolvedTheme === 'dark' ? 'dark' : 'light'}
      </span>
    </button>
  );
} 
