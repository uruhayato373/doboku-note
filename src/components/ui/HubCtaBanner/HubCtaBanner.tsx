import Image from 'next/image';
import { type ResolvedHubCta } from '@/lib/hub-cta';

// カテゴリ hub 本文の note CTA。資格別リッチ背景（cta-bg/*.webp・右にモチーフ/左空き）＋
// 左の余白へ HTML 文字（濃色＋白グローで可読）。文言/価格/リンク先は resolveHubCta がデータ駆動で供給。
// 幅広面は「もくじ」へ集約し、直前期のみ特定商品へ直リンク（mode で分岐）。クリックは data-cta="note" で計測。
// 色は --exam-* / --ink / --color-warn トークンを使用（生 hex 直書きなし）。

const HALO = { textShadow: '0 1px 2px rgba(255,255,255,0.95), 0 0 12px rgba(255,255,255,0.85)' };

export default function HubCtaBanner({ cta }: { cta: ResolvedHubCta }) {
  return (
    <a
      href={cta.url}
      target="_blank"
      rel="noopener noreferrer"
      data-cta="note"
      data-cta-label={cta.trackLabel}
      className="group relative block aspect-[6/5] w-full max-w-[360px] overflow-hidden rounded-card-content border border-[var(--rule-soft)] shadow-card-content transition-shadow hover:shadow-card-hover"
    >
      <Image src={cta.bg} alt="" fill sizes="360px" className="object-cover" />
      <div className="absolute inset-y-0 left-0 flex w-[56%] flex-col items-start justify-center pl-5 pr-1 text-[var(--ink)]">
        <span className="text-[12px] font-extrabold tracking-wide" style={{ color: `var(${cta.themeVar})`, ...HALO }}>
          ＼ note限定 ／
        </span>
        <span className="text-[12px] font-extrabold" style={HALO}>{cta.qual}</span>
        <span className="text-[19px] font-black leading-tight" style={HALO}>{cta.title1}</span>
        {cta.title2 && <span className="text-[21px] font-black leading-tight" style={HALO}>{cta.title2}</span>}
        <span className="mt-0.5 text-[11px] font-bold text-[var(--ink-body)]" style={HALO}>{cta.sub}</span>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-warn)] px-3 py-1 text-[13px] font-black text-white shadow-card-content">
          {cta.price ?? cta.cta}
          <span aria-hidden>›</span>
        </span>
      </div>
    </a>
  );
}
