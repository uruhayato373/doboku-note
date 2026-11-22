import Link from 'next/link';
import HubCtaBanner from '@/components/ui/HubCtaBanner/HubCtaBanner';
import Arrow from '@/components/ui/Arrow/Arrow';
import { resolveHubCta } from '@/lib/hub-cta';
import { WIDE_CONTAINER } from '@/components/layout/container';
import businessDirection from '../../../config/business-direction.json';

/**
 * トップの「いまの教材」。重点資格（事業の方針の台帳 business-direction の qualifications）ごとに、資格トップと同じ note の案内
 * （平時は資格のもくじ・試験の前後の決まった期間はその時期の商品。決まりは note の案内の台帳 site-cta-surfaces と src/lib/hub-cta.ts）を
 * 完成画像のタイル（HubCtaBanner）で並べる。以前は資格を問わない 1 枚のヒーロー（/links へ）がページの 67% の位置にあり、
 * 表示がトップのセッションの 12% だった（2026-11-22・GA4 の 28 日）ので、資格カードの直後へ上げた。
 * 計測は HubCtaBanner の data-cta="note"（label は category-<資格>-hub-…-home。site-to-sales が商品へ結ぶ）。
 */
const FOCUS = (businessDirection as { qualifications: { id: string }[] }).qualifications.map((q) => q.id);

export default function NoteNowSection() {
  const ctas = FOCUS.flatMap((category) => {
    const cta = resolveHubCta(category, { utmSuffix: 'home' });
    return cta ? [cta] : [];
  });
  if (ctas.length === 0) return null;
  return (
    <section className={`${WIDE_CONTAINER} py-8 sm:py-10`} aria-labelledby="home-note-now">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
        <div>
          <h2 id="home-note-now" className="font-serif text-2xl font-black text-(--ink) sm:text-3xl">いまの教材</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-(--ink-body)">試験の時期に合わせて、いま読むべき note の教材を資格ごとに案内しています。</p>
        </div>
        <Link
          href="/links"
          data-cta="note"
          data-cta-label="home-note-all"
          data-cta-placement="home-note-now"
          className="focus-ring inline-flex min-h-11 items-center gap-1 rounded-card-inline text-[14px] font-bold text-(--accent) hover:underline"
        >
          すべての教材を見る <Arrow />
        </Link>
      </div>
      {/* 画像の右に説明が並ぶ形なので、1 枚に 2 列分の幅を取る（4 列では説明が 1 行 4 文字まで詰まった） */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {ctas.map((cta) => (
          <HubCtaBanner key={cta.qualification} cta={cta} placement="home-note-now" wide />
        ))}
      </div>
    </section>
  );
}
