import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import type { Metadata } from "next";
import KakomonQuizClient from "./KakomonQuizClient";

export const metadata: Metadata = {
  title: "1級土木 過去問ミニ演習｜第一次検定 過去問を無料で4択クイズ",
  description:
    "1級土木施工管理技士 第一次検定の過去問を、その場で解けるミニ演習（4択クイズ）。1問ずつ即採点＋全選択肢の解説つき。令和4〜7年度から抜粋24問を無料で演習できます。",
  alternates: { canonical: "/tools/kakomon-quiz" },
  openGraph: {
    type: "website",
    title: "1級土木 過去問ミニ演習｜第一次検定 4択クイズ",
    description: "1級土木 第一次検定の過去問を即採点＋解説つきで無料演習。抜粋24問のミニテスト。",
    url: "https://doboku-note.com/tools/kakomon-quiz",
    siteName: "doboku-note",
    images: [{ url: "https://doboku-note.com/images/og-default.png", width: 1200, height: 630, alt: "1級土木 過去問ミニ演習 — doboku-note" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "1級土木 過去問ミニ演習｜第一次検定 4択クイズ",
    description: "1級土木 第一次検定の過去問を即採点＋解説つきで無料演習。",
    images: ["https://doboku-note.com/images/og-default.png"],
  },
};

export default function KakomonQuizPage() {
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
            <h1 className="font-serif font-black text-[var(--ink)] text-[28px] sm:text-[38px] tracking-tight leading-[1.25] mb-4">
              1級土木 過去問ミニ演習
            </h1>
            <p className="text-[15px] sm:text-[16px] leading-[1.9] text-[var(--ink-body)]">
              <strong className="text-[var(--ink)]">1級土木施工管理技士 第一次検定</strong>の過去問を、その場で解ける<strong className="text-[var(--ink)]">4択ミニ演習</strong>です。1問ずつ即採点し、全選択肢の解説を表示します（令和4〜7年度から抜粋24問）。
            </p>
          </div>
        </section>

        <KakomonQuizClient />
      </main>

      <Footer />
    </div>
  );
}
