"use client";

import Script from "next/script";

export default function AdSenseScript() {
  return (
    <Script
      async
      strategy="afterInteractive"
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7995274743017484"
      crossOrigin="anonymous"
    />
  );
}
