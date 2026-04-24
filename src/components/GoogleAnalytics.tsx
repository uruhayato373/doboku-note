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

  // Issue #84 Wave 1: strategy を "afterInteractive" から "lazyOnload" へ変更。
  // gtag.js のダウンロードと実行を LCP 発火後に遅延させ、mobile main thread の
  // 占有を解消して LCP / TBT を短縮する。
  return (
    <>
      <Script
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics"
        strategy="lazyOnload"
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
