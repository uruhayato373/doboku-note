import Image from 'next/image';
import { buildMagazineUrl, type NoteMagazine } from '@/lib/note-magazines';
import { brandOf } from '@/lib/exam-brand';

// 背景イラスト上の文字を可読にする白グロー（テーマ非追従・HubCtaBanner と共通）。
const HALO = { textShadow: '0 1px 2px rgba(255,255,255,0.95), 0 0 10px rgba(255,255,255,0.9)' };

/**
 * NoteMagazineTile — 1 マガジンを資格別ブランド背景（cta-bg イラスト）＋ HTML 文字で描く CTA タイル。
 *
 * 旧「300×250 の文言焼き込みバナー（sidebarImageUrl）」を置き換える。文言・価格は SoT（note-magazines.ts）
 * から HTML でデータ駆動するため、マガジン追加時の画像生成が不要になる。背景は左を白スクリムで抜き、
 * 明色イラストの上でもタイトルを広く読めるようにする（文字色は --on-image-* の固定濃色）。
 * サイズは記事末尾・サイドバー共通の 300×250 相当（aspect-[6/5]・max-w-[300px]）。
 *
 * ブランドにイラスト（ctaBg）が無い資格（concrete・現状すべて未公開＝非描画）はテーマ色のベタ塗り＋
 * 白文字にフォールバックする。
 */
export default function NoteMagazineTile({
  magazine,
  utmContent,
}: {
  readonly magazine: NoteMagazine;
  readonly utmContent: string;
}) {
  const brand = brandOf(magazine.id);
  const title = magazine.shortTitle ?? magazine.title;
  // 「¥3,480（…）」等の説明入り価格は先頭の金額だけをピル表示に使う。
  const priceAmount = magazine.price?.match(/[¥￥][\d,]+/)?.[0] ?? magazine.price;
  const onImage = Boolean(brand.ctaBg); // イラスト上＝固定濃色文字、ベタ塗り＝白文字

  return (
    <a
      href={buildMagazineUrl(magazine, utmContent)}
      target="_blank"
      rel="noopener noreferrer"
      data-cta="note"
      data-cta-label={utmContent}
      className="not-prose group relative block aspect-[6/5] w-full max-w-[300px] overflow-hidden rounded-card-content border border-[var(--rule-soft)] shadow-card-content transition-shadow hover:border-brand dark:hover:border-brand hover:shadow-card-hover"
    >
      {brand.ctaBg ? (
        <>
          <Image src={brand.ctaBg} alt="" fill sizes="300px" className="object-cover" />
          {/* 左を濃く右へ抜ける白スクリム（イラスト上でも文字を広く読める）。 */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/92 via-white/70 to-white/5" />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: `var(${brand.themeVar})` }} />
      )}
      <div
        className={`absolute inset-0 flex flex-col items-start justify-center gap-0.5 px-4 ${
          onImage ? 'text-[var(--on-image-ink)]' : 'text-white'
        }`}
      >
        <span
          className={`text-[11px] font-extrabold tracking-wide ${onImage ? '' : 'text-white/90'}`}
          style={onImage ? { color: `var(${brand.themeVar})`, ...HALO } : undefined}
        >
          ＼ {magazine.badge} ／
        </span>
        <span
          className={`text-[11px] font-bold ${onImage ? 'text-[var(--on-image-ink-soft)]' : 'text-white/90'}`}
          style={onImage ? HALO : undefined}
        >
          {brand.label}
        </span>
        <span
          className="text-[15px] font-black leading-[1.25] tracking-[-0.01em] line-clamp-3"
          style={onImage ? HALO : undefined}
        >
          {title}
        </span>
        {priceAmount && (
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[var(--on-image-pill-bg)] px-2.5 py-0.5 text-[12px] font-black text-white shadow-card-content">
            {priceAmount}
            <span aria-hidden>›</span>
          </span>
        )}
      </div>
    </a>
  );
}
