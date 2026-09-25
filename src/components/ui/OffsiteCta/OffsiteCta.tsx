import type { OffsiteCtaItem, OffsiteChannel } from '@/lib/offsite-cta';
import { AFFILIATE_LINK_REL, AffiliatePrBadge, TrackingPixel } from '@/components/ui/AffiliateParts';
import { COCONALA_A8_PIXEL } from '@/config/affiliate-creatives';

/**
 * OffsiteCta — 記事末尾に出す外部チャネル（ココナラ）導線カード。
 * 配線・出し分けは offsite-cta.ts（slug → listed 商品）に一任し、ここは描画のみ。
 * ココナラは自社出品だが A8 の商品リンク経由（会員登録 ¥100）なので、affiliate=true の項目に
 * PR 表記と rel=sponsored を付け、A8 計測ピクセルを 1 ページ 1 発だけ置く（2026-09-24〜）。
 * クリックは data-cta="coconala" を AnalyticsProvider が計測する。
 */
const CHANNEL_LABEL: Record<OffsiteChannel, string> = {
  coconala: 'ココナラ',
};

export default function OffsiteCta({ items }: { readonly items: readonly OffsiteCtaItem[] }) {
  if (!items.length) return null;
  return (
    <div className="not-prose mt-8">
      <div className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">
        この記事に関連するサービス
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.trackLabel}>
            <a
              href={it.href}
              target="_blank"
              rel={it.affiliate ? AFFILIATE_LINK_REL : 'noopener nofollow'}
              data-cta={it.channel}
              data-cta-label={it.trackLabel}
              data-cta-placement="article-end-offsite"
              className="group flex h-full flex-col rounded-card-content border border-[var(--rule-soft)] bg-[var(--accent-fill)] px-4 py-3.5 transition-colors hover:border-[var(--accent)]"
            >
              <span className="mb-1.5 flex items-center gap-1.5">
                <span className="inline-flex w-fit items-center rounded-full border border-[var(--rule-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-muted)]">
                  {CHANNEL_LABEL[it.channel]}
                </span>
                {it.affiliate && <AffiliatePrBadge />}
              </span>
              <span className="text-sm leading-6 text-ink-body">{it.catch}</span>
              <span className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-[14px] font-bold text-[var(--accent)] group-hover:underline">
                  {it.shortTitle}
                  <span aria-hidden className="ml-0.5 transition-transform group-hover:translate-x-0.5">
                    ›
                  </span>
                </span>
                <span className="shrink-0 text-xs text-[var(--ink-muted)]">{it.price}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      {/* A8 ココナラの計測ピクセル。ページ内で OffsiteCta は 1 回だけ描画されるので、ここで 1 発に限る。 */}
      <TrackingPixel src={items.some((it) => it.affiliate) ? COCONALA_A8_PIXEL : undefined} />
    </div>
  );
}
