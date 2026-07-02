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
        {/* CTA を画像下部の余白帯へオーバーレイ（中央・下寄せ）。下地が明るいので濃紺ボタン＋影で目立たせる */}
        <a
          href="#exams"
          className="absolute bottom-[6%] sm:bottom-[8%] left-1/2 -translate-x-1/2 inline-flex items-center gap-2 font-mono text-[10px] sm:text-[12px] tracking-wider uppercase text-[var(--paper)] bg-[var(--accent)] px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-full shadow-lift hover:opacity-90 hover:-translate-y-px transition-all"
        >
          <span>資格を選んで学ぶ</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} />
        </a>
      </div>
    </section>
  );
}
