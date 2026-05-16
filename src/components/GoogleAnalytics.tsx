"use client";

import Script from "next/script";

export default function GoogleAnalytics() {
  // NEXT_PUBLIC_GA_ID: Google Analytics トラッキングID（GA4の測定ID）
  // 例: G-XXXXXXXXXX
  // 未設定の場合はGoogle Analyticsコンポーネントがレンダリングされない
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  // dev (npm run dev / localhost) では GA4 を発火させない（内部トラフィック混入防止）
  // - GA4 で Direct トラフィックが Organic より多く混入する根本原因
  // - 本番デプロイ後の Cloudflare Pages では NODE_ENV=production
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  if (!gaId) {
    return null;
  }

  // 本番ホスト以外でも除外（pages.dev / プレビュー / コラボ環境からのアクセスを除外したい場合は
  // ここで window.location.hostname を見て分岐できる。現状は dev 排除のみ）

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
