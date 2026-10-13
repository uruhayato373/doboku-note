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

/**
 * note 商品カタログの全エントリを、売上の商品名と照合する材料 { id, title, shortTitle, noteTitle, single } にする。
 * 販売履歴（note のダッシュボード）に出る商品名は noteTitle（note 上のマガジン名そのもの）で、title・shortTitle は
 * サイト CTA 用の説明的な題名なので一致しない（2026-10-11: 土質基礎まるごと合格パックが noteTitle でしか一致せず、
 * 取り直しのたびに article:unknown に戻った）。single は noteUrl が単品記事（/n/）で、売上の productId は `article:<id>` になる。
 *
 * @param {string} catalogSource src/lib/note-magazines.ts の中身
 * @returns {Array<{id: string, title: string, shortTitle?: string, noteTitle?: string, single: boolean}>}
 */
export function catalogMagazines(catalogSource) {
  // エントリは `'<id>': {` で始まり、その直後に id / published / noteUrl / noteTitle / title / shortTitle が並ぶ。
  // 旧正規表現（`{ … id … title … }` を非貪欲に跨ぐ）は description 内の入れ子や省略キーで
  // id と title の組を取り違え、2026-09-13 に実在する単品記事 10 件を全部 unknown にしていた。
  const field = (body, key) => body.match(new RegExp(`\\n\\s*${key}:\\s*'((?:[^'\\\\]|\\\\.)*)'`))?.[1]?.replace(/\\'/g, "'");
  const out = [];
  const chunks = String(catalogSource).split(/\n  '([^']+)':\s*\{/);
  for (let i = 1; i < chunks.length; i += 2) {
    const id = chunks[i];
    const body = chunks[i + 1] || '';
    const title = field(body, 'title');
    if (!title) continue;
    out.push({
      id,
      title,
      shortTitle: field(body, 'shortTitle'),
      noteTitle: field(body, 'noteTitle'),
      single: /noteUrl:\s*'https:\/\/note\.com\/dobokunote\/n\//.test(body),
    });
  }
  return out;
}
