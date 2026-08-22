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
        className="hero-overlay absolute inset-0"
      />
      {/* テキストは元バナーの文言を踏襲。背景写真は常に明色（テーマ非依存）のため、反転する
          --ink/--accent を避け固定 slate＋白テキストシャドウで両テーマの可読性を担保。 */}
      <div className="relative z-10 mx-auto flex min-h-[460px] sm:min-h-[520px] lg:min-h-[600px] max-w-[1280px] flex-col items-center justify-center px-4 sm:px-6 lg:px-10 text-center">
        <h1 className="flex flex-col items-center gap-2.5 sm:gap-3.5">
          <span className="hero-ink-soft hero-shadow-soft font-sans text-[12px] tracking-[0.15em] sm:text-[15px]">
            合格に必要な知識を、わかりやすく。
          </span>
          <span className="hero-ink hero-shadow-strong font-serif text-[42px] font-black leading-none tracking-tight sm:text-[64px] lg:text-[80px]">
            doboku-note
          </span>
          <span className="hero-ink hero-shadow-soft flex items-center gap-3 sm:gap-4">
            <span aria-hidden="true" className="hero-rule h-px w-6 sm:w-10" />
            <span className="font-sans text-[14px] sm:text-[19px] tracking-[0.25em] pl-[0.25em]">
              土木・建設資格の学習ノート
            </span>
            <span aria-hidden="true" className="hero-rule h-px w-6 sm:w-10" />
          </span>
        </h1>
        <p className="hero-ink-soft hero-shadow-soft mt-4 font-sans text-[13px] sm:mt-5 sm:text-[16px]">
          学ぶ人の『理解』を支え、『合格』へつなぐ。
        </p>
        <a
          href="#exams"
          className="hero-ink mt-7 inline-flex items-center gap-2.5 rounded-full bg-warn px-7 py-3.5 font-mono text-[13px] font-bold uppercase tracking-wider shadow-lift transition-[filter,transform] hover:-translate-y-0.5 hover:brightness-105 sm:mt-9 sm:px-9 sm:py-4 sm:text-[15px]"
        >
          <span>資格を選んで学ぶ</span>
          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
        </a>
      </div>
    </section>
  );
}
