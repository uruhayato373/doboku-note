import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative h-[280px] w-full overflow-hidden bg-white sm:h-[320px]">
      <img
        src="/images/hero-home-sensei.webp"
        width={1942}
        height={809}
        alt="doboku先生と橋のイラスト"
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="absolute -right-10 top-[35px] h-[150px] w-auto max-w-none min-[390px]:-right-[30px] min-[390px]:h-[180px] sm:right-0 sm:top-0 sm:h-full"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-r from-white via-white/70 to-transparent sm:via-white/10" />
      <div className="relative z-10 mx-auto max-w-[1280px] px-4 pt-10 sm:px-6 sm:pt-[75px] lg:px-10">
        <h1 className="hero-ink font-serif text-[32px] font-black leading-tight tracking-tight sm:text-[56px]">doboku-note</h1>
        <p className="hero-ink-soft mt-3 text-[12px] sm:text-[17px]">土木・建設資格の学習ノート</p>
        <div className="mt-6 flex max-w-[215px] flex-wrap gap-2 sm:max-w-none sm:gap-3">
          <a href="#exams" className="hero-ink focus-ring inline-flex min-h-11 items-center gap-2 rounded-card-content bg-warn px-4 py-3 text-[12px] font-bold shadow-card-content transition-[filter] hover:brightness-105 sm:px-5 sm:text-[14px]">
            資格を選んで学ぶ
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
          <Link href="/search" className="hero-ink focus-ring inline-flex min-h-11 items-center gap-2 rounded-card-content border border-brand/30 bg-white px-4 py-3 text-[12px] font-bold transition-[filter] hover:brightness-95 dark:border-brand/30 sm:px-5 sm:text-[14px]">
            <Search className="h-4 w-4" aria-hidden="true" />
            用語・過去問を検索
          </Link>
        </div>
      </div>
    </section>
  );
}
