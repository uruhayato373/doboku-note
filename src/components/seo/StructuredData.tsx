import type { PostData } from "@/types/blog";
import type { DocMeta } from "@/lib/docs";

interface StructuredDataProps {
  type: "article" | "website" | "organization";
  post?: PostData;
  docMeta?: DocMeta;
}

function isExamQuizPage(meta: DocMeta | PostData): boolean {
  const tags = meta.tags || [];
  return tags.includes("past-questions");
}

function getExamName(category: string | undefined): string {
  switch (category) {
    case "civil-construction-1":
      return "1級土木施工管理技士";
    case "pe-comprehensive-management":
      return "技術士 総合技術監理部門";
    default:
      return "土木系資格試験";
  }
}

function generateQuizSchema(meta: DocMeta | PostData, baseUrl: string) {
  const slug = "id" in meta ? meta.id : meta.slug;
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
    url: `${baseUrl}/docs/${slug}`,
    learningResourceType: "Practice",
  };
}

export default function StructuredData({ type, post, docMeta }: StructuredDataProps) {
  const generateStructuredData = () => {
    const baseUrl = "https://doboku-note.com";

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
              name: "doboku-note 編集部",
            },
            publisher: {
              "@type": "Organization",
              name: "doboku-note",
            },
            datePublished: post.date,
            dateModified: post.date,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${baseUrl}/docs/${post.id}`,
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
            headline: docMeta.title,
            description: docMeta.description || docMeta.title,
            author: {
              "@type": "Organization",
              name: "doboku-note",
            },
            publisher: {
              "@type": "Organization",
              name: "doboku-note",
            },
            datePublished: (docMeta as any).created || undefined,
            dateModified: (docMeta as any).created || undefined,
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `${baseUrl}/docs/${docMeta.slug}`,
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
            "https://twitter.com/doboku_note",
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

  // Check if this is a quiz page and generate additional Quiz schema
  const meta = post || docMeta;
  const quizData = meta && isExamQuizPage(meta as DocMeta | PostData)
    ? generateQuizSchema(meta as DocMeta | PostData, "https://doboku-note.com")
    : null;

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
    </>
  );
}
