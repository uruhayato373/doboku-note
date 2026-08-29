import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import catalogJson from '@/../content/site/standards-library/catalog.json';

export type StandardPart = {
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

export type TranscribedPage = {
  page: number;
  textSha256: string | null;
  text: string;
};

const catalog = catalogJson as StandardsCatalog;
const LIBRARY_ROOT = join(process.cwd(), 'content', 'site', 'standards-library');

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

export function getStandardPart(
  agencyId: string,
  documentId: string,
  partSlug: string,
): { document: StandardDocument; part: StandardPart } | null {
  const document = getStandardDocument(agencyId, documentId);
  const part = document?.parts.find((candidate) => candidate.slug === partSlug);
  return document && part ? { document, part } : null;
}

export function isStandardPartIndexable(document: StandardDocument): boolean {
  if (document.duplicateOf) return false;
  // Regional common specifications largely share the same national body.
  // Index the Kinki seed edition and all unique companion manuals; other
  // bureaus remain fully readable but noindex to avoid a duplicate crawl set.
  return document.role !== 'common' || document.agencyId === 'kinki';
}

export function readTranscribedPages(part: StandardPart): TranscribedPage[] {
  const source = readFileSync(join(LIBRARY_ROOT, part.file), 'utf8');
  const heading = /^## PDF page (\d+)\s*$/gm;
  const matches = [...source.matchAll(heading)];

  return matches.map((match, index) => {
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[index + 1]?.index ?? source.length;
    const section = source.slice(start, end);
    const sha = section.match(/text-sha256:\s*([a-f0-9]{64})/i)?.[1] ?? null;
    const text = section.match(/`{3,4}text\s*\r?\n([\s\S]*?)\r?\n`{3,4}/)?.[1] ?? section.trim();
    return { page: Number(match[1]), textSha256: sha, text };
  });
}

export function standardDocumentPath(document: Pick<StandardDocument, 'agencyId' | 'documentId'>): string {
  return `/standards/${document.agencyId}/${document.documentId}`;
}

export function standardPartPath(
  document: Pick<StandardDocument, 'agencyId' | 'documentId'>,
  part: Pick<StandardPart, 'slug'>,
): string {
  return `${standardDocumentPath(document)}/${part.slug}`;
}
