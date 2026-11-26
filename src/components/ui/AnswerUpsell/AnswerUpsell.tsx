import { buildMagazineUrl, getMagazine } from '@/lib/note-magazines';
import { ANSWER_GATE_PRODUCT_ID } from '@/lib/answer-gate';
import { NOTE_LINK_REL } from '@/lib/external-link-rel';
import Arrow from '@/components/ui/Arrow/Arrow';

/**
 * AnswerUpsell — 解説を絞った過去問ページ（src/config/answer-gate.json）で、開いた「解答・解説」の末尾に置く 1 行の導線。
 * rehype-answer-reveal.ts が ExamPoint の位置に <answerupsell> を置き、DocPage の components がこれに解決する。
 * サイトに無いもの（ほかの選択肢の理由と要点）を言う。価格は商品の設定から引き、直書きしない。
 */
export default function AnswerUpsell({ slug }: { readonly slug: string }) {
  const product = getMagazine(ANSWER_GATE_PRODUCT_ID);
  if (!product) return null;
  const label = `${slug}-answer`;
  return (
    <a
      href={buildMagazineUrl(product, label)}
      target="_blank"
      rel={NOTE_LINK_REL}
      data-cta="note"
      data-cta-label={`${product.id}:${label}`}
      data-cta-placement="answer"
      className="card-surface-content focus-ring not-prose group mt-3 block px-4 py-3 no-underline hover:border-brand dark:hover:border-brand transition-colors"
    >
      <span className="block text-[14px] font-bold leading-snug text-ink-strong">
        ほかの選択肢がなぜ誤りか・適切かと、この問題の引っかけ（要点）は過去問 PDF 合本に収録
      </span>
      <span className="mt-1 flex items-center gap-1 text-[13px] text-brand-deep dark:text-brand group-hover:underline">
        {product.shortTitle ?? product.title}{product.price ? `（${product.price}）` : ''}を note で見る
        <Arrow />
      </span>
    </a>
  );
}
