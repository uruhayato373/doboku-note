import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    // 背景写真は全幅ブリード・ヘッダー直下に密着。テキストは HTML でオーバーレイ（リフロー/SEO/レスポンシブ最適）。
    <section className="relative w-full min-h-[460px] sm:min-h-[520px] lg:min-h-[600px] overflow-hidden bg-[var(--paper)]">
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
      {/* テキストは元バナーの文言を踏襲。背景写真は常に明色（テーマ非依存）のため、反転する
          --ink/--accent を避け固定 slate＋白テキストシャドウで両テーマの可読性を担保。 */}
      <div className="relative z-10 mx-auto flex min-h-[460px] sm:min-h-[520px] lg:min-h-[600px] max-w-[1280px] flex-col items-center justify-center px-4 sm:px-6 lg:px-10 text-center">
        <h1 className="flex flex-col items-center gap-2.5 sm:gap-3.5">
          <span className="font-sans text-[12px] sm:text-[15px] tracking-[0.15em] text-slate-700 [text-shadow:0_1px_8px_rgba(255,255,255,0.6)]">
            合格に必要な知識を、わかりやすく。
          </span>
          <span className="font-serif font-black leading-none tracking-tight text-slate-900 text-[42px] sm:text-[64px] lg:text-[80px] [text-shadow:0_2px_14px_rgba(255,255,255,0.6)]">
            doboku-note
          </span>
          <span className="flex items-center gap-3 sm:gap-4 text-slate-800 [text-shadow:0_1px_8px_rgba(255,255,255,0.6)]">
            <span aria-hidden="true" className="h-px w-6 sm:w-10 bg-slate-500/60" />
            <span className="font-sans text-[14px] sm:text-[19px] tracking-[0.25em] pl-[0.25em]">
              土木・建設資格の学習ノート
            </span>
            <span aria-hidden="true" className="h-px w-6 sm:w-10 bg-slate-500/60" />
          </span>
        </h1>
        <p className="mt-4 sm:mt-5 font-sans text-[13px] sm:text-[16px] text-slate-700 [text-shadow:0_1px_8px_rgba(255,255,255,0.6)]">
          学ぶ人の『理解』を支え、『合格』へつなぐ。
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
