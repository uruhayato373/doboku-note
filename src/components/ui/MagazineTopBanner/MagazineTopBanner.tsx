import NoteImageCta from "@/components/ui/NoteImageCta/NoteImageCta";
import { noteCtaImage } from "@/lib/note-cta-images";
import Image from "next/image";
import { brandOf } from "@/lib/exam-brand";
import { NOTE_LINK_REL } from "@/lib/external-link-rel";

interface MagazineTopBannerProps {
  readonly magazineId: string;
  readonly scopeNotice?: string | undefined;
  readonly url: string;
  /** マガジンの短縮タイトル（shortTitle） */
  readonly title: string;
  /** 価格文字列（例: "¥2,480"）。マガジンにより未設定のことがある。 */
  readonly price?: string | undefined;
  /** 種別バッジ（例: "note 限定" / "メンバーシップ"） */
  readonly badge: string;
  /** GA4 クリック計測ラベル（通常は utm_content）。AnalyticsProvider のデリゲートが拾う。 */
  readonly trackLabel?: string;
}

/**
 * MagazineTopBanner — 記事冒頭（本文 prose の前）に置く画像付きコンパクト CTA。
 *
 * 末尾のブランドタイル（NoteMagazineTile / MagazineInlineCard）とは別物の軽量型。
 * 二次系の高 intent ページのみ resolvePlacement().top で設定され、記事が長いため冒頭にも
 * 到達導線を 1 本置く。冒頭=横長コンパクト・末尾=大型カードで形を変えて重複感を避ける。
 * 表示可否は呼び出し側で getMagazine()（published + noteUrl）ゲートを通す（未公開は非表示）。
 */
export default function MagazineTopBanner({
  magazineId,
  scopeNotice,
  url,
  title,
  price,
  badge,
  trackLabel,
}: MagazineTopBannerProps) {
  const image = noteCtaImage(magazineId, 'body');
  if (image) return <NoteImageCta href={url} image={image} scopeNotice={scopeNotice}
    trackLabel={`${magazineId}:${trackLabel ?? "unknown"}`} placement={"article-top"} className="mb-8" />;
  const brand = brandOf(magazineId);
  // コンパクト型なので価格は先頭の金額だけを出す。catalog の price は「¥2,480（模試3回＋暗記ノート＋
  // 出題分析・単品合計¥3,140、約21%OFF）」のように長いことがあり、縮まない価格欄が行幅を占有して
  // タイトル幅が 0 になり 1 文字ずつ縦に並んでいた（2026-10-02 本番で確認）。内訳は遷移先と末尾カードが持つ。
  const headlinePrice = price?.match(/^¥[\d,]+/)?.[0] ?? price;

  return (
    <a
      href={url}
      target="_blank"
      rel={NOTE_LINK_REL}
      data-cta="note"
      data-cta-label={`${magazineId}:${trackLabel ?? "unknown"}`}
      data-cta-placement="article-top"
      className="card-surface-content focus-ring not-prose group mb-8 flex min-h-[92px] items-stretch overflow-hidden hover:border-brand dark:hover:border-brand hover:shadow-card-hover transition-shadow"
    >
      <div className="relative w-[88px] shrink-0 overflow-hidden sm:w-[132px]">
        {brand.ctaBg ? (
          <Image
            src={brand.ctaBg}
            alt=""
            fill
            sizes="132px"
            className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0" style={{ background: `var(${brand.themeVar})` }} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-card-inline bg-brand dark:bg-brand-fill px-1.5 py-0.5 text-[10px] font-medium text-white">
              {badge}
            </span>
            <span className="text-[10px] font-bold tracking-wide text-ink-muted">{brand.label}</span>
          </div>
          <div className="text-[14px] font-bold leading-snug text-ink-strong group-hover:text-brand-deep dark:group-hover:text-brand transition-colors sm:text-[16px]">
            {title}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {headlinePrice && (
            <span className="hidden whitespace-nowrap text-[13px] font-bold text-ink-strong sm:block">
              {headlinePrice}
            </span>
          )}
          <span className="text-lg text-brand-deep dark:text-brand" aria-hidden="true">
            &rarr;
          </span>
        </div>
      </div>
    </a>
  );
}
