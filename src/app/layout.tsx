import type { Metadata } from "next";
// 2026-04-29 #84 LCP 改善: Inter / Noto_Sans_JP を削除。
// 既に 2026-04-26 で Source_Serif_4 / Noto_Serif_JP / JetBrains_Mono を削除済み（~7350ms 削減実績）。
// 本文・見出し用の Inter / Noto_Sans_JP も system font fallback（Hiragino Kaku Gothic ProN /
// Yu Gothic UI / Meiryo 等、tailwind.config.js の font-sans 定義）で代替する。
// 全 next/font 削除で render-blocking @font-face CSS を完全除去し、
// PSI Performance ≥ 70 達成を狙う。
import "../styles/globals.css";
import { Suspense } from "react";
import BackToTopButton from "@/components/ui/BackToTopButton";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import AnalyticsProvider from "@/components/providers/AnalyticsProvider";
import { getCommonSeoData } from "@/lib/metadata";
import StructuredData from "@/components/seo/StructuredData";

import { ThemeProvider } from "@/components/providers/ThemeProvider";

export const metadata: Metadata = getCommonSeoData();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Flash-prevention: set dark class before React mounts to avoid FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=localStorage.getItem('doboku-note-theme');if(s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}})()`,
          }}
        />
        <StructuredData type="website" />
        <StructuredData type="organization" />
      </head>
      <body className="font-sans">
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <AnalyticsProvider />
        </Suspense>
        <ThemeProvider>
          <div className="min-h-screen bg-[var(--bg)] transition-colors duration-300">
            {children}
            <BackToTopButton />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
