import type { NoteMagazine } from '@/lib/note-magazines';

/** 商品の見出しと補足を既存カタログから分ける。数字や売り文句は追加しない。 */
export function noteCtaCopy(product: NoteMagazine) {
  const source = product.shortTitle ?? product.title;
  const subject = source.split(/[｜|]/).at(-1)!.trim();
  const detail = subject.match(/[（(](.+)[）)]$/);
  const title = subject.replace(/[（(].*$/, '').trim() || subject;
  return {
    title,
    subtitle: product.shortDescription ?? detail?.[1] ?? product.description,
    price: product.price?.match(/[¥￥][\d,]+/)?.[0] ?? product.price,
  };
}
