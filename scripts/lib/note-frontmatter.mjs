/**
 * note-frontmatter.mjs — note 記事 frontmatter の共有リーダー。
 *
 * 背景: frontmatter を正規表現で直読みするローカル実装が 21 本にあり（gray-matter 派 34 本と
 *   二系統並存）、境界（`---` の開始/終了）を見ずに `key:` 行だけを拾う実装は本文中の
 *   同名行を誤取得しうる（2026-08-25 棚卸し）。gray-matter は依存済みなのでそれを使い、
 *   note 記事の判断でよく要る派生値までここで作る（呼び出し側で毎回組み立てない）。
 *
 * 新規に書くコードはここを呼ぶ。既存 21 本の移行は DN-0083 で段階的に行う。
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import matter from 'gray-matter';

/**
 * note 記事 1 本を読み、判断によく要る形へ正規化する。
 * @returns {{
 *   path: string, noteId: string|null, price: number|null, notePricing: string|null,
 *   paidBoundary: string|null, isPaid: boolean, isMembership: boolean, imageCount: number,
 *   pdfPromise: boolean, localPdfs: string[], data: object, body: string
 * }}
 */
export function parseNoteArticle(path) {
  const src = readFileSync(path, 'utf8');
  const { data, content } = matter(src);
  const notePricing = data.notePricing ?? null;
  const isMembership = notePricing === 'membership';
  const isPaid = notePricing === 'paid' || (Boolean(data.price) && data.price !== 0 && !isMembership);
  const imageCount = (content.match(/!\[[^\]]*\]\(img\//g) || []).length;
  // 本文が PDF 配布を約束しているか（ダウンロード/添付/配布のいずれかと共起する「PDF」の言及）。
  // --reattach-pdf が要るかどうかの判定に使う。
  const pdfPromise = /PDF/.test(content) && /(ダウンロード|添付|配布)/.test(content);
  const dir = dirname(path);
  const localPdfs = [];
  for (const d of [dir, join(dir, 'pdf')]) {
    if (!existsSync(d)) continue;
    for (const f of readdirSync(d)) if (/\.pdf$/i.test(f)) localPdfs.push(join(d, f));
  }
  return {
    path,
    noteId: data.noteId ?? null,
    price: data.price ?? null,
    notePricing,
    paidBoundary: data.paidBoundary ?? null,
    isPaid,
    isMembership,
    imageCount,
    pdfPromise,
    localPdfs,
    data,
    body: content,
  };
}
