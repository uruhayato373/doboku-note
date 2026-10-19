import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import catalogJson from '@/../content/site/standards-library/catalog.json';
import structureConfig from '@/../config/standards-structure.json';
import { editionDuplicateOf } from '@/lib/standards-editions.mjs';

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

// 分冊の中身を表す章名。分冊の題名が文書題名＋ページ範囲だけだと、文書ページと同じ
// 検索語（例「中国地方整備局 共通仕様書」）を取り合うため、章名を題名の先頭に置く。
// catalog.json は build-standards-library.mjs の生成物なので、ここで持つ。
const STANDARD_PART_LABELS: Record<string, string> = {
  'chugoku/local/part-01': '第1〜3編 共通編・材料編・土木工事共通編 関係の独自仕様',
  'chugoku/local/part-02': '第6〜10編 河川・河川海岸・砂防・道路編 関係の独自仕様',
  'mlit/sekou-kanri-kijun/part-01': '総則・出来形管理基準の目次・第1編 共通編〜第3編 土木工事共通編',
  'mlit/sekou-kanri-kijun/part-02': '出来形管理基準 第3編 土木工事共通編',
  'mlit/sekou-kanri-kijun/part-03': '出来形管理基準 第3編 土木工事共通編',
  'mlit/sekou-kanri-kijun/part-04': '出来形管理基準 第3編〜第10編（河川・河川海岸・砂防・ダム・道路）',
  'mlit/sekou-kanri-kijun/part-05': '出来形管理基準 第10編 道路編・品質管理基準',
  'mlit/sekou-kanri-kijun/part-06': '品質管理基準・参考資料（ロックボルトの引抜試験）',
};

export function standardPartLabel(
  document: Pick<StandardDocument, 'agencyId' | 'documentId'>,
  part: Pick<StandardPart, 'slug'>,
): string | null {
  return STANDARD_PART_LABELS[`${document.agencyId}/${document.documentId}/${part.slug}`] ?? null;
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
 * 載せない側なら群の情報を返す。判定は src/lib/standards-editions.mjs（生成器と同じ関数）。
 */
export function getStandardEditionDuplicate(
  document: Pick<StandardDocument, 'agencyId' | 'documentId'>,
): StandardEditionDuplicate | null {
  const found = editionDuplicateOf(structureConfig, `${document.agencyId}/${document.documentId}`);
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
