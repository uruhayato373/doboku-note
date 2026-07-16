import type { DocMeta } from '@/lib/docs';
import type { MagazineId } from '@/lib/note-magazines';
import MagazineHeroCta from '@/components/ui/MagazineHeroCta/MagazineHeroCta';
import RelatedArticleCard from '@/components/ui/RelatedArticles/RelatedArticleCard';
import { AFFILIATE_LINK_REL, AffiliatePrBadge } from '@/components/ui/AffiliateParts';

/**
 * MidArticleCta — 長文記事の中間 h2 境界に 1 個だけ挿入する文脈連動 CTA。
 * rehype-mid-cta が置いた <midslot> を page.tsx の components マップで解決する。
 *
 * 3 モード（page.tsx 側で択一決定・props で渡す）:
 *  - note モード: MagazineHeroCta（画像中心のヒーローバナー）。文言・リンク・キャラは
 *    note-magazines.ts から id で解決するため、ここは id と utmContent（-mid 済み）だけ渡す。
 *  - career モード: 転職アフィリのテキスト CTA（career 記事のみ・PR 表記＋href のみ）。
 *  - related モード: RelatedArticleCard（OGP サムネ）1 枚に「この続きに読みたい」見出し。
 */
type MidArticleCtaProps =
  | {
      readonly mode: 'note';
      readonly id: MagazineId;
      /** UTM 識別子（= GA4 の data-cta-label）。呼び出し側で -mid を付けて渡す。 */
      readonly utmContent: string;
    }
  | {
      readonly mode: 'career';
      readonly href: string;
      readonly text: string;
      readonly trackLabel: string;
      /** リンク直前の安心コピー（編集文言・任意）。転職エージェントへの心理的ハードルを解消する。 */
      readonly lead?: string;
    }
  | {
      readonly mode: 'related';
      readonly doc: DocMeta;
    };

export default function MidArticleCta(props: MidArticleCtaProps) {
  if (props.mode === 'note') {
    return <MagazineHeroCta id={props.id} utmContent={props.utmContent} />;
  }
  if (props.mode === 'career') {
    // 転職アフィリのテキスト CTA（career 記事の本文中間・href のみ＝計測はサイドバー1発火）。
    // 景表法: PR 表記・rel="nofollow sponsored"・表示文言は A8 公式テキスト（¥表記なし）。
    return (
      <div className="not-prose my-8 max-w-2xl rounded-card-content border border-[var(--rule-soft)] bg-[var(--accent-fill)] px-4 py-3.5">
        <AffiliatePrBadge className="mb-1.5" />
        {props.lead && (
          <p className="mb-1.5 text-sm leading-6 text-ink-body">{props.lead}</p>
        )}
        <a
          href={props.href}
          target="_blank"
          rel={AFFILIATE_LINK_REL}
          data-cta="affiliate"
          data-cta-label={props.trackLabel}
          className="group inline-flex items-center gap-1 text-[14px] sm:text-[15px] font-bold text-[var(--accent)] hover:underline"
        >
          {props.text}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">›</span>
        </a>
      </div>
    );
  }
  return (
    <div className="not-prose my-8 max-w-2xl">
      <div className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">この続きに読みたい</div>
      <RelatedArticleCard doc={props.doc} />
    </div>
  );
}
