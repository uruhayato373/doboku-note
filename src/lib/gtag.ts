"use client";

// NEXT_PUBLIC_GA_ID: Google Analytics トラッキングID（GA4の測定ID）
// 例: G-XXXXXXXXXX
// 未設定の場合はGoogle Analyticsが無効化される
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

type GtagConfig = {
  page_path?: string;
  [key: string]: string | number | boolean | undefined;
};

// window.gtagの型定義
declare global {
  interface Window {
    gtag: (
      command: "config" | "event",
      targetId: string,
      config?: GtagConfig
    ) => void;
  }
}

// pages.dev（Cloudflare プレビュー/本番直 URL）からの内部トラフィック混入を除外する。
// 本番カスタムドメイン・未知ホストは通す fail-open（否定チェック）。SSR では window が無いので false。
const isPreviewHost = () =>
  typeof window !== "undefined" && window.location.hostname.endsWith(".pages.dev");

// ページビューを送信
// Issue #84 hotfix (2026-04-25): gtag.js 未ロード時のガードを追加。
// 将来 Script strategy を lazyOnload 等に変更しても、hydration 直後の
// AnalyticsProvider から呼ばれる本関数が TypeError を投げて React tree を
// クラッシュさせないようにする。
export const pageview = (url: string) => {
  if (!GA_ID) return;
  if (isPreviewHost()) return;
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
  if (isPreviewHost()) return; // pages.dev プレビューからのイベント混入を除外

  const eventParams: GtagConfig = {
    event_category: category,
    event_label: label,
  };

  if (value !== undefined) {
    eventParams.value = value;
  }

  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", action, eventParams);
};
