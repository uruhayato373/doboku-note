import config from '../../config/site-thumbnails.json';
import tokens from '../../.claude/knowledge/design-system/note-cover-tokens.json';
import { getPostAssetDisplayUrl } from '@/lib/r2-image-loader';

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

const bandColor = (category: string) => Object.values(tokens.exams as Record<string, unknown>)
  .map((exam) => exam as { qualification?: string; base?: string })
  .find((exam) => exam.qualification === category)?.base;

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
