import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import type { Metadata } from "next";
import KeikenCharcountClient from "./KeikenCharcountClient";

export const metadata: Metadata = {
  // title template `%s | doboku-note` で自動付与されるため "doboku-note" は重ねない
  title: "施工経験記述 文字数チェッカー｜1級・2級土木 第2次検定 解答欄の字数確認",
  description:
    "1級・2級土木施工管理技士 第2次検定 問題1（施工経験記述）の答案が解答欄の字数に収まるかを無料でチェック。級・出題形式（現行2テーマ／旧3項目）・設問別に上限字数を判定し、超過分を即表示します。",
  alternates: { canonical: "/tools/keiken-charcount" },
  openGraph: {
    type: "website",
    title: "施工経験記述 文字数チェッカー｜1級・2級土木 第2次検定",
    description:
      "施工経験記述の答案が解答欄に収まるか無料でチェック。級・設問別に上限字数（1級 現行200字 ほか）を判定。",
    url: "https://doboku-note.com/tools/keiken-charcount",
    siteName: "doboku-note",
    images: [
      {
        url: "https://doboku-note.com/images/og-default.png",
        width: 1200,
        height: 630,
        alt: "施工経験記述 文字数チェッカー — doboku-note",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "施工経験記述 文字数チェッカー｜1級・2級土木 第2次検定",
    description:
      "施工経験記述の答案が解答欄に収まるか無料でチェック。級・設問別に上限字数を判定。",
    images: ["https://doboku-note.com/images/og-default.png"],
  },
};

export default function KeikenCharcountPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] transition-colors duration-300">
      <Header />

      <main className="flex-grow">
        {/* Hero */}
        <section className="border-b border-[var(--rule-soft)] bg-[var(--paper)] py-10 sm:py-12">
          <div className="max-w-[760px] mx-auto px-4 sm:px-6">
            <nav
              aria-label="breadcrumb"
              className="font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-widest mb-3 flex items-center gap-2"
            >
              <Link href="/" className="hover:text-[var(--accent)] transition-colors">
                Home
              </Link>
              <span aria-hidden className="opacity-60">
                ›
              </span>
              <Link href="/tools" className="hover:text-[var(--accent)] transition-colors">Tools</Link>
            </nav>
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] px-2.5 py-1 bg-[var(--accent-fill)] rounded-full mb-4">
              無料ツール
            </div>
            <h1 className="font-serif font-black text-[var(--ink)] text-[24px] sm:text-[30px] tracking-tight leading-[1.25] mb-4">
              施工経験記述 文字数チェッカー
            </h1>
            <p className="text-[15px] sm:text-[16px] leading-[1.9] text-[var(--ink-body)]">
              <strong className="text-[var(--ink)]">1級・2級土木施工管理技士 第2次検定 問題1（施工経験記述）</strong>の答案が、本番の<strong className="text-[var(--ink)]">解答欄の字数</strong>に収まるかを無料でチェックします。級・出題形式・設問を選び、答案を貼り付けるだけ。
            </p>
          </div>
        </section>

        <KeikenCharcountClient />
      </main>

      <Footer />
    </div>
  );
}
