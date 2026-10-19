/**
 * standards-chapter-labels — 章記事の編・章の表示の語。
 *
 * 柱で切った共通仕様書は「第N編 編名」「第N章 章名」、目次（outline）で切った工事必携の要綱は manifest の
 * bookLabel・chapterLabel（`土木工事編`・`第1章`・`Ⅰ．`）を使う。server-only を持たないので、公開データの
 * 生成（scripts/build-standards-data.ts が読む standards-structured-data）からも使える。
 */

type ChapterLabelSource = {
  bookNumber: number;
  bookTitle: string;
  bookLabel?: string;
  chapterNumber: number;
  chapterTitle: string;
  chapterLabel?: string;
};
type ChapterLabelFields<K extends keyof ChapterLabelSource> = Pick<ChapterLabelSource, K>;

/** 編の表示（`第1編 共通編`。目次（outline）で切った文書は設定の編の名前）。 */
export function standardBookLabel(chapter: ChapterLabelFields<'bookNumber' | 'bookTitle' | 'bookLabel'>): string {
  return chapter.bookLabel ?? `第${chapter.bookNumber}編 ${chapter.bookTitle}`;
}

/** 章の番号の語（`第3章`。目次で切った文書は原本の語 `第1章`・`Ⅰ．`、番号の無い章は空）。 */
function standardChapterNumberLabel(chapter: ChapterLabelFields<'chapterNumber' | 'chapterLabel'>): string {
  return chapter.chapterLabel ?? `第${chapter.chapterNumber}章`;
}

/** 章の見出し（`第3章 無筋・鉄筋コンクリート`）。 */
export function standardChapterHeading(chapter: ChapterLabelFields<'chapterNumber' | 'chapterLabel' | 'chapterTitle'>): string {
  return [standardChapterNumberLabel(chapter), chapter.chapterTitle].filter(Boolean).join(' ');
}
