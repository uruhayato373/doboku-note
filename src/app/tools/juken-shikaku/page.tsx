import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import type { Metadata } from "next";
import JukenShikakuClient from "./JukenShikakuClient";

export const metadata: Metadata = {
  title: "土木施工管理技士 受験資格チェッカー｜1級・2級 新受検資格を年齢・実務経験で判定",
  description:
    "1級・2級土木施工管理技士の受験資格を無料で判定。第一次検定の年齢要件（1級19歳/2級17歳）と、第二次検定の新受検資格（第一次検定等合格後の実務経験年数）を、級・保有資格ルート別にチェック。令和6年度〜の新制度・経過措置に対応。",
  alternates: { canonical: "/tools/juken-shikaku" },
  openGraph: {
    type: "website",
    title: "土木施工管理技士 受験資格チェッカー｜1級・2級",
    description:
      "1級・2級土木施工管理技士の受験資格を年齢・実務経験で無料判定。令和6年度〜の新受検資格に対応。",
    url: "https://doboku-note.com/tools/juken-shikaku",
    siteName: "doboku-note",
    images: [
      { url: "https://doboku-note.com/images/og-default.png", width: 1200, height: 630, alt: "土木施工管理技士 受験資格チェッカー — doboku-note" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "土木施工管理技士 受験資格チェッカー｜1級・2級",
    description: "1級・2級土木施工管理技士の受験資格を年齢・実務経験で無料判定。新受検資格対応。",
    images: ["https://doboku-note.com/images/og-default.png"],
  },
};

export default function JukenShikakuPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] transition-colors duration-300">
      <Header />

      <main className="flex-grow">
        <section className="border-b border-[var(--rule-soft)] bg-[var(--paper)] py-10 sm:py-12">
          <div className="max-w-[760px] mx-auto px-4 sm:px-6">
            <nav aria-label="breadcrumb" className="font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
              <Link href="/" className="hover:text-[var(--accent)] transition-colors">Home</Link>
              <span aria-hidden className="opacity-60">›</span>
              <Link href="/tools" className="hover:text-[var(--accent)] transition-colors">Tools</Link>
            </nav>
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] px-2.5 py-1 bg-[var(--accent-fill)] rounded-full mb-4">
              無料ツール
            </div>
            <h1 className="font-serif font-black text-[var(--ink)] text-[24px] sm:text-[30px] tracking-tight leading-[1.25] mb-4">
              土木施工管理技士 受験資格チェッカー
            </h1>
            <p className="text-[15px] sm:text-[16px] leading-[1.9] text-[var(--ink-body)]">
              <strong className="text-[var(--ink)]">1級・2級土木施工管理技士</strong>の受験資格を無料で判定します。第一次検定の<strong className="text-[var(--ink)]">年齢要件</strong>と、第二次検定の<strong className="text-[var(--ink)]">新受検資格（合格後の実務経験年数）</strong>を、級・保有資格ルート別にチェックできます（令和6年度〜の新制度）。
            </p>
          </div>
        </section>

        <JukenShikakuClient />
      </main>

      <Footer />
    </div>
  );
}
