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

/** その案のリンクと同じ素材のピクセル。textHref のある案件（ビルドジョブ）は小型カードがテキスト素材なので、そのピクセル（無ければ出さない）。 */
function pixelForVariant({ src, textHref, textPixelSrc }: PixelSource): string | undefined {
  return textHref ? textPixelSrc : src;
}

/**
 * 実験面の計測ピクセル。案が決まってから、リンクと同じ素材のピクセルを 1 発出す。
 * 案の確定前（SSR）は発火源の印（data-a8-pixel）だけを残し、静的 HTML の 1 ページ 1 ピクセル検査（check-cta-density）がこれを数える。
 */
function ExperimentPixel({ assigned, ...source }: PixelSource & { readonly assigned: string | null }) {
  if (!source.src) return null;
  if (assigned === null) return <span hidden data-a8-pixel={source.src} />;
  return <TrackingPixel src={pixelForVariant(source)} />;
}

/** ページ単位の計測ピクセル（DocPage が本文の後に置く 1 発）。 */
export function AffiliateExperimentPixel(source: PixelSource & { readonly src: string }) {
  return <ExperimentPixel assigned={useAffiliateVariant()} {...source} />;
}

const HEADLINES: Record<string, string> = {
  buildjob: "その資格と経験、いまの待遇に活きている？",
  "kensetsu-jobs": "現場の経験、次の働き方に活かそう。",
  "dx-consulting": "技術とマネジメント、その先のキャリアへ。",
  "kenchiku-tenshoku": "建築の経験、次の現場選びに活かそう。",
  constwork: "施工管理の経験、条件で選び直そう。",
};

/** 2 枚並べを出す幅（PC）。スマホ・タブレットは縦に積むと 1 画面の大半を占めるので 1 枚（訴求設計 §12.2） */
const TWO_UP_QUERY = "(min-width: 1024px)";
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(TWO_UP_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const wideSnapshot = () => window.matchMedia(TWO_UP_QUERY).matches;
const wideServerSnapshot = () => false;

/** 2 枚並べの 2 枚目（配置ルールの pairs で決まった案件） */
export type SecondaryCard = {
  readonly card: CareerArticleEndCard;
  readonly program: string;
  readonly textHref?: string | undefined;
  readonly textPixelSrc?: string | undefined;
  /** 2 枚目の案件の計測ピクセル（バナー素材）。2 枚目が出るときだけ、その案件の 1 発として出す */
  readonly pixelSrc: string;
};

function SmallCard({ card, program, trackLabel, placement, textHref, assigned }: {
  readonly card: CareerArticleEndCard;
  readonly program: string;
  readonly trackLabel: string;
  readonly placement: string;
  readonly textHref?: string | undefined;
  readonly assigned: string | null;
}) {
  const title = HEADLINES[program];
  return (
    <a
      href={textHref ?? card.href}
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
      className="career-experiment-card @container focus-ring group block h-full rounded-card-content border border-l-4 border-(--rule-soft) border-l-brand bg-(--paper) text-ink-strong shadow-card-content transition-shadow hover:shadow-card-hover dark:border-(--rule-soft) dark:border-l-brand"
    >
      <div className="flex h-full flex-col gap-3 px-4 py-3.5 @xl:flex-row @xl:items-center @xl:gap-5 @xl:px-5">
        <div data-cta-exposure="heading" className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs leading-5 text-ink-muted">
            <AffiliatePrBadge className="shrink-0" />
            <span className="min-w-0">{card.category}・{card.service}</span>
          </div>
          {title && <div className="mt-1.5 text-balance text-[17px] font-bold leading-snug text-ink-strong">{title}</div>}
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

/**
 * 転職の小型カード（EXP-043 で B を採用）。EXP-048: B＝1 枚、B2＝PC（幅 1024px 以上）で同じ枠に 2 社を横に並べる。
 * 2 枚目は組（secondary）がある面だけ。スマホ・タブレット・組の無い面では B2 も 1 枚で、2 枚目のピクセルも出さない。
 * 幅 36rem 以上の枠は横一列、狭い枠（スマホ・2 枚並べの各カード）は縦に積む（container query）。
 * 公表実績の行は <p> にしない（記事本文の .prose-blog p + p が余白 1.5em を足す）。
 * 計測は data-cta-exposure="heading" が 50% 見えた時点。SSR では 1 枚を描き、案の確定前は数えない。
 * 計測ピクセルは案が決まってから出す。textHref のある案件（ビルドジョブ）はテキスト素材のリンクとピクセル。
 */
export default function CareerAffiliateExperiment({ card, program, trackLabel, placement, textHref, textPixelSrc, pixelSrc, secondary }: {
  readonly card: CareerArticleEndCard;
  readonly program: string;
  readonly trackLabel: string;
  readonly placement: string;
  /** 互換のため受け取る（バナーの案 C は 2026-10-31 に廃止） */
  readonly banner?: SidebarAdCreative | undefined;
  readonly textHref?: string | undefined;
  readonly textPixelSrc?: string | undefined;
  /** 1 ページ 1 ピクセルの発火源のときだけ渡す（banner のピクセル） */
  readonly pixelSrc?: string | undefined;
  /** 2 枚並べの 2 枚目（組があるときだけ） */
  readonly secondary?: SecondaryCard | undefined;
}) {
  const assigned = useAffiliateVariant();
  const wide = useSyncExternalStore(subscribeWide, wideSnapshot, wideServerSnapshot);
  const pixel = <ExperimentPixel assigned={assigned} src={pixelSrc} textHref={textHref} textPixelSrc={textPixelSrc} />;
  const first = <SmallCard card={card} program={program} trackLabel={trackLabel} placement={placement} textHref={textHref} assigned={assigned} />;
  if (assigned === "B2" && wide && secondary) {
    return (
      <>
        <div className="grid grid-cols-2 items-stretch gap-3">
          {first}
          <SmallCard card={secondary.card} program={secondary.program} trackLabel={secondary.card.service} placement={placement} textHref={secondary.textHref} assigned={assigned} />
        </div>
        {pixel}
        <TrackingPixel src={pixelForVariant({ src: secondary.pixelSrc, textHref: secondary.textHref, textPixelSrc: secondary.textPixelSrc })} />
      </>
    );
  }
  return (
    <>
      {first}
      {pixel}
    </>
  );
}
