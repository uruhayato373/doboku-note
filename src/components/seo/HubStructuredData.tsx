import type { DocMeta } from "@/lib/docs";
import { getPublicDocPath } from "@/lib/content-routes";
import { SITE_ORIGIN } from "@/config/site-identity.mjs";

/** ItemList は検索エンジンが読む範囲に収める（ハブの記事は数百本になる資格がある）。 */
const MAX_ITEMS = 100;

/**
 * 資格の入口ページ（カテゴリハブ）の構造化データ: CollectionPage と、配下の記事の ItemList。
 * 記事ページの Article・BreadcrumbList は StructuredData.tsx が持つ。ハブは一覧が主役なのでこちらで出す（DN-0412）。
 */
export default function HubStructuredData({
  path,
  name,
  description,
  docs,
}: {
  path: string;
  name: string;
  description?: string;
  docs: Pick<DocMeta, "slug" | "title">[];
}) {
  const url = `${SITE_ORIGIN}${path}`;
  const data = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": url,
    url,
    name,
    ...(description ? { description } : {}),
    inLanguage: "ja",
    isPartOf: { "@type": "WebSite", name: "doboku-note", url: SITE_ORIGIN },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: Math.min(docs.length, MAX_ITEMS),
      itemListElement: docs.slice(0, MAX_ITEMS).map((doc, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_ORIGIN}${getPublicDocPath(doc.slug)}`,
        name: doc.title,
      })),
    },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
