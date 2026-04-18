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
  size = "default",
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
          <img
            src={toR2Url(src)}
            alt={alt}
            className="h-auto block mx-auto"
            style={{
              maxWidth: "100%",
              height: "auto",
              borderRadius: "0",
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
              borderRadius: "0",
            }}
          />
        )}
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-sm text-gray-600 italic px-4 sm:px-8">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
