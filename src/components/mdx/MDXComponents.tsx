import React, { ComponentType, LazyExoticComponent, lazy, Suspense } from 'react';
import { PostData } from '@/types/blog';

// 動的コンポーネントのマップ
const componentMap = {
  RealEstateCostsTable: lazy(() => import("@/features/real-estate-investment/RealEstateCostsTable")),
  PieChart: lazy(() => import("@/features/nisa-ideco-guide-civil-servants/PieChart")),
  StackedBarChart: lazy(() => import("@/features/nisa-ideco-guide-civil-servants/StackedBarChart")),
  // 必要に応じて他のコンポーネントも追加
} as const;

// コンポーネント名の型
export type ComponentName = keyof typeof componentMap;

// 動的コンポーネントを取得する関数
export function getDynamicComponent(name: ComponentName): LazyExoticComponent<ComponentType<any>> {
  return componentMap[name];
}

// 動的コンポーネントをレンダリングする関数
export function renderDynamicComponent(
  name: ComponentName, 
  props: any = {},
  fallback: React.ReactNode = <div>読み込み中...</div>
) {
  const Component = getDynamicComponent(name);
  
  return (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
}

// 記事に基づいて必要なコンポーネントを動的に読み込む
export function getDynamicComponents(post: PostData) {
  const components: Record<string, LazyExoticComponent<ComponentType<any>>> = {};

  // Phase 1: 記事のタグに基づいて必要なコンポーネントを追加
  // Note: subCategory is no longer available (blog feature removed in Phase 1)
  if (post.tags.includes('投資')) {
    components.PieChart = componentMap.PieChart;
    components.StackedBarChart = componentMap.StackedBarChart;
  }

  return components;
}

// ローディング状態を管理するカスタムフック
export function useComponentLoading() {
  const [loadingComponents, setLoadingComponents] = React.useState<Set<string>>(new Set());
  
  const markComponentLoading = React.useCallback((componentName: string) => {
    setLoadingComponents(prev => new Set(prev).add(componentName));
  }, []);
  
  const markComponentLoaded = React.useCallback((componentName: string) => {
    setLoadingComponents(prev => {
      const newSet = new Set(prev);
      newSet.delete(componentName);
      return newSet;
    });
  }, []);
  
  const isLoading = React.useCallback((componentName: string) => {
    return loadingComponents.has(componentName);
  }, [loadingComponents]);
  
  return {
    loadingComponents,
    markComponentLoading,
    markComponentLoaded,
    isLoading
  };
}

// パフォーマンス最適化されたコンポーネントラッパー
export function OptimizedComponent({ 
  name, 
  props, 
  fallback,
  onLoad,
  onError 
}: {
  name: ComponentName;
  props?: any;
  fallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}) {
  const { markComponentLoading, markComponentLoaded, isLoading } = useComponentLoading();
  
  React.useEffect(() => {
    markComponentLoading(name);
  }, [name, markComponentLoading]);
  
  const handleLoad = React.useCallback(() => {
    markComponentLoaded(name);
    onLoad?.();
  }, [name, markComponentLoaded, onLoad]);
  
  const handleError = React.useCallback((error: Error) => {
    markComponentLoaded(name);
    onError?.(error);
  }, [name, markComponentLoaded, onError]);
  
  if (isLoading(name)) {
    return <>{fallback}</>;
  }
  
  return (
    <ErrorBoundary onError={handleError}>
      <Suspense fallback={fallback}>
        {renderDynamicComponent(name, props, fallback)}
      </Suspense>
    </ErrorBoundary>
  );
}

// エラーバウンダリのインポート
import { BlogErrorBoundary as ErrorBoundary } from '../providers/ErrorBoundary'; 