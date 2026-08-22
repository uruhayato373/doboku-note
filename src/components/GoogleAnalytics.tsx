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

  // 本番は SSR で gtag スクリプトを HTML に載せ、確実にロードさせる（初回 page_view を取りこぼさない）。
  // pages.dev（Cloudflare プレビュー/本番直 URL）からの内部トラフィック混入は、
  // gtag('config') を hostname で条件分岐して除外する（config を送らなければ GA は活性化しない）。
  // 本番カスタムドメイン(doboku-note.com)・未知ホストは通す fail-open。SPA 遷移・クリックイベント側の
  // pages.dev 除外は src/lib/gtag.ts のガードで担保する。
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
            if (!location.hostname.endsWith('.pages.dev')) {
              gtag('config', '${gaId}', {
                page_path: window.location.pathname,
              });
            }
          `,
        }}
      />
    </>
  );
}
