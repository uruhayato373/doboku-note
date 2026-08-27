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

// 本文が「PDF を配る」と約束している signature（単一真実源）。
// 元は scripts/check-note-attachments.mjs のローカル定義（PROMISE_RE）。DN-0147 で
// scripts/lib/note-frontmatter.mjs の pdfPromise 判定がこれより狭い `/PDF/ && /(ダウンロード|添付|配布)/`
// を独自実装しており、「印刷用PDF」のような言い回しを拾えず note-republish-plan.mjs の
// pdfReady/pdfMissing 判定を ready 側に誤らせていた（2026-08-27 実測4件）。
// 「印刷用PDF」は**半角スペース入りの表記も実在する**（2026-08-18 実測: なし 413 / あり 136）。
// 日本語と欧文の間に空白を入れる組版慣習によるもので、総監模範論文 77 本はすべてこの形。
export const PDF_PROMISE_RE = /(印刷用[ 　]?PDF|末尾に添付|記事末尾に添付|添付しています|PDF[^\n]{0,24}(ダウンロード|添付)|ダウンロードできます)/;

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
  // 本文が PDF 配布を約束しているか。--reattach-pdf が要るかどうかの判定に使う。
  const pdfPromise = PDF_PROMISE_RE.test(content);
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
