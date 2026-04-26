import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
// 2026-04-26 #84 LCP 改善: katex.min.css は src/app/docs/[...slug]/page.tsx に移動。
// home/category/about/contact/privacy/terms から render-blocking CSS を除去。
import "../styles/globals.css";
import { Suspense } from "react";
import BackToTopButton from "@/components/ui/BackToTopButton";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import AnalyticsProvider from "@/components/providers/AnalyticsProvider";
import { getCommonSeoData } from "@/lib/metadata";
import StructuredData from "@/components/seo/StructuredData";

import { ThemeProvider } from "@/components/providers/ThemeProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  preload: true,
});

// 2026-04-26 #84 LCP 改善: Source_Serif_4 / Noto_Serif_JP / JetBrains_Mono を削除。
// next/font は preload:false でも @font-face CSS（unicode-range 宣言群）を render-blocking で
// 注入するため、3 ファイル合計 ~410KB の CSS が LCP/FCP を 7350ms 遅らせていた（PSI 計測）。
// hero H1 / mono ラベルは tailwind.config の system font fallback（Hiragino Mincho ProN, Yu Mincho,
// ui-monospace, SFMono-Regular 等）で代替する。視覚差は OS 標準フォントへの置き換えのみ。

export const metadata: Metadata = getCommonSeoData();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <StructuredData type="website" />
        <StructuredData type="organization" />
      </head>
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans`}>
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <AnalyticsProvider />
        </Suspense>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          disableTransitionOnChange={true}
          storageKey="doboku-note-theme"
        >
          <div className="min-h-screen bg-neutral-50 dark:bg-gray-900 transition-colors duration-300">
            {children}
            <BackToTopButton />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
