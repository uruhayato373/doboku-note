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
 * content/site 配下の相対パスから R2 公開 URL を作る（記事系以外のアセット用）。
 *
 * R2 キーは upload-images-to-r2.mjs / asset-storage の site-ogp-png グループと同じく
 * `posts/` + content/site からの相対パス。基準類の章記事のように、記事 slug 体系に
 * 乗らないページの OGP をここから引く。R2 のベース URL をこのファイルの外へ漏らさない。
 */
export function getSiteAssetR2Url(relativeFromSiteContent: string): string {
  return `${R2_PUBLIC_URL}/posts/${relativeFromSiteContent.replace(/^\/+/, '')}`;
}

/**
 * OGP画像の絶対URLを生成（メタタグ用）。
 * 画像は scripts/generate-ogps.mjs で content/site/{category}/{localSlug}/ogp.png に生成され、
 * R2 にアップロードされる。フルスラグ（`{category}-{localSlug}` 結合形式）から category を
 * プレフィックスマッチで剥がし、記事ディレクトリ配下の ogp.png を指す URL を返す。
 */
export function getOgpImageUrl(fullSlug: string): string {
  return `${R2_PUBLIC_URL}${getOgpImagePath(fullSlug)}`;
}

/** OGP画像のサイト内パス。ローカル表示と本番URL生成で共用する。 */
function getOgpImagePath(fullSlug: string): string {
  const cat = categories.find(c => fullSlug === c.slug || fullSlug.startsWith(`${c.slug}-`));
  if (!cat) {
    // 未知の category。中央ディレクトリへのフォールバック（レガシー）
    return `/posts/ogp/${fullSlug}.png`;
  }
  const localSlug = fullSlug.slice(cat.slug.length + 1);
  return `/posts/${cat.slug}/${localSlug}/ogp.png`;
}

/**
 * 画面表示用OGP URL。
 * development は /posts を content/site から配信し、production はR2公開URLを使う。
 */
export function getOgpDisplayUrl(fullSlug: string): string {
  const path = getOgpImagePath(fullSlug);
  return process.env.NODE_ENV === 'production' ? `${R2_PUBLIC_URL}${path}` : path;
}

/**
 * Next.js カスタム画像ローダー
 * dev/prod問わずR2 URLに変換（画像はR2で一元管理）
 */
export default function r2ImageLoader({ src }: ImageLoaderProps): string {
  return toR2Url(src);
}
