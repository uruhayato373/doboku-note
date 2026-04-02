import type { PostData } from "@/types/blog";

interface StructuredDataProps {
  type: "article" | "website" | "organization";
  post?: PostData;
}

export default function StructuredData({ type, post }: StructuredDataProps) {
  const generateStructuredData = () => {
    const baseUrl = "https://kakkom.com";

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
            name: "カッコム編集部",
          },
          publisher: {
            "@type": "Organization",
            name: "カッコム",
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
          description: "カッコいい公務員を目指して",
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
            "40代からの公務員・会社員をターゲットとしたライフスタイルメディア",
          url: baseUrl,
          logo: `${baseUrl}/logo.png`,
          sameAs: [
            "https://twitter.com/kakkomu",
            "https://www.facebook.com/kakkomu",
          ],
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            email: "info@kakkom.com",
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
