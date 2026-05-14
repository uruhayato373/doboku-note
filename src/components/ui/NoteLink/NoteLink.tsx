import LinkCardClient from "../LinkCard/LinkCardClient";

interface NoteLinkProps {
  /** note 記事の URL（例: https://note.com/dobokunote/n/nc360aaa381b0） */
  readonly url: string;
  /** note 記事のタイトル */
  readonly title: string;
  /** 記事の要約（任意・2 行で line-clamp される） */
  readonly description?: string;
  /** カバー画像のパス（任意・/images/note-covers/ 配下を推奨）。省略時はテキストカードになる */
  readonly coverImage?: string;
}

/**
 * note 記事への導線専用カード。
 *
 * doboku-note から note.com 記事へリンクするときの唯一の正規コンポーネント。
 * `siteName` / `category` をプリセットし、`LinkCardClient`（props 直描画・
 * サーバーフェッチなし）をラップするだけの薄い層。note.com は OGP の bot
 * 取得をブロックするため、サムネを出す場合は `coverImage` を明示指定する。
 *
 * 使い分けの真実源: `.claude/reference/content-authoring.md`
 * 「リンク系コンポーネントの使い分け」
 */
export default function NoteLink({
  url,
  title,
  description,
  coverImage,
}: NoteLinkProps) {
  // exactOptionalPropertyTypes: 未指定の任意 prop は明示的 undefined を渡さず省略する
  return (
    <LinkCardClient
      url={url}
      title={title}
      siteName="note（dobokunote）"
      category="note 解説記事"
      {...(description !== undefined ? { description } : {})}
      {...(coverImage !== undefined ? { imageUrl: coverImage } : {})}
    />
  );
}
