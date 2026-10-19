import { standardChapterHeading } from '@/lib/standards-chapter-labels';
import type { StandardChapter, StandardChapterSection } from '@/lib/standards-articles';
import type { StandardDocument } from '@/lib/standards';
import { generateHeadingId } from '@/lib/toc';
import { SITE_ORIGIN } from '@/config/site-identity.mjs';
import { standardSectionPath } from '@/lib/standards-section-split.mjs';

const SITE_ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;

export const PUBLIC_DATA_LICENSE_URL =
  'https://www.digital.go.jp/resources/open_data/public_data_license_v1.0';
export const MLIT_TERMS_URL = 'https://www.mlit.go.jp/link.html';

type JsonLdNode = Record<string, unknown>;

type ChapterDataUrls = {
  markdown: string;
  jsonLd: string;
};

function absoluteUrl(path: string): string {
  return path.startsWith('http://') || path.startsWith('https://') ? path : `${SITE_ORIGIN}${path}`;
}

function siteOrganization(): JsonLdNode {
  return {
    '@type': 'Organization',
    '@id': SITE_ORGANIZATION_ID,
    name: 'doboku-note',
    url: SITE_ORIGIN,
    email: 'info@doboku-note.com',
  };
}

function sourceOrganization(document: StandardDocument): JsonLdNode {
  return {
    '@type': 'GovernmentOrganization',
    '@id': `${document.landing}#organization`,
    name: document.agencyName,
    url: document.landing,
  };
}

function sourceDocument(document: StandardDocument): JsonLdNode {
  const sourceUrl = document.sourceUrl ?? document.landing;
  return {
    '@type': 'DigitalDocument',
    '@id': `${sourceUrl}#document`,
    name: document.title,
    inLanguage: 'ja-JP',
    pagination: `${document.pages} pages`,
    encodingFormat: document.sourceUrl ? 'application/pdf' : 'text/html',
    publisher: { '@id': `${document.landing}#organization` },
    url: sourceUrl,
    license: MLIT_TERMS_URL,
  };
}

function processedDocument(
  document: StandardDocument,
  documentUrl: string,
  chapterCount?: number,
): JsonLdNode {
  return {
    '@type': ['DigitalDocument', 'Dataset'],
    '@id': `${documentUrl}#dataset`,
    name: `${document.title} 構造化データ`,
    description: `${document.agencyName}が公開する原本を、doboku-noteが検索・閲覧・機械利用向けに編・章・節・条へ構造化したデータです。`,
    inLanguage: 'ja-JP',
    pagination: `${document.pages} pages`,
    ...(chapterCount && chapterCount > 0 ? { numberOfItems: chapterCount } : {}),
    creator: { '@id': SITE_ORGANIZATION_ID },
    publisher: { '@id': SITE_ORGANIZATION_ID },
    isBasedOn: { '@id': `${document.sourceUrl ?? document.landing}#document` },
    license: PUBLIC_DATA_LICENSE_URL,
    url: documentUrl,
  };
}

export function buildStandardDocumentStructuredData(
  document: StandardDocument,
  chapterCount: number,
): JsonLdNode {
  const documentUrl = absoluteUrl(`/standards/${document.agencyId}/${document.documentId}`);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      siteOrganization(),
      sourceOrganization(document),
      sourceDocument(document),
      processedDocument(document, documentUrl, chapterCount),
      {
        '@type': 'WebPage',
        '@id': `${documentUrl}#webpage`,
        url: documentUrl,
        name: document.title,
        inLanguage: 'ja-JP',
        publisher: { '@id': SITE_ORGANIZATION_ID },
        mainEntity: { '@id': `${documentUrl}#dataset` },
      },
    ],
  };
}

export function buildStandardsDatasetStructuredData(input: {
  asOf: string;
  documents: number;
  structuredDocuments: number;
  pages: number;
  chapters: number;
  articles: number;
}): JsonLdNode {
  const pageUrl = `${SITE_ORIGIN}/standards/data`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      siteOrganization(),
      {
        '@type': 'WebPage',
        '@id': `${pageUrl}#webpage`,
        url: pageUrl,
        name: '土木工事共通仕様書 機械可読データ',
        inLanguage: 'ja-JP',
        publisher: { '@id': SITE_ORGANIZATION_ID },
        mainEntity: { '@id': `${pageUrl}#dataset` },
      },
      {
        '@type': 'Dataset',
        '@id': `${pageUrl}#dataset`,
        name: '地方整備局等 公的基準類構造化データセット',
        description: `全国の発行機関が公開する公的基準類${input.documents}文書・${input.pages}ページの出典索引と、そのうち共通の編章構造を持つ${input.structuredDocuments}文書をMarkdown・JSON-LDへ構造化したデータセットです。`,
        url: pageUrl,
        creator: { '@id': SITE_ORGANIZATION_ID },
        publisher: { '@id': SITE_ORGANIZATION_ID },
        dateModified: input.asOf,
        inLanguage: 'ja-JP',
        license: PUBLIC_DATA_LICENSE_URL,
        measurementTechnique: '原本PDFのページ単位文字起こし、SHA-256照合、編・章・節・条の構造解析',
        size: `${input.chapters}章・${input.articles}条`,
        distribution: [
          {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: `${SITE_ORIGIN}/standards-data/catalog.json`,
          },
          {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: `${SITE_ORIGIN}/standards-data/comparison.json`,
          },
        ],
      },
    ],
  };
}

export function buildStandardChapterStructuredData(
  document: StandardDocument,
  chapter: StandardChapter,
  dataUrls?: ChapterDataUrls,
  articleText?: ReadonlyMap<string, string>,
): JsonLdNode {
  const documentUrl = absoluteUrl(`/standards/${document.agencyId}/${document.documentId}`);
  const chapterUrl = absoluteUrl(
    `/standards/${document.agencyId}/${document.documentId}/chapters/${chapter.chapterId}`,
  );
  const chapterId = `${chapterUrl}#article`;
  const sourceId = `${document.sourceUrl ?? document.landing}#document`;
  const sectionNodes: JsonLdNode[] = [];
  const articleNodes: JsonLdNode[] = [];
  // 同じ章に同じ条番号が 2 度出るとき（北海道開発局独自 10-6-11-1 A 計測・B 計測）は、2 度目以降の
  // 本文を `番号#n` で引き（scripts/build-standards-data.ts の extractArticleText と同じ規則）、@id も分ける
  const articleKeys = new Map<object, { textKey: string; idSuffix: string }>();
  const seenNumbers = new Map<string, number>();
  const looseArticles = chapter.articles ?? [];
  for (const section of [...chapter.sections, { articles: looseArticles }]) {
    for (const article of section.articles) {
      const occurrence = (seenNumbers.get(article.number) ?? 0) + 1;
      seenNumbers.set(article.number, occurrence);
      articleKeys.set(article, occurrence === 1
        ? { textKey: article.number, idSuffix: article.number }
        : { textKey: `${article.number}#${occurrence}`, idSuffix: `${article.number}-${occurrence}` });
    }
  }
  const articleKey = (article: object) => articleKeys.get(article) ?? { textKey: '', idSuffix: '' };

  chapter.sections.forEach((section, sectionIndex) => {
    // 節ページに分けた章は、節・条の URL を節ページ側へ向ける（章ページには本文が無い）
    const sectionPageUrl = chapter.splitBySection
      ? absoluteUrl(standardSectionPath(document, chapter, section.number))
      : null;
    const sectionUrl = sectionPageUrl ?? `${chapterUrl}#${generateHeadingId(section.headingText)}`;
    const sectionId = `${chapterUrl}#section-${chapter.bookNumber}-${chapter.chapterNumber}-${section.number}`;
    const articleRefs = section.articles.map((article) => ({
      '@id': `${chapterUrl}#clause-${articleKey(article).idSuffix}`,
    }));

    sectionNodes.push({
      '@type': 'CreativeWork',
      '@id': sectionId,
      name: section.headingText,
      identifier: `${chapter.bookNumber}-${chapter.chapterNumber}-${section.number}`,
      position: sectionIndex + 1,
      pageStart: section.firstPage,
      pageEnd: section.lastPage,
      url: sectionUrl,
      isPartOf: { '@id': chapterId },
      ...(articleRefs.length > 0 ? { hasPart: articleRefs } : {}),
    });

    section.articles.forEach((article, articleIndex) => {
      const { textKey, idSuffix } = articleKey(article);
      const text = articleText?.get(textKey);
      articleNodes.push({
        '@type': 'CreativeWork',
        '@id': `${chapterUrl}#clause-${idSuffix}`,
        name: article.headingText,
        identifier: article.number,
        position: articleIndex + 1,
        pageStart: article.page,
        url: `${sectionPageUrl ?? chapterUrl}#${generateHeadingId(article.headingText)}`,
        isPartOf: { '@id': sectionId },
        ...(text ? { text } : {}),
      });
    });
  });

  // 節を持たない章の条は章の直下に置く（要綱の `第1 目的`）
  const looseArticleNodes: JsonLdNode[] = looseArticles.map((article, articleIndex) => {
    const { textKey, idSuffix } = articleKey(article);
    const text = articleText?.get(textKey);
    return {
      '@type': 'CreativeWork',
      '@id': `${chapterUrl}#clause-${idSuffix}`,
      name: article.headingText,
      identifier: article.number,
      position: articleIndex + 1,
      pageStart: article.page,
      url: `${chapterUrl}#${generateHeadingId(article.headingText)}`,
      isPartOf: { '@id': chapterId },
      ...(text ? { text } : {}),
    };
  });
  articleNodes.push(...looseArticleNodes);

  const encodings = dataUrls
    ? [
        {
          '@type': 'MediaObject',
          encodingFormat: 'text/markdown',
          contentUrl: absoluteUrl(dataUrls.markdown),
        },
        {
          '@type': 'MediaObject',
          encodingFormat: 'application/ld+json',
          contentUrl: absoluteUrl(dataUrls.jsonLd),
        },
      ]
    : [];

  const breadcrumb = [
    { name: 'ホーム', item: SITE_ORIGIN },
    { name: '基準類', item: `${SITE_ORIGIN}/standards` },
    { name: document.agencyName, item: `${SITE_ORIGIN}/standards/${document.agencyId}` },
    { name: document.title, item: documentUrl },
    { name: chapter.title, item: chapterUrl },
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      siteOrganization(),
      sourceOrganization(document),
      sourceDocument(document),
      processedDocument(document, documentUrl),
      {
        '@type': 'WebPage',
        '@id': `${chapterUrl}#webpage`,
        url: chapterUrl,
        name: chapter.title,
        inLanguage: 'ja-JP',
        publisher: { '@id': SITE_ORGANIZATION_ID },
        mainEntity: { '@id': chapterId },
        breadcrumb: { '@id': `${chapterUrl}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${chapterUrl}#breadcrumb`,
        itemListElement: breadcrumb.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.item,
        })),
      },
      {
        '@type': 'TechArticle',
        '@id': chapterId,
        headline: standardChapterHeading(chapter),
        alternativeHeadline: chapter.title,
        identifier: chapter.chapterId,
        inLanguage: 'ja-JP',
        pageStart: chapter.firstPage,
        pageEnd: chapter.lastPage,
        url: chapterUrl,
        mainEntityOfPage: { '@id': `${chapterUrl}#webpage` },
        creator: { '@id': SITE_ORGANIZATION_ID },
        publisher: { '@id': SITE_ORGANIZATION_ID },
        isPartOf: { '@id': `${documentUrl}#dataset` },
        isBasedOn: { '@id': sourceId },
        license: PUBLIC_DATA_LICENSE_URL,
        ...(sectionNodes.length + looseArticleNodes.length > 0
          ? { hasPart: [...sectionNodes, ...looseArticleNodes].map((node) => ({ '@id': node['@id'] })) }
          : {}),
        ...(encodings.length > 0 ? { encoding: encodings } : {}),
      },
      ...sectionNodes,
      ...articleNodes,
    ],
  };
}

/**
 * 節ページ（splitBySection の章）の構造化データ。節・条のノードの @id は章ページの
 * buildStandardChapterStructuredData と同じ値にして、章の TechArticle の一部であることを保つ。
 */
export function buildStandardSectionStructuredData(
  document: StandardDocument,
  chapter: StandardChapter,
  section: StandardChapterSection,
  pages: { first: number; last: number },
): JsonLdNode {
  const documentUrl = absoluteUrl(`/standards/${document.agencyId}/${document.documentId}`);
  const chapterUrl = absoluteUrl(
    `/standards/${document.agencyId}/${document.documentId}/chapters/${chapter.chapterId}`,
  );
  const sectionUrl = absoluteUrl(standardSectionPath(document, chapter, section.number));
  const sectionId = `${chapterUrl}#section-${chapter.bookNumber}-${chapter.chapterNumber}-${section.number}`;
  const breadcrumb = [
    { name: 'ホーム', item: SITE_ORIGIN },
    { name: '基準類', item: `${SITE_ORIGIN}/standards` },
    { name: document.agencyName, item: `${SITE_ORIGIN}/standards/${document.agencyId}` },
    { name: document.title, item: documentUrl },
    { name: chapter.title, item: chapterUrl },
    { name: section.headingText, item: sectionUrl },
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      siteOrganization(),
      {
        '@type': 'WebPage',
        '@id': `${sectionUrl}#webpage`,
        url: sectionUrl,
        name: `${section.headingText}｜${chapter.title}`,
        inLanguage: 'ja-JP',
        publisher: { '@id': SITE_ORGANIZATION_ID },
        mainEntity: { '@id': sectionId },
        breadcrumb: { '@id': `${sectionUrl}#breadcrumb` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${sectionUrl}#breadcrumb`,
        itemListElement: breadcrumb.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.item,
        })),
      },
      {
        '@type': 'CreativeWork',
        '@id': sectionId,
        name: section.headingText,
        identifier: `${chapter.bookNumber}-${chapter.chapterNumber}-${section.number}`,
        inLanguage: 'ja-JP',
        pageStart: pages.first,
        pageEnd: pages.last,
        url: sectionUrl,
        mainEntityOfPage: { '@id': `${sectionUrl}#webpage` },
        creator: { '@id': SITE_ORGANIZATION_ID },
        publisher: { '@id': SITE_ORGANIZATION_ID },
        isPartOf: { '@id': `${chapterUrl}#article` },
        license: PUBLIC_DATA_LICENSE_URL,
        ...(section.articles.length > 0
          ? { hasPart: section.articles.map((article) => ({ '@id': `${chapterUrl}#clause-${article.number}` })) }
          : {}),
      },
    ],
  };
}

export function standardsDataPath(
  document: Pick<StandardDocument, 'agencyId' | 'documentId'>,
  chapter: Pick<StandardChapter, 'chapterId'>,
  format: 'md' | 'jsonld',
): string {
  return `/standards-data/${document.agencyId}/${document.documentId}/chapters/${chapter.chapterId}.${format}`;
}

export function standardsDocumentDataPath(
  document: Pick<StandardDocument, 'agencyId' | 'documentId'>,
  format: 'json' | 'jsonld',
): string {
  return `/standards-data/${document.agencyId}/${document.documentId}/index.${format}`;
}
