"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

export default function GoogleAnalytics() {
  // NEXT_PUBLIC_GA_ID: Google Analytics トラッキングID（GA4の測定ID）
  // 例: G-XXXXXXXXXX
  // 未設定の場合はGoogle Analyticsコンポーネントがレンダリングされない
  const gaId = process.env.NEXT_PUBLIC_GA_ID;

  // pages.dev（Cloudflare プレビュー/本番直 URL）からの発火を除外する。
  // 本番カスタムドメイン(doboku-note.com)・未知ホストは通す fail-open 方式（否定チェック）に
  // することで、万一ドメインが変わっても本番 GA を誤って止めない。判定は client のみ可能なため
  // 初期値はブロック（SSR/初回描画は null）で、mount 後に hostname を見て解除する。
  const [previewBlocked, setPreviewBlocked] = useState(true);
  useEffect(() => {
    setPreviewBlocked(window.location.hostname.endsWith(".pages.dev"));
  }, []);

  // dev (npm run dev / localhost) では GA4 を発火させない（内部トラフィック混入防止）
  // - GA4 で Direct トラフィックが Organic より多く混入する根本原因
  // - 本番デプロイ後の Cloudflare Pages では NODE_ENV=production
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  if (!gaId) {
    return null;
  }

  // pages.dev プレビュー/コラボ環境からの内部トラフィック混入を除外
  if (previewBlocked) {
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
