"use client";

import Script from "next/script";

export default function GoogleAnalytics() {
  // NEXT_PUBLIC_GA_ID: Google Analytics トラッキングID（GA4の測定ID）
  // 例: G-XXXXXXXXXX
  // 未設定の場合はGoogle Analyticsコンポーネントがレンダリングされない
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  if (!gaId) {
    return null;
  }

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
