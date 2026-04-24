import type { Metadata } from "next";
import { Inter, Noto_Sans_JP, Source_Serif_4, Noto_Serif_JP } from "next/font/google";
// katex.min.css を先に import して、後続の globals.css で上書きできるようにする
// （CSS カスケードは後勝ちのため、import 順で決まる）
import "katex/dist/katex.min.css";
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

// Wave 2 (#84): preload: false に変更。日本語サブセット指定のない Noto Sans JP は
// mobile で巨大ペイロードを critical path に乗せ LCP の主要ボトルネックとなっていた。
// preload off + display:swap で system font フォールバックによる早期描画を狙う（FOUT 許容）。
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  preload: false,
});

// Serif/Mincho フォント（2026-04-22 追加）: 本文フォント切替の基盤として導入。
// デフォルトは Sans（Inter + Noto Sans JP）のまま。`body.font-serif` / `body.font-mincho`
// クラスで opt-in 可能にし、UI 露出（Tweaks トグル等）は別 PR で段階導入する。
// preload は false（デフォルトで読み込まないため、初期バンドルへの影響を最小化）。
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-source-serif",
  display: "swap",
  preload: false,
});

const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-noto-serif-jp",
  display: "swap",
  preload: false,
});

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
      <body className={`${inter.variable} ${notoSansJP.variable} ${sourceSerif.variable} ${notoSerifJP.variable} font-sans`}>
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
