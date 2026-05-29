import Image from "next/image";

interface MagazineSidebarCardProps {
  readonly href: string;
  readonly imageUrl: string;
  readonly alt: string;
  /** 外部リンク (note 等) は別タブ。内部リンク (/links) は同タブ。 */
  readonly external?: boolean;
}

/**
 * 右サイドバー用の画像オンリー プロモバナー (300×250 / IAB レクタングル中)。
 * 文言・価格はバナー画像に焼き込む方針のため、ここではテキストを描画しない。
 * note 有料マガジン CTA と /links 教材ハブ導線の両方で使用する。
 */
export default function MagazineSidebarCard({
  href,
  imageUrl,
  alt,
  external = true,
}: MagazineSidebarCardProps) {
  const linkProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};
  return (
    <a
      href={href}
      {...linkProps}
      className="not-prose group block rounded-card-content overflow-hidden border border-gray-200 dark:border-gray-700 shadow-card-content hover:shadow-card-hover hover:border-brand dark:hover:border-brand transition-shadow"
    >
      <Image
        src={imageUrl}
        alt={alt}
        width={300}
        height={250}
        unoptimized
        sizes="300px"
        className="block h-auto w-full group-hover:opacity-95 transition-opacity"
      />
    </a>
  );
}
