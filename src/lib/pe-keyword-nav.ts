import docMetaIndex from "@/config/doc-meta-index.json";

const CATEGORY_PREFIX = "pe-comprehensive-management-";

/**
 * pe-comprehensive-management のキーワードナビ（SectionKeywords / CategoryNavCard）が
 * 実在ページだけをリンクするための検証ヘルパー。
 *
 * pe-chapters.json のキーワード分類には、まだページ化されていない slug（phantom）が
 * 含まれることがある（例: bcp-crisis-management）。これらへナビリンクを張ると
 * 内部リンク切れになり build 後 SEO ゲート（check-seo-build）で error になる。
 * doc-meta-index.json は published 記事のみを収録するため、そのキー集合を
 * 「ページが実在する」の真実源とする。
 */
const publishedKeywordSuffixes = new Set<string>(
  Object.keys((docMetaIndex as { docs: Record<string, unknown> }).docs)
    .filter((slug) => slug.startsWith(CATEGORY_PREFIX))
    .map((slug) => slug.slice(CATEGORY_PREFIX.length)),
);

/** pe-comprehensive-management-{suffix} の記事ページが実在（published）するか。 */
export function peKeywordPageExists(suffix: string): boolean {
  return publishedKeywordSuffixes.has(suffix);
}
