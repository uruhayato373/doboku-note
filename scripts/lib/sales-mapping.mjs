/**
 * note 商品カタログから、公開済み単品記事の sales productId を抽出する。
 *
 * note-magazines.ts は各エントリの先頭を id / published / noteUrl の順で固定している。
 * `/n/` は単品記事、`/m/` はマガジンなので、単品だけ `article:<catalog-id>` へ変換する。
 * 初売上が sales-log に現れる前でも sales-recorder の mapping 漏れを検出するための入力。
 */
export function publishedArticleProductIds(catalogSource) {
  const entryPattern =
    /'([^']+)':\s*\{\s*id:\s*'\1',\s*published:\s*true,\s*noteUrl:\s*'https:\/\/note\.com\/dobokunote\/n\/[^']+'/g;

  return [...catalogSource.matchAll(entryPattern)].map((match) => `article:${match[1]}`);
}
