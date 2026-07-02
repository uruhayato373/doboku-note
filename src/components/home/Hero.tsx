import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="w-full">
      {/* 視覚見出しはブランドバナー画像が担う。SEO / スクリーンリーダー用に本文見出しを sr-only で保持する */}
      <h1 className="sr-only">
        土木の試験対策を、ひとつに。土木・建設系の実務資格を、合格者が体系化した試験対策サイト。ここだけで合格を目指せます。
      </h1>
      {/* 全幅ブリード・枠なし・ヘッダー直下に密着。超ワイド画面ではネイティブ幅(1732)で頭打ち＋--paper でレターボックス（upscale ぼやけ防止） */}
      <div className="w-full flex justify-center bg-[var(--paper)]">
        <img
          src="/images/hero-home.webp"
          width={1732}
          height={908}
          alt="doboku-note — 土木・建設資格の学習ノート。合格に必要な知識を、わかりやすく。"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="block w-full max-w-[1732px] h-auto"
        />
      </div>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 mt-8 sm:mt-10 pb-2 flex items-center justify-center">
        <a
          href="#exams"
          className="inline-flex items-center gap-2 font-mono text-[12px] tracking-wider uppercase text-[var(--paper)] bg-[var(--accent)] px-5 py-3 rounded-full hover:opacity-90 transition-opacity"
        >
          <span>資格を選んで学ぶ</span>
          <ArrowRight className="w-4 h-4" strokeWidth={2} />
        </a>
      </div>
    </section>
  );
}
