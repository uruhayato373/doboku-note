import type { DocMeta } from "@/lib/docs";
import { inlinePlainText } from "@/lib/inline-links";

import { AUTHOR } from "@/config/author";
import { CONTACT_EMAIL, SITE_ORIGIN } from "@/config/site-identity.mjs";
import { getCategoryBySlug, getCategoryHubPath, getCategoryLabel } from '@/lib/categories';
import { categoryBreadcrumbHead } from '@/lib/category-breadcrumb';
import { getPublicDocPath } from '@/lib/content-routes';
import { getOgpImageUrl } from '@/lib/r2-image-loader';
import { qualificationLabel } from "@/lib/qualification-names";

// キーワード集を持つ資格。名前は registry の正式名から作る（総監だけ版の年を付ける）
const KEYWORD_SET_EDITION: Readonly<Record<string, string>> = {
  "pe-comprehensive-management": " 2026",
  "civil-construction-1": "",
  "civil-construction-2": "",
};
const keywordSetName = (category: string | undefined): string =>
  category && category in KEYWORD_SET_EDITION
    ? `${qualificationLabel(category)} キーワード集${KEYWORD_SET_EDITION[category]}`
    : "土木系資格試験 キーワード集";

interface StructuredDataProps {
  type: "article" | "website" | "organization";
  docMeta?: DocMeta;
}

function generateBreadcrumbSchema(
  meta: DocMeta,
  baseUrl: string
) {
  const category = meta.category;

  // 先頭の段（ホームと、資格試験なら領域の入口）は記事の見出しのパンくずと同じ規則（src/lib/category-breadcrumb.ts）
  const items: object[] = categoryBreadcrumbHead(category).map((crumb, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: crumb.label,
    item: crumb.href === "/" ? baseUrl : `${baseUrl}${crumb.href}`,
  }));

  if (category) {
    items.push({
      "@type": "ListItem",
      position: items.length + 1,
      name: getCategoryLabel(category),
      item: `${baseUrl}${getCategoryHubPath(category)}`,
    });
  }

  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: meta.title,
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

function isKeywordPage(meta: DocMeta): boolean {
  return meta.group === "keyword" || (meta.tags || []).includes("keyword");
}

function generateDefinedTermSchema(meta: DocMeta, baseUrl: string) {
  const slug = meta.slug;
  const category = meta.category;

  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: meta.title,
    description: meta.description || meta.title,
    url: `${baseUrl}${getPublicDocPath(slug)}`,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: keywordSetName(category),
      url: category === "pe-comprehensive-management"
        ? `${baseUrl}${getPublicDocPath('pe-comprehensive-management-keyword-2026')}`
        : `${baseUrl}${getCategoryHubPath(category || 'uncategorized')}`,
    },
    inLanguage: "ja-JP",
  };
}

function isExamQuizPage(meta: DocMeta): boolean {
  const tags = meta.tags || [];
  return tags.includes("past-questions");
}

// 構造化データの対象資格名。資格カテゴリの名前は categories.json（qualification-registry.json の正式名を
// npm run sync-qualification-names が書く）から引き、ここに資格名を写さない
function getExamName(category: string | undefined): string {
  return (category && getCategoryBySlug(category)?.label) || "土木系資格試験";
}

type FAQEntry = { q: string; a: string };
type RawFAQEntry = FAQEntry | { question: string; answer: string };

function getFAQs(meta: DocMeta): FAQEntry[] {
  const raw = meta.faqs;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item: RawFAQEntry) => {
    const q = "q" in item ? item.q : item.question;
    const a = "a" in item ? item.a : item.answer;
    return q.trim().length > 0 && a.trim().length > 0 ? [{ q, a }] : [];
  });
}

function generateFAQSchema(faqs: FAQEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((entry) => ({
      "@type": "Question",
      name: entry.q,
      acceptedAnswer: {
        "@type": "Answer",
        // 回答の [題](URL)・**太字** は記法を外した文だけを渡す
        text: inlinePlainText(entry.a),
      },
    })),
    inLanguage: "ja-JP",
  };
}

function generateQuizSchema(meta: DocMeta, baseUrl: string) {
  const slug = meta.slug;
  return {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: meta.title,
    about: {
      "@type": "Thing",
      name: getExamName(meta.category),
    },
    educationalLevel: "Professional",
    inLanguage: "ja-JP",
    provider: {
      "@type": "Organization",
      name: "doboku-note",
    },
    url: `${baseUrl}${getPublicDocPath(slug)}`,
    learningResourceType: "Practice",
  };
}

export default function StructuredData({ type, docMeta }: StructuredDataProps) {
  const generateStructuredData = () => {
    const baseUrl = SITE_ORIGIN;

    switch (type) {
      case "article":
        if (docMeta) {
          return {
            "@context": "https://schema.org",
            "@type": "TechArticle",
            // 検索結果用 seoTitle ではなく、ページ上で見える H1 と一致させる。
            headline: docMeta.title,
            description: docMeta.description || docMeta.title,
            author: {
              "@type": "Person",
              name: AUTHOR.name,
              url: AUTHOR.url,
              jobTitle: AUTHOR.jobTitle,
              knowsAbout: AUTHOR.knowsAbout,
            },
            publisher: {
              "@type": "Organization",
              name: "doboku-note",
            },
            datePublished:
              docMeta.publishedAt ||
              docMeta.created ||
              undefined,
            dateModified:
              docMeta.dateModified ||
              docMeta.lastRewrittenAt ||
              docMeta.updatedAt ||
              docMeta.publishedAt ||
              docMeta.created ||
              undefined,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${baseUrl}${getPublicDocPath(docMeta.slug)}`,
            },
            articleSection: docMeta.category,
            keywords: docMeta.tags?.join(", "),
            // og:image と同じ記事の ogp.png（公開記事は CI が実在を保証）。check-seo-build の jsonld_recommended_missing（1389 件）を解消する
            image: getOgpImageUrl(docMeta.slug),
            inLanguage: "ja-JP",
          };
        }

        return null;

      case "website":
        return {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "doboku-note",
          description: "1級土木施工管理技士・技術士の試験対策サイト",
          url: baseUrl,
          potentialAction: {
            "@type": "SearchAction",
            target: `${baseUrl}/search?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        };

      case "organization":
        return {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "doboku-note",
          description:
            "1級土木施工管理技士・技術士の受験者向け技術ノート・試験対策サイト",
          url: baseUrl,
          sameAs: [
            AUTHOR.twitterUrl,
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            email: CONTACT_EMAIL,
          },
        };

      default:
        return null;
    }
  };

  const structuredData = generateStructuredData();

  if (!structuredData) return null;

  const meta = docMeta;
  const baseUrl = SITE_ORIGIN;

  // Additional schemas for specific page types
  const quizData = meta && isExamQuizPage(meta)
    ? generateQuizSchema(meta, baseUrl)
    : null;

  const definedTermData = meta && isKeywordPage(meta)
    ? generateDefinedTermSchema(meta, baseUrl)
    : null;

  const breadcrumbData =
    type === "article" && meta
      ? generateBreadcrumbSchema(meta, baseUrl)
      : null;

  const faqEntries = meta ? getFAQs(meta) : [];
  const faqData = faqEntries.length > 0 ? generateFAQSchema(faqEntries) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData, null, 2),
        }}
      />
      {quizData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(quizData, null, 2),
          }}
        />
      )}
      {definedTermData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(definedTermData, null, 2),
          }}
        />
      )}
      {breadcrumbData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbData, null, 2),
          }}
        />
      )}
      {faqData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqData, null, 2),
          }}
        />
      )}
    </>
  );
}
