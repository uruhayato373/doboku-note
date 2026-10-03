import images from '../../content/site/pe-first-stage/_shared/pop-image.json';
import sharedImages from '../../content/site/_shared/pop-image.json';
import { getMagazine, type MagazineId } from './note-magazines';
import { classifyNoteProduct } from './note-product-classification';
import { qualificationShortLabel } from './qualification-names';

interface ImageVariant {
  format: { width: number; height: number };
  output: { url: string };
}

/** 単品note記事はMDXの題名・価格を保ち、明示した教材分類の画像を共用する。 */
export function noteCtaFamilyImage(family: string) {
  const entry = (sharedImages.families as Record<string, { qualification: string; body: ImageVariant }>)[family];
  if (!entry?.body) return undefined;
  const variant = entry.body;
  return { src: variant.output.url, width: variant.format.width, height: variant.format.height,
    alt: `${qualificationShortLabel(entry.qualification)}の学習教材` };
}

/** 教材一覧への導線は資格共通のタイル。商品名・収録内容を画像へ固定しない。 */
export function noteCtaQualificationTile(qualification: string) {
  const variant = (sharedImages.tiles as Record<string, ImageVariant>)[qualification];
  if (!variant) return undefined;
  return { src: variant.output.url, width: variant.format.width, height: variant.format.height,
    alt: `${qualificationShortLabel(qualification)}の学習教材` };
}

/** 完成画像のある公開商品だけ、配置に合うR2画像を返す。 */
export function noteCtaImage(id: string, format: 'body' | 'tile' = 'body') {
  const product = getMagazine(id as MagazineId);
  if (!product) return undefined;
  const classification = classifyNoteProduct(id);
  if (!classification) return undefined;
  const families = sharedImages.families as Record<string, { body: ImageVariant; tile?: ImageVariant }>;
  const tiles = sharedImages.tiles as Record<string, ImageVariant>;
  const variant = id === images.source ? images.variants[format]
    : format === 'tile' ? families[classification.family]?.tile ?? tiles[classification.qualification]
    : families[classification.family]?.body;
  if (!variant) return undefined;
  return {
    src: variant.output.url,
    width: variant.format.width,
    height: variant.format.height,
    alt: `${product.title}。${product.shortDescription || product.description}。教材の内容を見る（note）`,
    caption: {
      title: product.title,
      description: product.shortDescription || product.description,
      price: product.price,
    },
  };
}
