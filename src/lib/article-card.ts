import type { DocMeta } from '@/lib/docs';
import { getCardImage } from '@/lib/site-thumbnail';
import { getPublicDocPath } from '@/lib/content-routes';

/** 記事のメタから ArticleCard・ArticleThumbRow の引数（行き先・題名・説明・画像）を組む */
export function articleCardProps(doc: Pick<DocMeta, 'slug' | 'category' | 'title' | 'description'>) {
  return { href: getPublicDocPath(doc.slug), title: doc.title, description: doc.description, image: getCardImage(doc) };
}
