"use client";

// NEXT_PUBLIC_GA_ID: Google Analytics トラッキングID（GA4の測定ID）
// 例: G-XXXXXXXXXX
// 未設定の場合はGoogle Analyticsが無効化される
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// window.gtagの型定義
declare global {
  interface Window {
    gtag: (
      command: "config" | "event",
      targetId: string,
      config?: {
        page_path?: string;
        [key: string]: any; // 動的なプロパティを許可
      }
    ) => void;
  }
}

// ページビューを送信
// Issue #84 hotfix (2026-04-25): gtag.js 未ロード時のガードを追加。
// 将来 Script strategy を lazyOnload 等に変更しても、hydration 直後の
// AnalyticsProvider から呼ばれる本関数が TypeError を投げて React tree を
// クラッシュさせないようにする。
export const pageview = (url: string) => {
  if (!GA_ID) return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("config", GA_ID, {
    page_path: url,
  });
};

// イベントを送信
export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string;
  category: string;
  label: string;
  value?: number;
}) => {
  // NODE_ENV: 本番環境でのみイベントを送信
  // 開発環境ではGoogle Analyticsイベントを無効化
  if (!GA_ID || process.env.NODE_ENV !== "production") return;

  const eventParams: { [key: string]: any } = {
    event_category: category,
    event_label: label,
  };

  if (value !== undefined) {
    eventParams.value = value;
  }

  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", action, eventParams);
};

// Site Search イベント送信（GA4 標準 `search` イベント）
// Issue #175 Tier 1.1: 検索クエリを GA4 に記録し、「該当ページなし」クエリから
// 次に書く記事の選定根拠を取得する（content gap 分析の入力）
export const trackSearch = (searchTerm: string) => {
  if (!GA_ID || process.env.NODE_ENV !== "production") return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", "search", { search_term: searchTerm });
};
