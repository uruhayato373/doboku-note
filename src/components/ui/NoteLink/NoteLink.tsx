import Image from "next/image";
import { ExternalLink } from "lucide-react";

interface NoteLinkProps {
  /** note 記事の URL（例: https://note.com/dobokunote/n/nc360aaa381b0） */
  readonly url: string;
  /** note 記事のタイトル */
  readonly title: string;
  /** 記事の要約（任意・2 行で line-clamp される） */
  readonly description?: string;
  /**
   * カバー画像のパス（任意・/images/note-covers/ 配下を推奨）。省略時はテキストカードになる。
   *
   * 注: 1280×670 横長 PNG/WebP のパスを渡しても、内部で自動的に
   * `-square.webp` 命名へ置換して中央 630×630 セーフティゾーンの
   * 正方形版を表示する。事前に
   * `node scripts/generate-note-square-covers.mjs` を実行して
   * 正方形版を生成しておくこと。
   */
  readonly coverImage?: string;
  /**
   * GA4 クリック計測ラベル（任意）。省略時は URL の note 記事 ID を使う。
   * 有料マガジン CTA（note_cta_click）とは別イベント note_article_click で計測する。
   */
  readonly trackLabel?: string;
}

/** note URL から計測ラベルを導く。例: .../n/nc360aaa381b0 → note-nc360aaa381b0 */
function trackLabelFromUrl(url: string): string {
  const m = url.match(/\/n\/([a-zA-Z0-9]+)/);
  return m ? `note-${m[1]}` : "note-article";
}

/**
 * 与えられた cover 画像パスを `-square.webp` 命名に置換する。
 *
 * 例:
 *   /images/note-covers/nb4e6f088f0e8.webp → /images/note-covers/nb4e6f088f0e8-square.webp
 *   /images/note-covers/nb4e6f088f0e8.png  → /images/note-covers/nb4e6f088f0e8-square.webp
 *
 * 既に `-square` を含む場合はそのまま返す（冪等）。
 */
function toSquareImage(src: string): string {
  if (/-square\.(png|webp)$/.test(src)) return src;
  return src.replace(/\.(png|webp)$/, "-square.webp");
}

/**
 * note 記事への導線専用カード（正方形画像版）。
 *
 * doboku-note から note.com 記事へリンクするときの唯一の正規コンポーネント。
 * `MagazineInlineCard` と視覚的に統一した「画像左 240px aspect-square + テキスト右」
 * レイアウトを採用し、サイト内 note 関連カードの見た目を一貫させる。
 *
 * note.com は OGP の bot 取得をブロックするため、サムネを出す場合は
 * `coverImage` を明示指定する。1280×670 のフルカバーパスを渡すと、
 * 内部で `-square.webp` を参照する（中央 630×630 セーフティゾーン crop）。
 *
 * 使い分けの真実源: `.claude/reference/content-authoring.md`
 * 「リンク系コンポーネントの使い分け」
 */
export default function NoteLink({
  url,
  title,
  description,
  coverImage,
  trackLabel,
}: NoteLinkProps) {
  const imageUrl = coverImage ? toSquareImage(coverImage) : null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-cta="note-article"
      data-cta-label={trackLabel ?? trackLabelFromUrl(url)}
      className="not-prose group my-6 block max-w-2xl rounded-card-content overflow-hidden border border-[var(--rule-soft)] bg-[var(--paper)] shadow-card-content hover:shadow-card-hover hover:border-brand dark:hover:border-brand transition-shadow"
    >
      <div className="flex flex-col sm:flex-row">
        {imageUrl && (
          <div className="relative w-full sm:w-[240px] shrink-0 aspect-square bg-[var(--bg)]">
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
              sizes="(max-width: 640px) 100vw, 240px"
            />
            <div
              className="absolute left-1.5 top-1.5 rounded-card-inline bg-brand px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
            >
              note 解説記事
            </div>
          </div>
        )}
        <div className="min-w-0 flex-1 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <span className="text-[11px] text-ink-muted font-medium">
              note（dobokunote）
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
        </div>
      </div>
    </a>
  );
}
