import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import "../styles/globals.css";
import "katex/dist/katex.min.css";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import BackToTopButton from "@/components/ui/BackToTopButton";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import AnalyticsProvider from "@/components/providers/AnalyticsProvider";
import { getCommonSeoData } from "@/lib/metadata";

import { ThemeProvider } from "@/components/providers/ThemeProvider";

const StructuredData = dynamic(() => import("@/components/seo/StructuredData"));

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
        <Suspense fallback={<></>}>
          <AnalyticsProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem={true}
              disableTransitionOnChange={false}
              storageKey="doboku-note-theme"
            >
              <div className="min-h-screen bg-neutral-50 dark:bg-gray-900 transition-colors duration-300">
                {children}
                <BackToTopButton />
              </div>
            </ThemeProvider>
          </AnalyticsProvider>
        </Suspense>
      </body>
    </html>
  );
}
