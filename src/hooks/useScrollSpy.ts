import { useEffect, useState } from 'react';
import { HeadingItem } from '@/types/blog';

export function useScrollSpy(headings: readonly HeadingItem[]) {
  const [activeHeading, setActiveHeading] = useState<string>("");

  useEffect(() => {
    // スクロール位置に基づいてアクティブな見出しを更新
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100; // ヘッダーの高さを考慮

      for (let i = headings.length - 1; i >= 0; i--) {
        const element = document.getElementById(headings[i]?.id || '');
        if (element && element.offsetTop <= scrollPosition) {
          const headingId = headings[i]?.id;
          if (headingId) {
            setActiveHeading(headingId);
          }
          break;
        }
      }
    };

    if (headings.length > 0) {
      window.addEventListener("scroll", handleScroll);
      handleScroll(); // 初期状態も設定

      return () => window.removeEventListener("scroll", handleScroll);
    }
    
    // headingsが空の場合のクリーンアップ関数を返す
    return undefined;
  }, [headings]);

  return activeHeading;
} 