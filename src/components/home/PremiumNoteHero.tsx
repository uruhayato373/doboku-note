import Image from "next/image";
import Link from "next/link";

// トップ最下部の「note有料教材」CTA ヒーロー。ブランド背景（cta-bg/note-hero.webp・左空き/右にモチーフ）＋
// 左の余白に HTML 文字（濃色＋白グロー＋薄い白スクリムで可読）。文字は焼き込まない（brand-image-system.md）。
// /links（全資格横断の note 教材ハブ）へ内部遷移。クリックは data-cta="note" で計測（note ファネル効率 KPI）。
// 背景は常に明色のため文字は --on-image-*（テーマ非追従の固定濃色）を使う（--ink だと dark で白化して消える）。

const HALO = {
  textShadow: "0 1px 2px rgba(255,255,255,0.95), 0 0 14px rgba(255,255,255,0.85)",
};

export default function PremiumNoteHero() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 pt-10 sm:px-6 lg:px-10">
      <Link
        href="/links"
        data-cta="note"
        data-cta-label="home-note-hero"
        className="group relative block aspect-[16/10] w-full overflow-hidden rounded-card-section border border-[var(--rule-soft)] shadow-card-content transition-shadow hover:shadow-card-hover sm:aspect-[24/9]"
      >
        <Image
          src="/images/cta-bg/note-hero.webp"
          alt=""
          fill
          sizes="(max-width: 1280px) 100vw, 1200px"
          className="object-cover object-[70%_center] sm:object-center"
        />
        {/* モバイルの center クロップでも左の文字が読めるよう、左側だけ薄い白スクリム（固定白＝dark でも明色地に整合） */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/35 to-transparent sm:via-white/20" />
        <div className="absolute inset-y-0 left-0 flex w-[72%] flex-col items-start justify-center pl-5 pr-3 text-[var(--on-image-ink)] sm:w-[54%] sm:pl-10">
          <span
            className="font-mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--on-image-ink-soft)] sm:text-[11px]"
            style={HALO}
          >
            Premium / note有料教材
          </span>
          <span className="mt-1.5 font-serif text-[22px] font-black leading-tight sm:text-[34px]" style={HALO}>
            記述式・経験記述を
            <br />
            ここで固める
          </span>
          <span
            className="mt-2 text-[12px] font-bold text-[var(--on-image-ink-soft)] sm:text-[14px]"
            style={HALO}
          >
            模範答案集・経験記述・精読ガイドをまとめています
          </span>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--on-image-pill-bg)] px-4 py-1.5 text-[13px] font-black text-white shadow-card-content transition-transform group-hover:translate-x-0.5 sm:mt-4 sm:text-[14px]">
            教材を見る
            <span aria-hidden>›</span>
          </span>
        </div>
      </Link>
    </section>
  );
}
