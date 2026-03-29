interface ArticleJsonLdProps {
  title: string;
  description?: string;
  url: string;
}

export default function ArticleJsonLd({ title, description, url }: ArticleJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    ...(description && { description }),
    url,
    author: {
      '@type': 'Organization',
      name: 'doboku-note',
    },
    publisher: {
      '@type': 'Organization',
      name: 'doboku-note',
      logo: {
        '@type': 'ImageObject',
        url: 'https://doboku-note.com/img/logo.svg',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    inLanguage: 'ja',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
