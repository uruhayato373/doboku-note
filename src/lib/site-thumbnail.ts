import config from '../../config/site-thumbnails.json';
import tokens from '../../.claude/knowledge/design-system/note-cover-tokens.json';
import categories from '@/config/categories.json';
import { getOgpDisplayUrl, getPostAssetDisplayUrl } from '@/lib/r2-image-loader';

export interface SiteThumbnail {
  readonly src: string;
  /** 下帯の文字。サイトのフォントで重ねるので、タイトルを直しても画像の作り直しが要らない */
  readonly text: string;
  readonly color: string;
}

interface ThumbnailDoc {
  readonly slug: string;
  readonly category?: string;
}

interface PageThumbnail { readonly text: string; readonly version?: string }

const pages: Record<string, Record<string, PageThumbnail> | undefined> = config.pages;

const examTokens = Object.values(tokens.exams as Record<string, unknown>).map((exam) => exam as { qualification?: string; base?: string });
const commonColor = (tokens.exams as Record<string, { base?: string }>).common?.base;

/**
 * 帯の色。カテゴリの資格（categories.json の qualification、無ければ slug）の色。資格の色を持たないカテゴリ
 * （土木実務・法令・建築など）は共通の色。以前は一致しないと null を返し、写真があっても OGP の縮小に落ちていた（2026-11-13）
 */
const bandColor = (category: string) => {
  const qualification = (categories as Array<{ slug: string; qualification?: string }>).find((c) => c.slug === category)?.qualification ?? category;
  return examTokens.find((exam) => exam.qualification === qualification)?.base ?? commonColor;
};

/** ページ別のサムネイルを返す。絵がまだ無いページは null で、呼び出し側は OGP の縮小へ戻す */
export function getSiteThumbnail(doc: ThumbnailDoc): SiteThumbnail | null {
  const category = doc.category;
  if (!category) return null;
  const key = doc.slug.startsWith(`${category}-`) ? doc.slug.slice(category.length + 1) : doc.slug;
  const page = pages[category]?.[key];
  const color = bandColor(category);
  if (!page?.version || !color) return null;
  return { src: `${getPostAssetDisplayUrl(`${category}/${key}/${config.imageFile}`)}?v=${page.version}`, text: page.text, color };
}

/** カードに出す画像。写真サムネイルがあればそれ（帯つき）、無ければ OGP の縮小。client へ渡すときはこの形で渡す（台帳を client に読ませない） */
export interface CardImage {
  readonly src: string;
  readonly band: SiteThumbnail | null;
}

export function getCardImage(doc: ThumbnailDoc): CardImage {
  const band = getSiteThumbnail(doc);
  return { src: band?.src ?? getOgpDisplayUrl(doc.slug), band };
}
