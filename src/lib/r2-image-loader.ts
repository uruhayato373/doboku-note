import type { ImageLoaderProps } from 'next/image';

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://storage.doboku-note.com";

/**
 * ローカル画像パスをR2公開URLに変換
 *
 * /images/blog/{slug}/001.png       → {R2}/blog/{slug}/images/001.png
 * /images/ogp/{slug}.png            → {R2}/blog/{slug}/ogp/ogp.png
 * /images/ogp/{slug}-thumbnail.png  → {R2}/blog/{slug}/ogp/thumbnail.png
 */
export function toR2Url(src: string): string {
  // 記事内画像: /images/blog/{slug}/001.png
  const blogMatch = src.match(/^\/images\/blog\/([^/]+)\/(.+)$/);
  if (blogMatch) {
    return `${R2_PUBLIC_URL}/blog/${blogMatch[1]}/images/${blogMatch[2]}`;
  }

  // OGPサムネイル: /images/ogp/{slug}-thumbnail.png
  const thumbMatch = src.match(/^\/images\/ogp\/(.+)-thumbnail\.png$/);
  if (thumbMatch) {
    return `${R2_PUBLIC_URL}/blog/${thumbMatch[1]}/ogp/thumbnail.png`;
  }

  // OGP画像: /images/ogp/{slug}.png
  const ogpMatch = src.match(/^\/images\/ogp\/(.+)\.png$/);
  if (ogpMatch) {
    return `${R2_PUBLIC_URL}/blog/${ogpMatch[1]}/ogp/ogp.png`;
  }

  return src;
}

/**
 * OGP画像の絶対URLを生成（メタタグ用）
 * 画像は scripts/generate-ogps.mjs で .local/r2/posts/ogp/{slug}.png に生成され、
 * R2 にアップロードされる。
 */
export function getOgpImageUrl(slug: string): string {
  return `${R2_PUBLIC_URL}/posts/ogp/${slug}.png`;
}

/**
 * Next.js カスタム画像ローダー
 * dev/prod問わずR2 URLに変換（画像はR2で一元管理）
 */
export default function r2ImageLoader({ src }: ImageLoaderProps): string {
  return toR2Url(src);
}
