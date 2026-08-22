import Image from "next/image";
import {
  getMagazine,
  buildMagazineUrl,
  type MagazineId,
} from "@/lib/note-magazines";
import { brandOf } from "@/lib/exam-brand";

interface MagazineHeroCtaProps {
  /** note-magazines.ts に登録済みのマガジン ID */
  readonly id: MagazineId;
  /** UTM tracking 識別子（= GA4 の data-cta-label） */
  readonly utmContent: string;
}

/**
 * MagazineHeroCta — note マガジンのヒーロー CTA バナー（縦型・画像中心）。
 *
 * 資格別ブランドイラスト（cta-bg）をブランド紺で覆い、白キーライン枠の中に
 * バッジ帯 → キャッチコピー → 説明 → マスコット「doboku-note 先生」→ 大ボタン を積む。
 * 文言・リンク・キャラのポーズは全て note-magazines.ts（SoT）から解決するため、
 * 商品ごとの出し分けは SoT の `ctaCatch` / `ctaButton` / `ctaPose` だけで完結する
 * （焼き込みバナーを作らない＝価格改定・マガジン追加時の画像生成が不要）。
 *
 * 使い分け:
 * - MagazineHeroCta: 記事中間 CTA・MDX 本文中の強 CTA（本コンポーネント）
 * - MagazineInlineCard: 同一記事に何枚も並べる列挙用の横長カード（`<MagazineCard variant="inline">`）
 * - HubCtaBanner: カテゴリ hub・記事末尾・サイドバーの「もくじ」タイル（商品単体ではない）
 *
 * 未公開 (`published: false`) または `noteUrl` 空の場合は null を返し描画しない（防御）。
 */
export default function MagazineHeroCta({ id, utmContent }: MagazineHeroCtaProps) {
  const magazine = getMagazine(id);
  if (!magazine) return null;

  const brand = brandOf(id);
  const catchCopy = magazine.ctaCatch ?? magazine.shortTitle ?? magazine.title;
  const sub = magazine.shortDescription ?? magazine.description;
  const button = magazine.ctaButton ?? "note で詳しく見る";
  const pose = magazine.ctaPose ?? "pointing";

  return (
    <a
      href={buildMagazineUrl(magazine, utmContent)}
      target="_blank"
      rel="noopener noreferrer"
      data-cta="note"
      data-cta-label={utmContent}
      className="focus-ring not-prose group relative my-6 block max-w-2xl overflow-hidden rounded-card-content shadow-card-content transition-shadow hover:shadow-card-hover"
    >
      {/* 背景: 資格別ブランドイラスト（未整備の資格はテーマ色ベタ塗りにフォールバック） */}
      {brand.ctaBg ? (
        <Image
          src={brand.ctaBg}
          alt=""
          fill
          sizes="672px"
          className="object-cover object-[center_30%]"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: `var(${brand.themeVar})` }} />
      )}
      {/* ブランド紺のオーバーレイ＋白キーライン枠（背景の明暗に依らず白文字を AA に保つ） */}
      <div className="absolute inset-0" style={{ background: "var(--hero-cta-tint)" }} />
      <div className="pointer-events-none absolute inset-2.5 rounded-[6px] border-2 border-white/90" />

      <div className="relative flex flex-col items-center px-5 pb-5 pt-6 text-center sm:px-8 sm:pb-6 sm:pt-7">
        <span
          className="rounded-[4px] px-5 py-0.5 text-[11px] font-black tracking-[0.1em] sm:text-[13px]"
          style={{ background: "var(--hero-cta-band)", color: "var(--hero-cta-band-ink)" }}
        >
          {magazine.badge}
        </span>
        <span className="mt-3 text-balance text-[18px] font-black leading-snug text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.35)] sm:text-[22px]">
          {catchCopy}
        </span>
        <span className="mt-2.5 rounded-[3px] bg-white/95 px-4 py-1 text-[12px] font-bold text-[#16314f] sm:text-[13px]">
          {sub}
        </span>
        <Image
          src={`/images/character/avatar-${pose}.webp`}
          alt=""
          width={108}
          height={108}
          className="mt-4 h-[88px] w-[88px] rounded-full border-[3px] border-white shadow-card-hover sm:h-[108px] sm:w-[108px]"
        />
        <span className="hero-cta-button mt-4 flex w-full items-center justify-center gap-2 rounded-card-inline py-3 text-[14px] font-black text-white transition-colors sm:text-[16px]">
          <span className="rounded-[4px] bg-white px-1.5 py-0.5 text-[11px] font-black text-[var(--hero-cta-button)]">
            note
          </span>
          {button}
          <span aria-hidden>▶</span>
        </span>
      </div>
    </a>
  );
}
