import docMetaIndex from "@/config/doc-meta-index.json";
import peChapters from "@/config/pe-chapters.json";

const CATEGORY_PREFIX = "pe-comprehensive-management-";

/**
 * pe-comprehensive-management のキーワードナビ（SectionKeywords / CategoryNavCard）が
 * 実在ページだけをリンクするための検証ヘルパー。
 *
 * pe-chapters.json のキーワード分類には、まだページ化されていない slug（phantom）が
 * 混入し得る（過去例: bcp-crisis-management。2026-07-24 に実体 business-continuity-plan
 * へ差し替え済みで現在 phantom はゼロ）。phantom へナビリンクを張ると
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

const sectionLabels = new Map<string, string>(
  (peChapters as { chapters: { sections: { id: string; title: string }[] }[] }).chapters.flatMap((chapter) =>
    chapter.sections.map((section): [string, string] => [section.id, `${section.id} ${section.title}`]),
  ),
);

/** 総監のキーワード集の節（"2.1"）の見出し（"2.1 事業企画"）。テーマのページで、記事の多い総監の一覧を節ごとに区切る（DN-0423）。 */
export function peSectionLabel(sectionId: string | undefined): string | undefined {
  return sectionId ? sectionLabels.get(sectionId) : undefined;
}
