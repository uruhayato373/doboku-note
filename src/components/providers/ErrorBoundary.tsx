'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import Image from 'next/image';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class BlogErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // エラーが発生した場合の状態更新
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // エラーログの記録
    console.error('BlogErrorBoundary caught an error:', error, errorInfo);
    
    // カスタムエラーハンドラーの呼び出し
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // エラー状態の更新
    this.setState({
      error,
      errorInfo
    });
  }

  override render() {
    if (this.state.hasError) {
      // カスタムフォールバックUIが指定されている場合
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // デフォルトのエラーUI
      return (
        <div className="error-boundary">
          <div className="error-container">
            <h2 className="error-title">申し訳ございません</h2>
            <p className="error-message">
              ページの読み込み中にエラーが発生しました。
            </p>
            <div className="error-actions">
              <button
                onClick={() => window.location.reload()}
                className="btn btn--primary"
              >
                ページを再読み込み
              </button>
              <button
                onClick={() => this.setState({ hasError: false })}
                className="btn btn--secondary"
              >
                再試行
              </button>
            </div>
            {/* NODE_ENV: 開発環境でのみエラー詳細を表示 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>エラー詳細（開発モード）</summary>
                <pre className="error-stack">
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo && (
                  <pre className="error-info">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 関数コンポーネント用のエラーハンドラー
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WrappedComponent(props: P) {
    return (
      <BlogErrorBoundary fallback={fallback} onError={onError || (() => {})}>
        <Component {...props} />
      </BlogErrorBoundary>
    );
  };
}

// 画像読み込みエラー用のフォールバックコンポーネント
export function ImageWithFallback({ 
  src, 
  alt, 
  fallback = "画像を読み込めませんでした",
  className = "",
  ...props 
}: {
  src: string;
  alt: string;
  fallback?: string;
  className?: string;
  [key: string]: any;
}) {
  const [error, setError] = React.useState(false);
  
  if (error) {
    return (
      <div className={`fallback-image ${className}`}>
        <div className="fallback-content">
          <span className="fallback-icon">🖼️</span>
          <span className="fallback-text">{fallback}</span>
        </div>
      </div>
    );
  }
  
  return (
    <Image 
      src={src} 
      alt={alt} 
      className={className}
      onError={() => setError(true)}
      width={0}
      height={0}
      sizes="100vw"
      style={{ width: '100%', height: 'auto' }}
      {...props}
    />
  );
} 