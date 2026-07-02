import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="w-full">
      {/* 視覚見出しはブランドバナー画像が担う。SEO / スクリーンリーダー用に本文見出しを sr-only で保持する */}
      <h1 className="sr-only">
        土木の試験対策を、ひとつに。土木・建設系の実務資格を、合格者が体系化した試験対策サイト。ここだけで合格を目指せます。
      </h1>
      {/* 全幅ブリード・枠なし・ヘッダー直下に密着。超ワイド画面ではネイティブ幅(1732)で頭打ち＋--paper でレターボックス（upscale ぼやけ防止） */}
      <div className="relative w-full flex justify-center bg-[var(--paper)]">
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
        {/* CTA を画像下部の余白帯へオーバーレイ（中央・下寄せ）。紺系ヒーローにコントラストが立つ琥珀色＋濃色文字で目立たせる */}
        <a
          href="#exams"
          className="absolute bottom-[7%] sm:bottom-[9%] left-1/2 -translate-x-1/2 inline-flex items-center gap-2.5 font-mono text-[13px] sm:text-[16px] font-bold tracking-wider uppercase text-[var(--ink)] bg-[var(--color-warn)] px-7 sm:px-10 py-3.5 sm:py-5 rounded-full shadow-lift hover:brightness-105 hover:-translate-y-0.5 transition-all"
        >
          <span>資格を選んで学ぶ</span>
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
        </a>
      </div>
    </section>
  );
}
