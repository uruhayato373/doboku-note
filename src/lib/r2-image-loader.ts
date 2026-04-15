import type { ImageLoaderProps } from 'next/image';

import categories from '@/config/categories.json';

const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://storage.doboku-note.com";

/**
 * ローカル画像パスをR2公開URLに変換。
 * `/posts/...` 系の絶対パスはそのまま R2 パブリック URL のパスと一致するので変換不要。
 */
export function toR2Url(src: string): string {
  return src;
}

/**
 * OGP画像の絶対URLを生成（メタタグ用）。
 * 画像は scripts/generate-ogps.mjs で .local/r2/posts/{category}/{localSlug}/ogp.png に生成され、
 * R2 にアップロードされる。フルスラグ（`{category}-{localSlug}` 結合形式）から category を
 * プレフィックスマッチで剥がし、記事ディレクトリ配下の ogp.png を指す URL を返す。
 */
export function getOgpImageUrl(fullSlug: string): string {
  const cat = categories.find(c => fullSlug === c.slug || fullSlug.startsWith(`${c.slug}-`));
  if (!cat) {
    // 未知の category。中央ディレクトリへのフォールバック（レガシー）
    return `${R2_PUBLIC_URL}/posts/ogp/${fullSlug}.png`;
  }
  const localSlug = fullSlug.slice(cat.slug.length + 1);
  return `${R2_PUBLIC_URL}/posts/${cat.slug}/${localSlug}/ogp.png`;
}

/**
 * Next.js カスタム画像ローダー
 * dev/prod問わずR2 URLに変換（画像はR2で一元管理）
 */
export default function r2ImageLoader({ src }: ImageLoaderProps): string {
  return toR2Url(src);
}
