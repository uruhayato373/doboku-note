/**
 * note 商品カタログから、公開済み単品記事の sales productId を抽出する。
 *
 * note-magazines.ts は各エントリの先頭を id / published / noteUrl の順で固定している。
 * `/n/` は単品記事、`/m/` はマガジンなので、単品だけ `article:<catalog-id>` へ変換する。
 * 初売上が sales.json に現れる前でも sales-recorder の mapping 漏れを検出するための入力。
 */
export function publishedArticleProductIds(catalogSource) {
  const entryPattern =
    /'([^']+)':\s*\{\s*id:\s*'\1',\s*published:\s*true,\s*noteUrl:\s*'https:\/\/note\.com\/dobokunote\/n\/[^']+'/g;

  return [...catalogSource.matchAll(entryPattern)].map((match) => `article:${match[1]}`);
}

/**
 * note 商品カタログの公開済みエントリ全部の sales productId（マガジン＝<id>・単品記事＝article:<id>）。
 * note-sales-fetch はカタログの題名でしか productId を解決しないので、カタログにある id は mapping 表に無くても正しい
 * （2026-10-08: 新マガジン civil-2-keiken-park-private-pack の初売上で CI の書き戻しが止まり、10 月の売上が入らなかった）。
 */
export function catalogProductIds(catalogSource) {
  const entryPattern =
    /'([^']+)':\s*\{\s*id:\s*'\1',\s*published:\s*true,\s*noteUrl:\s*'https:\/\/note\.com\/dobokunote\/([mn])\/[^']+'/g;
  return [...catalogSource.matchAll(entryPattern)].map((match) => (match[2] === 'n' ? `article:${match[1]}` : match[1]));
}
