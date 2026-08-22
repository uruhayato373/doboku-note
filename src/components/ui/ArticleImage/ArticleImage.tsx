import Image from "next/image";
import { toR2Url } from "@/lib/r2-image-loader";

interface ArticleImageProps {
  src: string;
  alt: string;
  caption?: string;
  priority?: boolean;
  className?: string;
  width?: number;
  height?: number;
  size?: "small" | "medium" | "default" | "large";
}

export default function ArticleImage({
  src,
  alt,
  caption,
  priority = false,
  className = "",
  width = 800,
  height = 600,
  size = "medium",
}: ArticleImageProps) {
  // サイズプリセットの定義
  const sizeClasses = {
    small: "w-[50%] max-w-md mx-auto",
    medium: "w-[75%] max-w-2xl mx-auto",
    default: "w-[calc(100%+2rem)] sm:w-[calc(100%+4rem)] -mx-4 sm:-mx-8",
    large: "w-[calc(100%+4rem)] sm:w-[calc(100%+8rem)] -mx-8 sm:-mx-16",
  };

  const isSvg = src.endsWith(".svg");
  const containerClass = isSvg ? "w-full max-w-2xl mx-auto px-6" : sizeClasses[size];

  return (
    <figure
      className={`my-8 ${containerClass} ${className}`}
    >
      <div className="w-full">
        {isSvg ? (
          // SVG は intrinsic 幅（viewBox 幅）で描画する（w-full を付けない）。
          // 理由: SVG ファイル側で `style="max-width:{viewBox}px;width:100%"` を持つ前提で、
          // img 要素に w-full を付けると SVG が container 幅まで拡大され、
          // テキスト・図形が PC 上で 1.5〜1.8x に拡大されて巨大化する。
          // 詳細: .claude/skills/content/create-svg/SKILL.md §最大表示幅の固定
          <img
            src={toR2Url(src)}
            alt={alt}
            className="h-auto block mx-auto"
            style={{
              maxWidth: "100%",
              height: "auto",
              borderRadius: "2px",
            }}
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            className="w-full h-auto"
            priority={priority}
            style={{
              maxWidth: "100%",
              height: "auto",
              borderRadius: "2px",
            }}
          />
        )}
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-sm text-[var(--ink-body)] italic px-4 sm:px-8">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
