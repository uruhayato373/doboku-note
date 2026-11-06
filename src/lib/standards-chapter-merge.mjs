/**
 * 近畿版と本文が同じ地域版の章ページを、近畿版へまとめる判定。
 * content/site/standards-articles/comparison.json の status が identical の文書だけが対象で、
 * 改訂で差分が出れば自動で章ページが戻る。ページ生成・リンク・_redirects が同じ答えを使う。
 */
export const CHAPTER_BASELINE = { agencyId: 'kinki', documentId: 'common' };

export function mergedChapterDocuments(comparison) {
  return comparison.rows.filter((row) => row.status === 'identical');
}

export function isMergedChapterDocument(comparison, agencyId, documentId) {
  return mergedChapterDocuments(comparison).some(
    (row) => row.agencyId === agencyId && row.documentId === documentId,
  );
}
