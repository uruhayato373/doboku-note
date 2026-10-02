import images from '../../content/site/pe-first-stage/_shared/pop-image.json';
import { getMagazine, type MagazineId } from './note-magazines';

/** 完成画像のある公開商品だけ、配置に合うR2画像を返す。 */
export function noteCtaImage(id: string, format: 'body' | 'tile' = 'body') {
  if (id !== images.source) return undefined;
  const product = getMagazine(id as MagazineId);
  if (!product) return undefined;
  const variant = images.variants[format];
  return {
    src: variant.output.url,
    width: variant.format.width,
    height: variant.format.height,
    alt: `${product.title}。${product.shortDescription || product.description}。教材の内容を見る（note）`,
  };
}
