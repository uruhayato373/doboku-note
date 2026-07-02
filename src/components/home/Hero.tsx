import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    // 背景写真は全幅ブリード・ヘッダー直下に密着。テキストは HTML でオーバーレイ（リフロー/SEO/レスポンシブ最適）。
    <section className="relative w-full min-h-[440px] sm:min-h-[500px] lg:min-h-[580px] overflow-hidden bg-[var(--paper)]">
      <img
        src="/images/hero-home.webp"
        width={1945}
        height={809}
        alt="斜張橋と河川堤防の風景 — doboku-note"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      {/* 明るい写真の上でダーク文字を読みやすくする淡い白ベール（テーマ非依存＝白固定）。 */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-white/55 via-white/10 to-white/35"
      />
      {/* テキスト。背景写真は常に明色（テーマ非依存）のため、反転する --ink/--accent ではなく固定 slate で可読性を両テーマ担保。 */}
      <div className="relative z-10 mx-auto flex min-h-[440px] sm:min-h-[500px] lg:min-h-[580px] max-w-[1280px] flex-col items-center justify-center px-4 sm:px-6 lg:px-10 text-center">
        <h1 className="font-serif font-black tracking-tight leading-[1.16] text-slate-900 text-[30px] sm:text-[44px] lg:text-[56px] max-w-[20ch] text-balance [text-shadow:0_1px_10px_rgba(255,255,255,0.55)]">
          土木の試験対策を、ひとつに。
        </h1>
        <p className="mt-4 sm:mt-5 text-[14px] sm:text-[17px] leading-[1.9] text-slate-700 max-w-[46ch] [text-shadow:0_1px_8px_rgba(255,255,255,0.6)]">
          土木・建設系の実務資格を、合格者が体系化した試験対策サイト。
          <br className="hidden sm:block" />
          ここだけで合格を目指せます。
        </p>
        <a
          href="#exams"
          className="mt-7 sm:mt-9 inline-flex items-center gap-2.5 font-mono text-[13px] sm:text-[15px] font-bold tracking-wider uppercase text-slate-900 bg-[var(--color-warn)] px-7 sm:px-9 py-3.5 sm:py-4 rounded-full shadow-lift hover:brightness-105 hover:-translate-y-0.5 transition-all"
        >
          <span>資格を選んで学ぶ</span>
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
        </a>
      </div>
    </section>
  );
}
