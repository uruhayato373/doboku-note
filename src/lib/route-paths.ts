/**
 * 公開 URL のパスを作る唯一の関数群（トピック・公的基準・資格ハブ）。依存ゼロに保つ（クライアントの束に索引を持ち込まない）。
 *
 * 画面やライブラリでテンプレート文字列から `/topics/…`・`/standards/…`・`/exam/…` を組み立てない。
 * URL の形を変えるときはここだけを直す（tests/route-paths-ratchet.test.mjs が組み立ての直書きを増やさない）。
 * 記事の正規パスは content-routes.ts の getPublicDocPath、公的基準の節は standards-section-split.mjs（スクリプトと共有）。
 */

/** 横断トピックのページ（/topics/<slug>） */
export const topicPath = (slug: string): string => `/topics/${slug}`;

/** 資格ハブ（/exam/<資格>） */
export const examHubPath = (category: string): string => `/exam/${category}`;

/** 公的基準の発行機関（/standards/<機関>） */
export const standardsAgencyPath = (agencyId: string): string => `/standards/${agencyId}`;

/** 公的基準の文書（/standards/<機関>/<文書>） */
export const standardsDocumentPath = (agencyId: string, documentId: string): string => `${standardsAgencyPath(agencyId)}/${documentId}`;

/** 公的基準の章（/standards/<機関>/<文書>/chapters/<章>） */
export const standardsChapterPath = (agencyId: string, documentId: string, chapterId: string): string =>
  `${standardsDocumentPath(agencyId, documentId)}/chapters/${chapterId}`;
