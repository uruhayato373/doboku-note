"use client";

import { useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import type { CareerArticleEndCard, SidebarAdCreative } from "@/config/affiliate-creatives";
import { AFFILIATE_EXPERIMENT_ID, AFFILIATE_VARIANTS, assignAffiliateVariant } from "@/lib/affiliate-experiment.mjs";
import { AFFILIATE_LINK_REFERRER_POLICY, AFFILIATE_LINK_REL, AffiliatePrBadge, TrackingPixel } from "@/components/ui/AffiliateParts";

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

/** 訪問者の案（SSR と案の確定前は null）。カードとページ単位のピクセルで同じ割り当てを使う。 */
function useAffiliateVariant(): string | null {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}

type PixelSource = {
  /** 発火源のときだけ渡すバナーのピクセル（無ければこの面からは出さない） */
  readonly src: string | undefined;
  readonly textHref?: string | undefined;
  readonly textPixelSrc?: string | undefined;
};

/** その案のリンクと同じ素材のピクセル。textHref のある案件（ビルドジョブ）の B はテキスト素材のピクセル（無ければ出さない）。 */
function pixelForVariant(assigned: string, { src, textHref, textPixelSrc }: PixelSource): string | undefined {
  return assigned === "B" && textHref ? textPixelSrc : src;
}

/**
 * 実験面の計測ピクセル。案が決まってから、その案のリンクと同じ素材のピクセルを 1 発出す。
 * 案の確定前（SSR）は発火源の印（data-a8-pixel）だけを残し、静的 HTML の 1 ページ 1 ピクセル検査（check-cta-density）がこれを数える。
 */
function ExperimentPixel({ assigned, ...source }: PixelSource & { readonly assigned: string | null }) {
  if (!source.src) return null;
  if (assigned === null) return <span hidden data-a8-pixel={source.src} />;
  return <TrackingPixel src={pixelForVariant(assigned, source)} />;
}

/** ページ単位の計測ピクセル（DocPage が本文の後に置く 1 発）。 */
export function AffiliateExperimentPixel(source: PixelSource & { readonly src: string }) {
  return <ExperimentPixel assigned={useAffiliateVariant()} {...source} />;
}

const HEADLINES: Record<string, string> = {
  buildjob: "その資格と経験、いまの待遇に活きている？",
  "kensetsu-jobs": "現場の経験、次の働き方に活かそう。",
  "dx-consulting": "技術とマネジメント、その先のキャリアへ。",
};

/**
 * EXP-043: B＝小型カード（見出し 1 行・要約 1 行・ボタン）、C＝支給の 300×250 バナー＋ボタン。
 * どちらも幅 36rem 以上の枠（本文）で横一列、狭い枠（スマホ・幅 300px の欄）で縦に積む（container query）。
 * バナーは A8 の画像を縮小だけで使い、切り抜き・重ね書きをしない（PR はバナーの外に出す）。
 * 公表実績の行は <p> にしない（記事本文の .prose-blog p + p が余白 1.5em を足す）。
 * 計測は data-cta-exposure="heading"（B は見出し、C はバナー）が 50% 見えた時点。SSR では B を描き、案の確定前は数えない。
 * 計測ピクセルは案が決まってから出す。textHref のある案件（ビルドジョブ）の B はテキスト素材のリンクとピクセル。
 */
export default function CareerAffiliateExperiment({ card, program, trackLabel, placement, banner, textHref, textPixelSrc, pixelSrc }: {
  readonly card: CareerArticleEndCard;
  readonly program: string;
  readonly trackLabel: string;
  readonly placement: string;
  readonly banner: SidebarAdCreative;
  readonly textHref?: string | undefined;
  readonly textPixelSrc?: string | undefined;
  /** 1 ページ 1 ピクセルの発火源のときだけ渡す（banner のピクセル） */
  readonly pixelSrc?: string | undefined;
}) {
  const assigned = useAffiliateVariant();
  const variant = assigned ?? AFFILIATE_VARIANTS[0];
  const title = HEADLINES[program];
  const href = variant === "B" && textHref ? textHref : card.href;
  const pixel = <ExperimentPixel assigned={assigned} src={pixelSrc} textHref={textHref} textPixelSrc={textPixelSrc} />;
  const link = {
    href,
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
  const button = (extra = "") => (
    <span className={`flex shrink-0 items-center justify-between gap-2 rounded-card-content bg-(--color-affiliate-panel) px-4 py-2.5 text-sm font-bold leading-6 text-(--color-affiliate-on-panel) ${extra}`}>
      <span>{card.cta}</span><ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
    </span>
  );

  if (variant === "C") {
    return (
      <>
        <a
          {...link}
          className="career-experiment-card @container focus-ring group block rounded-card-content border border-(--rule-soft) bg-(--paper) text-ink-strong shadow-card-content transition-shadow hover:shadow-card-hover dark:border-(--rule-soft)"
        >
          <div className="flex flex-col gap-3 p-3 @xl:flex-row @xl:items-center @xl:gap-5 @xl:p-4">
            <div data-cta-exposure="heading" className="mx-auto w-full max-w-[300px] shrink-0 @xl:mx-0">
              <img
                src={banner.imageSrc}
                alt={banner.alt}
                width={banner.width}
                height={banner.height}
                loading="lazy"
                // 300×250 未満の素材（もしもの 250×250）を引き伸ばさない
                style={{ maxWidth: banner.width }}
                className="mx-auto block h-auto w-full"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-center gap-2 text-xs leading-5 text-ink-muted">
                <AffiliatePrBadge className="shrink-0" />
                <span className="min-w-0">{card.category}・{card.service}</span>
              </div>
              {button()}
            </div>
          </div>
        </a>
        {pixel}
      </>
    );
  }

  return (
    <>
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
          {button("@xl:max-w-60")}
        </div>
      </a>
      {pixel}
    </>
  );
}
