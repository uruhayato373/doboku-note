"use client";

import { useSyncExternalStore } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { CareerArticleEndCard, SidebarAdCreative } from "@/config/affiliate-creatives";
import { AFFILIATE_EXPERIMENT_ID, assignAffiliateVariant } from "@/lib/affiliate-experiment.mjs";
import { AFFILIATE_LINK_REFERRER_POLICY, AFFILIATE_LINK_REL, AffiliatePrBadge } from "@/components/ui/AffiliateParts";

let visitorVariant: string | null = null;
const subscribe = () => () => {};
const serverSnapshot = () => null;
function clientSnapshot(): string {
  if (!visitorVariant) {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* ブラウザが保存を拒否する場合。 */ }
    visitorVariant = assignAffiliateVariant(storage);
  }
  return visitorVariant!;
}

const HEADLINES: Record<string, { regular: string; dark: string }> = {
  buildjob: { regular: "その資格と経験、いまの待遇に活きている？", dark: "頑張る場所まで、変えていい。" },
  "kensetsu-jobs": { regular: "現場の経験、次の働き方に活かそう。", dark: "続けたい仕事。変えたい働き方。" },
  "dx-consulting": { regular: "技術とマネジメント、その先のキャリアへ。", dark: "現場で培った判断力を、次の仕事へ。" },
};

/** SSR でも内容を描画する。案が確定する前の A は実験の表示に数えない。 */
export default function CareerAffiliateExperiment({ card, banner, program, trackLabel, placement }: {
  readonly card: CareerArticleEndCard;
  readonly banner: SidebarAdCreative;
  readonly program: string;
  readonly trackLabel: string;
  readonly placement: string;
}) {
  const assigned = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const variant = assigned ?? "A";
  const dark = variant === "C";
  const title = HEADLINES[program];
  return (
    <a
      href={card.href}
      rel={AFFILIATE_LINK_REL}
      referrerPolicy={AFFILIATE_LINK_REFERRER_POLICY}
      target="_blank"
      data-cta="affiliate"
      data-cta-label={trackLabel}
      data-cta-placement={placement}
      data-cta-experiment={AFFILIATE_EXPERIMENT_ID}
      data-cta-variant={assigned ?? undefined}
      data-cta-program={program}
      style={{ textDecoration: "none" }}
      className={`career-experiment-card focus-ring group block overflow-hidden rounded-card-content border-[3px] border-brand shadow-card-content transition-shadow hover:shadow-card-hover dark:border-brand ${dark ? "bg-(--color-affiliate-panel) text-(--color-affiliate-on-panel)" : "bg-(--paper) text-ink-strong"}`}
    >
      <div className={`px-5 pt-5 ${dark ? "" : "bg-(--accent-fill)"}`}>
        <div data-cta-exposure="heading" className="min-h-36 pb-4">
          <div className="flex items-start justify-between gap-3">
            <span className={`text-xs font-bold leading-5 ${dark ? "text-white" : "text-brand-deep dark:text-brand"}`}>{card.category}</span>
            <AffiliatePrBadge className="shrink-0" />
          </div>
          <div className={`mt-4 text-balance text-2xl font-bold leading-relaxed ${dark ? "text-(--color-affiliate-on-panel)" : "text-ink-strong"}`}>{dark ? title?.dark : title?.regular}</div>
        </div>
        <div className={`pb-4 text-sm font-bold ${dark ? "text-white" : "text-ink-muted"}`}>{card.service}</div>
      </div>
      {variant === "B" && (
        <div className="border-y border-(--rule-soft) bg-(--paper) px-3 py-4 dark:border-(--rule-soft)">
          <img src={banner.imageSrc} alt={banner.alt} width={banner.width} height={banner.height} loading="lazy" className="mx-auto block h-auto w-full max-w-[300px]" />
        </div>
      )}
      <div className="p-5">
        <p className={`text-sm leading-7 ${dark ? "text-white" : "text-ink-body"}`}>{card.description}</p>
        <ul className="my-4 space-y-2">
          {card.points.map(point => (
            <li key={point} className={`flex items-start gap-2 text-xs leading-5 ${dark ? "text-white" : "text-ink-body"}`}>
              <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{point}</span>
            </li>
          ))}
        </ul>
        <span className={`flex min-h-13 items-center justify-between gap-3 rounded-card-content px-4 py-3 text-sm font-bold leading-6 ${dark ? "bg-(--color-affiliate-on-panel) text-(--color-affiliate-panel)" : "bg-(--color-affiliate-panel) text-(--color-affiliate-on-panel)"}`}>
          <span>{card.cta}</span><ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
        </span>
      </div>
    </a>
  );
}
