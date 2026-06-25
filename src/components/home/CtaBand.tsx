import Link from "next/link";

interface CtaBandProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaLabel: string;
  ctaHref: string;
  /** GA4 クリック計測（note 導線等）。Header/Analytics のデリゲートリスナーが拾う。 */
  dataCta?: string;
  dataCtaLabel?: string;
}

/**
 * セクション間に繰り返し置く CTA バンド（socialplus 参考の反復 CTA 帯）。全幅淡青帯＋中央寄せ＋
 * accent ボタン。doboku トークンのみ＝dark 自動追従（ボタン bg-accent/text-paper は両モードで可読）。
 */
export default function CtaBand({
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  dataCta,
  dataCtaLabel,
}: CtaBandProps) {
  return (
    <section className="border-y border-[var(--rule-soft)] bg-[var(--accent-fill)]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16 text-center">
        {eyebrow && (
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--ink-muted)] mb-3">
            {eyebrow}
          </div>
        )}
        <h2 className="font-serif font-black text-2xl sm:text-3xl text-[var(--ink)] text-balance">{title}</h2>
        {subtitle && (
          <p className="mt-3 text-[14px] sm:text-[15px] leading-[1.9] text-[var(--ink-body)] max-w-[52ch] mx-auto">
            {subtitle}
          </p>
        )}
        <div className="mt-7">
          <Link
            href={ctaHref}
            data-cta={dataCta}
            data-cta-label={dataCtaLabel}
            className="inline-flex items-center gap-2 font-mono text-[12px] tracking-wider uppercase text-[var(--paper)] bg-[var(--accent)] px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            <span>{ctaLabel}</span>
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
