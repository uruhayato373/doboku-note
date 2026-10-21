"use client";

import { useSyncExternalStore } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { CareerArticleEndCard } from "@/config/affiliate-creatives";
import { AFFILIATE_EXPERIMENT_ID, AFFILIATE_VARIANTS, assignAffiliateVariant } from "@/lib/affiliate-experiment.mjs";
import { AFFILIATE_LINK_REFERRER_POLICY, AFFILIATE_LINK_REL, AffiliatePrBadge } from "@/components/ui/AffiliateParts";

let visitorVariant: string | null = null;
const subscribe = () => () => {};
const serverSnapshot = () => null;
/** 開発サーバーだけ: 管理画面の広告の見本（/affiliate/preview）が ?affiliateVariant= で案を固定する。保存しない。本番ビルドでは消える。 */
function previewVariant(): string | null {
  if (process.env.NODE_ENV !== "development") return null;
  const v = new URLSearchParams(window.location.search).get("affiliateVariant");
  return v && AFFILIATE_VARIANTS.includes(v) ? v : null;
}
function clientSnapshot(): string {
  if (!visitorVariant) visitorVariant = previewVariant();
  if (!visitorVariant) {
    let storage: Storage | undefined;
    try { storage = window.localStorage; } catch { /* ブラウザが保存を拒否する場合。 */ }
    visitorVariant = assignAffiliateVariant(storage);
  }
  return visitorVariant!;
}

const HEADLINES: Record<string, string> = {
  buildjob: "その資格と経験、いまの待遇に活きている？",
  "kensetsu-jobs": "現場の経験、次の働き方に活かそう。",
  "dx-consulting": "技術とマネジメント、その先のキャリアへ。",
};

/**
 * EXP-038: A＝今の文章カード（見出し・説明・箇条書き・ボタン）、B＝小型カード（見出し 1 行・要約 1 行・ボタン）。
 * B は幅 36rem 以上の枠（本文）で横一列、狭い枠（スマホ・幅 300px の欄）で縦に積む（container query）。
 * 公表実績の行は <p> にしない（記事本文の .prose-blog p + p が余白 1.5em を足す）。
 * 計測は両案共通の見出し領域（data-cta-exposure="heading"）が 50% 見えた時点。SSR では A を描き、案の確定前は数えない。
 */
export default function CareerAffiliateExperiment({ card, program, trackLabel, placement }: {
  readonly card: CareerArticleEndCard;
  readonly program: string;
  readonly trackLabel: string;
  readonly placement: string;
}) {
  const assigned = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const variant = assigned ?? "A";
  const title = HEADLINES[program];
  const link = {
    href: card.href,
    rel: AFFILIATE_LINK_REL,
    referrerPolicy: AFFILIATE_LINK_REFERRER_POLICY,
    target: "_blank",
    "data-cta": "affiliate",
    "data-cta-label": trackLabel,
    "data-cta-placement": placement,
    "data-cta-experiment": AFFILIATE_EXPERIMENT_ID,
    "data-cta-variant": assigned ?? undefined,
    "data-cta-program": program,
    style: { textDecoration: "none" },
  } as const;

  if (variant === "B") {
    return (
      <a
        {...link}
        className="career-experiment-card @container focus-ring group block rounded-card-content border border-l-4 border-(--rule-soft) border-l-brand bg-(--paper) text-ink-strong shadow-card-content transition-shadow hover:shadow-card-hover dark:border-(--rule-soft) dark:border-l-brand"
      >
        <div className="flex flex-col gap-3 px-4 py-3.5 @xl:flex-row @xl:items-center @xl:gap-5 @xl:px-5">
          <div data-cta-exposure="heading" className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs leading-5 text-ink-muted">
              <AffiliatePrBadge className="shrink-0" />
              <span className="min-w-0">{card.category}・{card.service}</span>
            </div>
            <div className="mt-1.5 text-balance text-[17px] font-bold leading-snug text-ink-strong">{title}</div>
            <p className="mt-1 text-[13px] leading-6 text-ink-body">{card.brief ?? card.description}</p>
            {card.proof && <div className="mt-0.5 text-xs leading-5 text-ink-muted">{card.proof}</div>}
          </div>
          <span className="flex shrink-0 items-center justify-between gap-2 rounded-card-content bg-(--color-affiliate-panel) px-4 py-2.5 text-sm font-bold leading-6 text-(--color-affiliate-on-panel) @xl:max-w-60">
            <span>{card.cta}</span><ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </span>
        </div>
      </a>
    );
  }

  return (
    <a
      {...link}
      className="career-experiment-card focus-ring group block overflow-hidden rounded-card-content border-[3px] border-brand bg-(--paper) text-ink-strong shadow-card-content transition-shadow hover:shadow-card-hover dark:border-brand"
    >
      <div className="bg-(--accent-fill) px-5 pt-5">
        <div data-cta-exposure="heading" className="min-h-36 pb-4">
          <div className="flex items-start justify-between gap-3">
            <span className="text-xs font-bold leading-5 text-brand-deep dark:text-brand">{card.category}</span>
            <AffiliatePrBadge className="shrink-0" />
          </div>
          <div className="mt-4 text-balance text-2xl font-bold leading-relaxed text-ink-strong">{title}</div>
        </div>
        <div className="pb-4 text-sm font-bold text-ink-muted">{card.service}</div>
      </div>
      <div className="p-5">
        <p className="text-sm leading-7 text-ink-body">{card.description}</p>
        {card.proof && <div className="mt-2 text-xs leading-5 text-ink-muted">{card.proof}</div>}
        <ul className="my-4 space-y-2">
          {card.points.map(point => (
            <li key={point} className="flex items-start gap-2 text-xs leading-5 text-ink-body">
              <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /><span>{point}</span>
            </li>
          ))}
        </ul>
        <span className="flex min-h-13 items-center justify-between gap-3 rounded-card-content bg-(--color-affiliate-panel) px-4 py-3 text-sm font-bold leading-6 text-(--color-affiliate-on-panel)">
          <span>{card.cta}</span><ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
        </span>
      </div>
    </a>
  );
}
