import type { PostData } from "@/types/blog";
import type { DocMeta } from "@/lib/docs";

import categoriesData from "@/config/categories.json";
import { AUTHOR } from "@/config/author";
import { SITE_ORIGIN } from "@/config/site-identity.mjs";
import { getCategoryHubPath } from '@/lib/categories';
import { getPublicDocPath } from '@/lib/content-routes';

interface StructuredDataProps {
  type: "article" | "website" | "organization";
  post?: PostData;
  docMeta?: DocMeta;
}

function getCategoryLabelForSchema(slug: string): string {
  const cat = (categoriesData as { slug: string; label: string }[]).find(
    (c) => c.slug === slug
  );
  return cat?.label ?? slug;
}

function generateBreadcrumbSchema(
  meta: DocMeta | PostData,
  baseUrl: string
) {
  const category = meta.category;

  const items: object[] = [
    {
      "@type": "ListItem",
      position: 1,
      name: "ホーム",
      item: baseUrl,
    },
  ];

  if (category) {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: getCategoryLabelForSchema(category),
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

function isKeywordPage(meta: DocMeta | PostData): boolean {
  return ("group" in meta && meta.group === "keyword") || (meta.tags || []).includes("keyword");
}

function generateDefinedTermSchema(meta: DocMeta | PostData, baseUrl: string) {
  const slug = String("id" in meta ? meta.id : meta.slug);
  const category = meta.category;

  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: meta.title,
    description: meta.description || meta.title,
    url: `${baseUrl}${getPublicDocPath(slug)}`,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: category === "pe-comprehensive-management"
        ? "技術士 総合技術監理部門 キーワード集 2026"
        : category === "civil-construction-1"
          ? "1級土木施工管理技士 キーワード集"
          : category === "civil-construction-2"
            ? "2級土木施工管理技士 キーワード集"
            : "土木系資格試験 キーワード集",
      url: category === "pe-comprehensive-management"
        ? `${baseUrl}${getPublicDocPath('pe-comprehensive-management-keyword-2026')}`
        : `${baseUrl}${getCategoryHubPath(category || 'uncategorized')}`,
    },
    inLanguage: "ja-JP",
  };
}

function isExamQuizPage(meta: DocMeta | PostData): boolean {
  const tags = meta.tags || [];
  return tags.includes("past-questions");
}

// 構造化データの対象資格名。資格カテゴリの名前は categories.json（qualification-registry.json の正式名を
// npm run sync-qualification-names が書く）から引き、ここに資格名を写さない
function getExamName(category: string | undefined): string {
  return (category && categoriesData.find((c) => c.slug === category)?.label) || "土木系資格試験";
}

type FAQEntry = { q: string; a: string };
type RawFAQEntry = FAQEntry | { question: string; answer: string };

function getFAQs(meta: DocMeta | PostData): FAQEntry[] {
  const raw = "faqs" in meta ? meta.faqs : undefined;
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
        text: entry.a,
      },
    })),
    inLanguage: "ja-JP",
  };
}

function generateQuizSchema(meta: DocMeta | PostData, baseUrl: string) {
  const slug = String("id" in meta ? meta.id : meta.slug);
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

export default function StructuredData({ type, post, docMeta }: StructuredDataProps) {
  const generateStructuredData = () => {
    const baseUrl = SITE_ORIGIN;

    switch (type) {
      case "article":
        if (post) {
          return {
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.title,
            description: post.description,
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
            datePublished: post.date,
            dateModified: post.date,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${baseUrl}${getPublicDocPath(post.id)}`,
            },
            articleSection: post.category,
            keywords: post.tags?.join(", "),
            inLanguage: "ja-JP",
          };
        }

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
            email: "info@doboku-note.com",
          },
        };

      default:
        return null;
    }
  };

  const structuredData = generateStructuredData();

  if (!structuredData) return null;

  const meta = post || docMeta;
  const baseUrl = SITE_ORIGIN;

  // Additional schemas for specific page types
  const quizData = meta && isExamQuizPage(meta as DocMeta | PostData)
    ? generateQuizSchema(meta as DocMeta | PostData, baseUrl)
    : null;

  const definedTermData = meta && isKeywordPage(meta as DocMeta | PostData)
    ? generateDefinedTermSchema(meta as DocMeta | PostData, baseUrl)
    : null;

  const breadcrumbData =
    type === "article" && meta
      ? generateBreadcrumbSchema(meta as DocMeta | PostData, baseUrl)
      : null;

  const faqEntries = meta ? getFAQs(meta as DocMeta | PostData) : [];
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
