import type { StandardChapter } from '@/lib/standards-articles';
import type { StandardDocument } from '@/lib/standards';
import { generateHeadingId } from '@/lib/toc';

const SITE_URL = 'https://doboku-note.com';
const SITE_ORGANIZATION_ID = `${SITE_URL}/#organization`;

export const PUBLIC_DATA_LICENSE_URL =
  'https://www.digital.go.jp/resources/open_data/public_data_license_v1.0';
export const MLIT_TERMS_URL = 'https://www.mlit.go.jp/link.html';

type JsonLdNode = Record<string, unknown>;

type ChapterDataUrls = {
  markdown: string;
  jsonLd: string;
};

function absoluteUrl(path: string): string {
  return path.startsWith('http://') || path.startsWith('https://') ? path : `${SITE_URL}${path}`;
}

function siteOrganization(): JsonLdNode {
  return {
    '@type': 'Organization',
    '@id': SITE_ORGANIZATION_ID,
    name: 'doboku-note',
    url: SITE_URL,
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
  const pageUrl = `${SITE_URL}/standards/data`;
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
            contentUrl: `${SITE_URL}/standards-data/catalog.json`,
          },
          {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: `${SITE_URL}/standards-data/comparison.json`,
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

  chapter.sections.forEach((section, sectionIndex) => {
    const sectionUrl = `${chapterUrl}#${generateHeadingId(section.headingText)}`;
    const sectionId = `${chapterUrl}#section-${chapter.bookNumber}-${chapter.chapterNumber}-${section.number}`;
    const articleRefs = section.articles.map((article) => ({
      '@id': `${chapterUrl}#clause-${article.number}`,
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
      const text = articleText?.get(article.number);
      articleNodes.push({
        '@type': 'CreativeWork',
        '@id': `${chapterUrl}#clause-${article.number}`,
        name: article.headingText,
        identifier: article.number,
        position: articleIndex + 1,
        pageStart: article.page,
        url: `${chapterUrl}#${generateHeadingId(article.headingText)}`,
        isPartOf: { '@id': sectionId },
        ...(text ? { text } : {}),
      });
    });
  });

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
    { name: 'ホーム', item: SITE_URL },
    { name: '基準類', item: `${SITE_URL}/standards` },
    { name: document.agencyName, item: `${SITE_URL}/standards/${document.agencyId}` },
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
        headline: `第${chapter.chapterNumber}章 ${chapter.chapterTitle}`,
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
        ...(sectionNodes.length > 0
          ? { hasPart: sectionNodes.map((section) => ({ '@id': section['@id'] })) }
          : {}),
        ...(encodings.length > 0 ? { encoding: encodings } : {}),
      },
      ...sectionNodes,
      ...articleNodes,
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
