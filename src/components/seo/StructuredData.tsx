import type { PostData } from "@/types/blog";

interface StructuredDataProps {
  type: "article" | "website" | "organization";
  post?: PostData;
}

export default function StructuredData({ type, post }: StructuredDataProps) {
  const generateStructuredData = () => {
    const baseUrl = "https://doboku-note.com";

    switch (type) {
      case "article":
        if (!post) return null;

        return {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.description,
          image: `${baseUrl}/ogp/${post.id}.jpg`,
          author: {
            "@type": "Person",
            name: "doboku-note 編集部",
          },
          publisher: {
            "@type": "Organization",
            name: "doboku-note",
            logo: {
              "@type": "ImageObject",
              url: `${baseUrl}/logo.png`,
            },
          },
          datePublished: post.date,
          dateModified: post.date,
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `${baseUrl}/blog/${post.id}`,
          },
          articleSection: post.category,
          keywords: post.tags?.join(", "),
          inLanguage: "ja-JP",
        };

      case "website":
        return {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "カッコム",
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
          name: "カッコム",
          description:
            "1級土木施工管理技士・技術士の受験者向け技術ノート・試験対策サイト",
          url: baseUrl,
          logo: `${baseUrl}/logo.png`,
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(structuredData, null, 2),
      }}
    />
  );
}
