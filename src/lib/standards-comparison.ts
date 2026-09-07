import comparisonJson from '@/../content/site/standards-articles/comparison.json';

export type StandardDifferenceHunk = {
  context: string | null;
  beforeLine: number;
  afterLine: number;
  before: string[];
  after: string[];
  removedCount: number;
  addedCount: number;
};

export type StandardChapterDifference = {
  agencyId: string;
  agencyName: string;
  chapterId: string;
  chapterTitle: string;
  removedLines: number;
  addedLines: number;
  hunks: StandardDifferenceHunk[];
};

export type StandardComparisonRow = {
  agencyId: string;
  agencyName: string;
  documentId: string;
  title: string;
  pages: number;
  sourceSha256: string;
  structured: boolean;
  indexable: boolean;
  status: 'baseline' | 'identical' | 'different' | 'source-duplicate' | 'different-document-structure';
  duplicateOf: string | null;
  sameChapters: number;
  changedChapters: number;
  changedChapterIds: string[];
  removedLines: number;
  addedLines: number;
};

export type StandardsComparison = {
  schemaVersion: number;
  asOf: string;
  generatedAt: string;
  baseline: string;
  method: string;
  summary: {
    commonDocuments: number;
    structuredDocuments: number;
    identicalDocuments: number;
    differentDocuments: number;
    changedChapters: number;
    changeHunks: number;
  };
  rows: StandardComparisonRow[];
  changes: StandardChapterDifference[];
};

const comparison = comparisonJson as StandardsComparison;

export function getStandardsComparison(): StandardsComparison {
  return comparison;
}

export function inferStandardEdition(title: string, explicit?: string | null): string {
  if (explicit) return explicit;
  return title.match(/令和\d+(?:年度|年\d+月)(?:改訂版|改定|版)?/u)?.[0] ?? '版情報なし';
}
