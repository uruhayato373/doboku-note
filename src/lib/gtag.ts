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
export const pageview = (url: string) => {
  if (!GA_ID) return;
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

  window.gtag("event", action, eventParams);
};
