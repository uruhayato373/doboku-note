/**
 * past-exam-nav.ts — 記事の右の欄（とスマホの記事末）の過去問カードのデータ。年度 × 区分のまとめ方は exam-year-grid.ts。
 * 旧 src/components/ui/PastExamNav/exam-nav-utils.ts（lib が components を import していたので lib へ移した）。
 */
import { classifyDoc } from './doc-classifier';
import type { DocMeta } from './docs';
import { examYearLabel } from './exam-year.mjs';
import { groupExamYears, type ExamGridKind } from './exam-year-grid';

type ExamYear = {
  yearCode: string;                   // "r07", "h26"
  label: string;                      // "令和7年度"
  col1: { slug: string } | undefined; // 択一式 or 問題A
  col2: { slug: string } | undefined; // 記述式 or 問題B
  col3: { slug: string } | undefined; // 第2次（土木のみ）
};

export type PastExamNavData = {
  col1Header: string;
  col2Header: string;
  col3Header: string | undefined;
  years: ExamYear[];
};

const KIND: Record<string, ExamGridKind> = {
  'pe-comprehensive-management': 'pe',
  'civil-construction-1': 'civil-1',
  'civil-construction-2': 'civil-2',
};
const HEADERS: Record<ExamGridKind, [string, string]> = { pe: ['択一', '記述'], 'civil-1': ['A', 'B'], 'civil-2': ['前期', '後期'] };

const slugOf = (doc: DocMeta | undefined) => (doc?.slug ? { slug: doc.slug } : undefined);

export function buildPastExamNavData(category: string, categoryArticles: DocMeta[]): PastExamNavData | null {
  const kind = KIND[category];
  if (!kind) return null;
  const grid = kind === 'pe'
    ? groupExamYears(kind, categoryArticles.filter((m) => classifyDoc(m) === 'pastExam'))
    : groupExamYears(
      kind,
      categoryArticles.filter((m) => classifyDoc(m) === 'primary'),
      categoryArticles.filter((m) => classifyDoc(m) === 'secondary'),
      { secondaryOnlyYears: true },
    );
  if (grid.years.length === 0) return null;
  const [col1Header, col2Header] = HEADERS[kind];
  return {
    col1Header,
    col2Header,
    col3Header: kind !== 'pe' && grid.hasSecondary ? '2次' : undefined,
    years: grid.years.map((code) => {
      const row = grid.cells.get(code)!;
      return { yearCode: code, label: examYearLabel(code), col1: slugOf(row.c1), col2: slugOf(row.c2), col3: slugOf(row.c3) };
    }),
  };
}
