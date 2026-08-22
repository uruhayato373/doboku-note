import Image from "next/image";
import { ExternalLink } from "lucide-react";

interface NoteLinkProps {
  /** note 記事の URL（例: https://note.com/dobokunote/n/nc360aaa381b0） */
  readonly url: string;
  /** note 記事のタイトル */
  readonly title: string;
  /** 記事の要約（任意・2 行で line-clamp される） */
  readonly description?: string;
  /** サイト側で制作・管理する画像。`/images/note-links/*.webp` のみ許可する。 */
  readonly imageSrc: string;
  /** 無料の関連記事か、有料商品か。商品は note_cta_click として収益計測する。 */
  readonly kind?: "article" | "product";
  /** 有料商品に表示する価格。note側と同期して更新する。 */
  readonly price?: string;
  /**
   * GA4 クリック計測ラベル（任意）。省略時は URL の note 記事 ID を使う。
   * 有料マガジン CTA（note_cta_click）とは別イベント note_article_click で計測する。
   */
  readonly trackLabel?: string;
  /** GA4 の配置別集計。 */
  readonly placement?: string;
}

/** note URL から計測ラベルを導く。例: .../n/nc360aaa381b0 → note-nc360aaa381b0 */
function trackLabelFromUrl(url: string): string {
  const m = url.match(/\/n\/([a-zA-Z0-9]+)/);
  return m ? `note-${m[1]}` : "note-article";
}

/**
 * note 記事・単品商品への導線専用カード。
 *
 * doboku-note から note.com 記事へリンクするときの唯一の正規コンポーネント。
 * note.com のカバー画像や OGP には依存せず、サイト側の `/images/note-links/`
 * 画像を必須にする。タイトル・価格は HTML で描画し、画像への文字焼き込みを避ける。
 *
 * 使い分けの真実源: `.claude/knowledge/reference/content-authoring.md`
 * 「リンク系コンポーネントの使い分け」
 */
export default function NoteLink({
  url,
  title,
  description,
  imageSrc,
  kind = "article",
  price,
  trackLabel,
  placement = "article-body",
}: NoteLinkProps) {
  const isProduct = kind === "product";

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-cta={isProduct ? "note" : "note-article"}
      data-cta-label={trackLabel ?? trackLabelFromUrl(url)}
      data-cta-placement={placement}
      className="card-surface-content focus-ring not-prose group my-6 block max-w-2xl overflow-hidden hover:shadow-card-hover hover:border-brand dark:hover:border-brand transition-shadow"
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative w-full sm:w-[240px] shrink-0 aspect-square bg-[var(--bg)]">
          <Image
            src={imageSrc}
            alt=""
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, 240px"
          />
          <div
            className="absolute left-1.5 top-1.5 rounded-card-inline bg-brand px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
          >
            {isProduct ? "note 有料教材" : "note 解説記事"}
          </div>
        </div>
        <div className="min-w-0 flex-1 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className="text-[11px] text-ink-muted font-medium">
              {isProduct ? "doboku-note 連動教材" : "note（dobokunote）"}
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--ink-muted)] group-hover:text-brand dark:group-hover:text-brand transition-colors shrink-0" />
          </div>
          <div className="text-[14px] sm:text-[15px] font-bold text-ink-strong leading-tight group-hover:text-brand-deep dark:group-hover:text-brand transition-colors line-clamp-2">
            {title}
          </div>
          {description && (
            <p className="mt-1.5 text-[12px] sm:text-[13px] leading-snug text-ink-body line-clamp-2 sm:line-clamp-3">
              {description}
            </p>
          )}
          {isProduct && (
            <div className="mt-3 flex items-center justify-between gap-3">
              {price && <span className="text-sm font-black text-ink-strong">{price}</span>}
              <span className="ml-auto text-sm font-bold text-brand-deep dark:text-brand">
                noteで詳しく見る&nbsp;›
              </span>
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
