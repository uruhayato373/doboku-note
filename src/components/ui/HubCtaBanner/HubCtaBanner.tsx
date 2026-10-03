import Image from 'next/image';
import { type ResolvedHubCta } from '@/lib/hub-cta';
import { NOTE_LINK_REL } from '@/lib/external-link-rel';
import { noteCtaImage, noteCtaQualificationTile } from '@/lib/note-cta-images';
import NoteImageCta from '@/components/ui/NoteImageCta/NoteImageCta';

// カテゴリ hub の note CTA。完成画像を資格または商品から選び、商品台帳の説明を併記する。
// もくじ・季節商品・リンク・計測は resolveHubCta の既存ルールを使う。画像欠落時は背景型へ戻る。

const HALO = { textShadow: '0 1px 2px rgba(255,255,255,0.95), 0 0 12px rgba(255,255,255,0.85)' };

export default function HubCtaBanner({
  cta,
  placement,
}: {
  cta: ResolvedHubCta;
  placement: string;
}) {
  const image = cta.productId ? noteCtaImage(cta.productId, 'tile') : noteCtaQualificationTile(cta.qualification);
  if (image) return <NoteImageCta href={cta.url}
    image={cta.productId ? image : { ...image, caption: {
      title: `${cta.qual} 教材一覧`, description: `${cta.title1}・${cta.title2}。${cta.sub}`, price: undefined,
    } }}
    trackLabel={cta.trackLabel} placement={placement} className="w-full max-w-[360px]" />;
  return (
    <a
      href={cta.url}
      target="_blank"
      rel={NOTE_LINK_REL}
      data-cta="note"
      data-cta-label={cta.trackLabel}
      data-cta-placement={placement}
      className="card-surface-content focus-ring group block w-full max-w-[360px] overflow-hidden p-2 transition-shadow hover:shadow-card-hover"
    >
      {/* 白カード枠（bg-paper + p-2）で囲む＝転職アフィリ SidebarAdBanner とカード意匠を統一。画像は内側に inset。 */}
      <div className="relative aspect-6/5 w-full overflow-hidden rounded-[6px]">
        <Image src={cta.bg} alt="" fill sizes="360px" className="object-cover" />
        {/* 文字列は左寄せなので、箱を 60% まで広げても実際の描画は 52% 程度に収まり
            背景イラスト（右にモチーフ）には被らない。狭い面での折り返し余裕を稼ぐための幅。 */}
        <div className="absolute inset-y-0 left-0 flex w-[60%] flex-col items-start justify-center pl-4 pr-1 text-(--on-image-ink)">
          <span className="text-[12px] font-extrabold tracking-wide" style={{ color: `var(${cta.themeVar})`, ...HALO }}>
            ＼ {cta.badge ?? 'note限定'} ／
          </span>
          <span className="text-[12px] font-extrabold text-(--on-image-ink-soft)" style={HALO}>{cta.qual}</span>
          {/* mokuji モードでは 2 行そろって「何が買えるか」の見出しなので同サイズにする
              （旧: title1=ラベル / title2=主題 で 17/19px の差を付けていた）。
              18px は最長「必須I・選択科目」がカード幅 300px の面でも 1 行に収まる上限。 */}
          <span className="text-[18px] font-black leading-tight" style={HALO}>{cta.title1}</span>
          {cta.title2 && <span className="text-[18px] font-black leading-tight" style={HALO}>{cta.title2}</span>}
          <span className="mt-0.5 text-[11px] font-bold text-(--on-image-ink-soft)" style={HALO}>{cta.sub}</span>
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-(--on-image-pill-bg) px-3 py-1 text-[13px] font-black text-white shadow-card-content">
            {cta.price ?? cta.cta}
            <span aria-hidden>›</span>
          </span>
        </div>
      </div>
    </a>
  );
}
