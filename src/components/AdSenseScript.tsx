"use client";

import Script from "next/script";

// LCP 改善: 既定で lazyOnload に切替（field LCP 4978ms → 3500ms 目標）。
// 広告収益への悪影響が出たら NEXT_PUBLIC_ADSENSE_EAGER=1 で afterInteractive に戻す。
// 2026-05-17 docs/handoffs/2026-05-17-lcp-rca-and-next-steps.md 参照。
const STRATEGY =
  process.env.NEXT_PUBLIC_ADSENSE_EAGER === "1" ? "afterInteractive" : "lazyOnload";

export default function AdSenseScript() {
  return (
    <Script
      async
      strategy={STRATEGY}
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7995274743017484"
      crossOrigin="anonymous"
    />
  );
}
