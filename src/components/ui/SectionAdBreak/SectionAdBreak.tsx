import type { ReactNode } from 'react';
import AdSlot from '@/components/ads/AdSlot';
import { CTA_STACK_CLASS } from '@/lib/cta-stack';

/**
 * 区画と区画の間の広告（資格トップの本文の一覧の切れ目）。記事の本文は article-inline-slots、記事の一覧はインフィード
 * （feed-ads）、右の欄は rail-continuation が決めるのに対し、区画の切れ目の決まりをここに置く（2026-11-22）。
 *
 * - PC: AdSense の記事内広告（ネイティブ・inArticle）を 1 枠。右の欄に note・転職があるので、本文側は広告だけを置く。
 * - スマホ: 呼び出し側が渡した転職バナー（1 つ目の切れ目）か、AdSense（2 つ目以降の切れ目）。note の案内が一覧の下にある
 *   資格は、広告を note より先に出さないために何も出さない（mobile={null}・mobileAd={false}）。
 * 隠れた枠（片方の幅の側）は AdSlot が広告を要求しない（幅 0）。
 */
export default function SectionAdBreak({ mobile = null, mobileAd = false }: {
  /** スマホで出す転職バナーなど（指定したときは mobileAd より優先） */
  readonly mobile?: ReactNode;
  /** スマホでも AdSense を出す */
  readonly mobileAd?: boolean;
}) {
  return (
    <div data-section-ad-break className="my-10">
      <div className={`hidden zenn-desktop:block ${CTA_STACK_CLASS}`}>
        <AdSlot slot="inArticle" />
      </div>
      {mobile ? (
        <div className="zenn-desktop:hidden">{mobile}</div>
      ) : mobileAd ? (
        <div className={`zenn-desktop:hidden ${CTA_STACK_CLASS}`}>
          <AdSlot slot="inArticle" />
        </div>
      ) : null}
    </div>
  );
}
