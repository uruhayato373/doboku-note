import 'server-only';

import catalogJson from '@/../content/site/standards-library/catalog.json';
import structureConfig from '@/../config/standards-structure.json';
import { editionDuplicateOf } from '@/lib/standards-editions.mjs';

type StandardPart = {
  slug: string;
  file: string;
  firstPage: number;
  lastPage: number;
  pageCount: number;
  sha256: string;
  bytes: number;
};

type UnreadableRange = {
  agencyId: string;
  documentId: string;
  page: number;
  range: string;
  notes: string;
};

export type StandardDocument = {
  agencyId: string;
  agencyName: string;
  documentId: string;
  role: 'common' | 'companion';
  title: string;
  landing: string;
  sourceUrl: string | null;
  sourceSha256: string;
  sourceBytes: number;
  pages: number;
  partCount: number;
  markdownBytes: number;
  replacementCharacters: number;
  visualReviewedPages: number;
  pendingVisualPages: number;
  edition: string | null;
  sourceFile: string | null;
  parts: StandardPart[];
  unreadableRanges: UnreadableRange[];
  duplicateOf?: string;
};

export type StandardsCatalog = {
  asOf: string;
  generatedAt: string;
  status: string;
  scope: string;
  totals: {
    agencies: number;
    documents: number;
    pages: number;
    parts: number;
    sourceBytes: number;
    markdownBytes: number;
    replacementCharacters: number;
    visualReviewedPages: number;
    pendingVisualPages: number;
    unreadableRanges: number;
  };
  agencies: Array<{
    agencyId: string;
    agencyName: string;
    documentCount: number;
    pages: number;
    partCount: number;
  }>;
  documents: StandardDocument[];
  publication: {
    sourceAttribution: string;
    derivativeNotice: string;
    license: string;
    disclaimer: string;
  };
};

const catalog = catalogJson as StandardsCatalog;

export function getStandardsCatalog(): StandardsCatalog {
  return catalog;
}

export function getStandardDocuments(agencyId?: string): StandardDocument[] {
  return catalog.documents
    .filter((document) => !agencyId || document.agencyId === agencyId)
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === 'common' ? -1 : 1;
      return a.title.localeCompare(b.title, 'ja');
    });
}

export function getStandardDocument(agencyId: string, documentId: string): StandardDocument | null {
  return catalog.documents.find(
    (document) => document.agencyId === agencyId && document.documentId === documentId,
  ) ?? null;
}

// 本文がこの文言で言及していたら、ライブラリに収録したその文書へ案内する（キー＝agencyId/documentId）。
// 共通仕様書 1-1-27 施工管理などが「土木工事施工管理基準」を参照しているのに行き先が無かった（DN-0393）。
// 「機械工事施工管理基準」は別の基準なので、文言は文書名の先頭から書く。
const STANDARD_MENTION_KEYWORDS: Record<string, string[]> = {
  'mlit/sekou-kanri-kijun': ['土木工事施工管理基準'],
};

export function getReferencedStandardDocuments(current: StandardDocument, text: string): StandardDocument[] {
  return Object.entries(STANDARD_MENTION_KEYWORDS)
    .filter(([key, keywords]) => key !== `${current.agencyId}/${current.documentId}` && keywords.some((keyword) => text.includes(keyword)))
    .map(([key]) => {
      const [agencyId, documentId] = key.split('/');
      return agencyId && documentId ? getStandardDocument(agencyId, documentId) : null;
    })
    .filter((document): document is StandardDocument => document !== null);
}

export type StandardEditionDuplicate = {
  /** 要綱・要領の名前 */
  title: string;
  /** この文書の版 */
  edition: string;
  /** 検索に載せる 1 本の文書（冊子の項目なら item を持つ） */
  canonical: { document: string; item?: number; edition: string };
  reason: string;
};

/**
 * 同じ要綱を他の機関・版でも収録していて、この文書は索引に載せない側か（設定 editionCanonical）。
 * item を渡すと冊子の項目（近畿の必携の 14 項など）で見る。載せない側なら群の情報を返す。判定は src/lib/standards-editions.mjs（生成器と同じ関数）。
 */
export function getStandardEditionDuplicate(
  document: Pick<StandardDocument, 'agencyId' | 'documentId'>,
  item: number | null = null,
): StandardEditionDuplicate | null {
  const found = editionDuplicateOf(structureConfig, `${document.agencyId}/${document.documentId}`, item);
  if (!found) return null;
  return { title: found.group.title, edition: found.entry.edition, canonical: found.canonical, reason: found.entry.reason };
}

export function isStandardPartIndexable(document: StandardDocument): boolean {
  if (document.duplicateOf) return false;
  if (getStandardEditionDuplicate(document)) return false;
  // Regional common specifications largely share the same national body.
  // Index the Kinki seed edition and all unique companion manuals; other
  // bureaus remain fully readable but noindex to avoid a duplicate crawl set.
  return document.role !== 'common' || document.agencyId === 'kinki';
}

export function standardDocumentPath(document: Pick<StandardDocument, 'agencyId' | 'documentId'>): string {
  return `/standards/${document.agencyId}/${document.documentId}`;
}

