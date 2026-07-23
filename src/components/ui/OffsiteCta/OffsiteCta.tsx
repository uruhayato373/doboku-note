import type { OffsiteCtaItem, OffsiteChannel } from '@/lib/offsite-cta';

/**
 * OffsiteCta — 記事末尾に出す外部チャネル（ココナラ / Brain）導線カード。
 * 配線・出し分けは offsite-cta.ts（slug → listed 商品）に一任し、ここは描画のみ。
 * 自社チャネル（アフィリではない）ため PR 表記は不要。外部 URL に UTM は付けない。
 * クリックは data-cta="coconala"|"brain" を AnalyticsProvider が計測する。
 */
const CHANNEL_LABEL: Record<OffsiteChannel, string> = {
  coconala: 'ココナラ',
  brain: 'Brain',
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
              rel="noopener nofollow"
              data-cta={it.channel}
              data-cta-label={it.trackLabel}
              className="group flex h-full flex-col rounded-card-content border border-[var(--rule-soft)] bg-[var(--accent-fill)] px-4 py-3.5 transition-colors hover:border-[var(--accent)]"
            >
              <span className="mb-1.5 inline-flex w-fit items-center rounded-full border border-[var(--rule-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-muted)]">
                {CHANNEL_LABEL[it.channel]}
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
    </div>
  );
}
