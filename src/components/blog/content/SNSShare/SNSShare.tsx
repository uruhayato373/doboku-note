"use client";

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * SNSプラットフォームの設定
 * @interface SNSPlatform
 */
interface SNSPlatform {
  name: string;
  key: string;
  color: string;
  hoverColor: string;
  icon: () => JSX.Element;
  shareUrl: (title: string, url: string) => string;
}

/**
 * SNSプラットフォームの設定配列
 * インラインSVGアイコンを使用して外部依存を削減
 */
const SNS_PLATFORMS: SNSPlatform[] = [
  {
    name: 'Twitter',
    key: 'twitter',
    color: 'text-blue-500',
    hoverColor: 'hover:text-blue-600',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    shareUrl: (title: string, url: string) => 
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
  },
  {
    name: 'Facebook',
    key: 'facebook',
    color: 'text-blue-600',
    hoverColor: 'hover:text-blue-700',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    shareUrl: (title: string, url: string) => 
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
  },
  {
    name: 'LINE',
    key: 'line',
    color: 'text-green-500',
    hoverColor: 'hover:text-green-600',
    icon: () => (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63v1.125h-1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 5.087 3.06 9.458 7.432 11.117l-.882 2.94c-.096.32.207.614.527.518l2.94-.882C21.94 19.772 24 15.401 24 10.314"/>
      </svg>
    ),
    shareUrl: (title: string, url: string) => 
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}`
  }
];

/**
 * SNSシェア処理を実行する関数
 * @param {string} platform - プラットフォームのキー
 * @param {string} title - シェアするタイトル
 * @param {string} url - シェアするURL
 */
function handleSNSShare(platform: string, title: string, url: string): void {
  const platformConfig = SNS_PLATFORMS.find(p => p.key === platform);
  if (platformConfig) {
    const shareUrl = platformConfig.shareUrl(title, url);
    window.open(shareUrl, '_blank');
  }
}

/**
 * SNSシェアボタンの表示バリエーション
 * @typedef {'compact' | 'extended'} SNSShareVariant
 * - `compact`: コンパクトなアイコンのみの表示
 * - `extended`: 詳細なボタンとコピー機能を含む表示
 */
type SNSShareVariant = 'compact' | 'extended';

/**
 * SNSシェアボタンの配置オプション
 * @typedef {'start' | 'center' | 'end'} SNSShareAlign
 * - `start`: 左寄せ
 * - `center`: 中央寄せ
 * - `end`: 右寄せ
 */
type SNSShareAlign = 'start' | 'center' | 'end';

/**
 * SNSシェアコンポーネントのプロパティ
 * @interface SNSShareProps
 */
interface SNSShareProps {
  /** シェアする記事のタイトル */
  title: string;
  /** 表示バリエーション（デフォルト: 'compact'） */
  variant?: SNSShareVariant;
  /** ボタンの配置（デフォルト: 'end'） */
  align?: SNSShareAlign;
  /** 見出しの表示/非表示（デフォルト: true） */
  showHeading?: boolean;
  /** リンクコピーボタンの表示/非表示（デフォルト: true） */
  showCopy?: boolean;
}

/**
 * SNSシェアコンポーネント
 * 
 * 記事のシェア機能を提供するコンポーネントです。
 * Twitter、Facebook、LINEでのシェアとリンクコピー機能をサポートします。
 * インラインSVGアイコンを使用して外部依存を削減しています。
 * 
 * @component
 * @param {SNSShareProps} props - コンポーネントのプロパティ
 * @returns {JSX.Element} SNSシェアコンポーネント
 * 
 * @example
 * ```tsx
 * // コンパクトなシェアボタン（記事上部）
 * <SNSShare 
 *   title="記事タイトル" 
 *   variant="compact" 
 *   align="end" 
 *   showHeading={false} 
 *   showCopy={false} 
 * />
 * 
 * // 拡張シェアボタン（記事下部）
 * <SNSShare 
 *   title="記事タイトル" 
 *   variant="extended" 
 *   align="start" 
 *   showHeading={true} 
 *   showCopy={true} 
 * />
 * ```
 * 
 * @since 1.0.0
 * @author カッコム開発チーム
 */
export default function SNSShare({
  title,
  variant = 'compact',
  align = 'end',
  showHeading = true,
  showCopy = true,
}: SNSShareProps) {
  const pathname = usePathname();
  const [currentUrl, setCurrentUrl] = useState('');

  /**
   * usePathnameとベースURLを組み合わせて完全なURLを生成
   * クライアントサイドでのみ実行されるため、useEffectを使用
   */
  useEffect(() => {
    // NEXT_PUBLIC_SITE_URL: サイトのベースURL（クライアントサイド用）
    // シェア機能で使用されるURLを構築
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kakkom.vercel.app';
    setCurrentUrl(`${baseUrl}${pathname}`);
  }, [pathname]);

  /**
   * シェア用のタイトルを生成
   * 記事タイトルに「| カッコム」を付加
   */
  const shareTitle = useMemo(() => `${title} | カッコム`, [title]);

  /**
   * SNSプラットフォームでのシェア処理
   * @param {string} platform - プラットフォームのキー（twitter, facebook, line）
   */
  const onShare = (platform: string) => {
    handleSNSShare(platform, shareTitle, currentUrl);
  };

  // 拡張バリエーションの表示
  if (variant === 'extended') {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        {showHeading && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            この記事をシェア
          </h3>
        )}
        <div 
          className={`flex flex-wrap gap-3 ${
            align === 'start' ? 'justify-start' : 
            align === 'center' ? 'justify-center' : 
            'justify-end'
          }`}
        >
          {SNS_PLATFORMS.map((platform) => (
            <button
              key={platform.key}
              onClick={() => onShare(platform.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors duration-200 ${
                platform.key === 'twitter'
                  ? 'bg-primary-500 hover:bg-primary-600'
                  : platform.key === 'facebook'
                  ? 'bg-primary-600 hover:bg-primary-700'
                  : 'bg-green-500 hover:bg-green-600'
              }`}
              aria-label={`${platform.name}でシェア`}
              title={`${platform.name}でシェア`}
            >
              {platform.icon()}
              {platform.name}
            </button>
          ))}

          {showCopy && (
            <CopyLinkButton currentUrl={currentUrl} />
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
          この記事が役立ったら、ぜひシェアしてください！
        </p>
      </div>
    );
  }

  // コンパクトバリエーションの表示
  return (
    <div className="flex items-center gap-2">
      {SNS_PLATFORMS.map((platform) => (
        <button
          key={platform.key}
          onClick={() => onShare(platform.key)}
          className={`p-2 rounded ${platform.color} ${platform.hoverColor} bg-gray-100 dark:bg-gray-700 transition-colors duration-200`}
          aria-label={`${platform.name}でシェア`}
          title={`${platform.name}でシェア`}
        >
          {platform.icon()}
        </button>
      ))}
    </div>
  );
}

/**
 * リンクコピーボタンコンポーネント
 * 
 * 現在のページURLをクリップボードにコピーする機能を提供します。
 * コピー完了時は一時的にボタンの表示を変更します。
 * 
 * @component
 * @param {Object} props - コンポーネントのプロパティ
 * @param {string} props.currentUrl - コピーするURL
 * @returns {JSX.Element} リンクコピーボタンコンポーネント
 * 
 * @example
 * ```tsx
 * <CopyLinkButton currentUrl="https://example.com" />
 * ```
 * 
 * @since 1.0.0
 * @private
 */
function CopyLinkButton({ currentUrl }: { currentUrl: string }) {
  const [isCopied, setIsCopied] = useState(false);

  /**
   * リンクをクリップボードにコピーする処理
   * コピー完了後、2秒間「コピー完了!」の表示を維持
   * 
   * @async
   * @function handleCopyLink
   * @returns {Promise<void>}
   * @throws {Error} クリップボードAPIが利用できない場合
   */
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('リンクのコピーに失敗しました:', err);
    }
  };

  return (
    <button
      onClick={handleCopyLink}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
        isCopied ? 'bg-green-500 text-white' : 'bg-gray-500 text-white hover:bg-gray-600'
      }`}
      aria-label="リンクをコピー"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      {isCopied ? 'コピー完了!' : 'リンクコピー'}
    </button>
  );
}