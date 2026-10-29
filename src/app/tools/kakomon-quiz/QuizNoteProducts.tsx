import NoteImageCta from "@/components/ui/NoteImageCta/NoteImageCta";
import { noteCtaImage } from "@/lib/note-cta-images";
import { buildMagazineUrl, getMagazine, type MagazineId } from "@/lib/note-magazines";

// 演習画面は結果表示後にしか note 導線が出ず、SSR の HTML には導線が無い（2026-09-27 配線監査 DN-0364・
// 1級は 2026-10-29 の DN-0890）。演習の下に静的な note 商品カードを置く。未公開の商品は出さない。
export default function QuizNoteProducts({
  products,
  placement,
  heading = "紙でも反復する（note）",
}: {
  products: readonly { id: MagazineId; lead: string }[];
  placement: string;
  heading?: string;
}) {
  return (
    <div className="max-w-[760px] mx-auto px-4 sm:px-6 pb-10">
      <div className="text-[11px] font-bold uppercase tracking-wider text-(--ink-muted) mb-3">
        {heading}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {products.map(({ id, lead }) => {
          const mag = getMagazine(id);
          if (!mag) return null;
          const label = `${id}:${placement}`;
          const image = noteCtaImage(id);
          if (image) return <NoteImageCta key={id} href={buildMagazineUrl(mag, label)} image={image}
            trackLabel={label} placement={placement} />;
          return (
            <a
              key={id}
              href={buildMagazineUrl(mag, label)}
              target="_blank"
              rel="noopener"
              data-cta="note"
              data-cta-label={label}
              data-cta-placement={placement}
              className="focus-ring card-surface-content block p-4 shadow-none transition-colors hover:border-(--accent)"
            >
              <div className="font-bold text-(--ink)">{mag.shortTitle ?? mag.title}</div>
              <div className="text-sm text-(--ink-body) mt-1">{lead}</div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
