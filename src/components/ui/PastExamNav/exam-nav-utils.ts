/**
 * 過去問ナビゲーション用データ抽出・整形ユーティリティ
 */
import { classifyDoc } from '@/lib/doc-classifier';
import type { DocMeta } from '@/lib/docs';

export type ExamYear = {
  yearCode: string;                   // "r07", "h26"
  label: string;                      // "令和7年度"
  col1: { slug: string } | undefined; // 択一式 or 問題A
  col2: { slug: string } | undefined; // 記述式 or 問題B
  col3: { slug: string } | undefined; // 第2次（Civil のみ）
};

export type PastExamNavData = {
  col1Header: string;
  col2Header: string;
  col3Header: string | undefined;
  years: ExamYear[];
};

function yearLabel(code: string): string {
  const match = code.match(/^(r|h)(\d+)$/);
  if (!match) return code;
  const era = match[1] === 'r' ? '令和' : '平成';
  const num = parseInt(match[2]!);
  if (era === '令和' && num === 1) return '令和元年度';
  return `${era}${num}年度`;
}

function sortYearsDesc(a: string, b: string): number {
  const valA = (a.startsWith('r') ? 100 : 0) + parseInt(a.slice(1));
  const valB = (b.startsWith('r') ? 100 : 0) + parseInt(b.slice(1));
  return valB - valA;
}

function buildPeData(articles: DocMeta[]): PastExamNavData | null {
  const pastExams = articles.filter((m) => classifyDoc(m) === 'pastExam');
  if (pastExams.length === 0) return null;

  const yearMap = new Map<string, { primary?: string; secondary?: string }>();
  for (const doc of pastExams) {
    const match = doc.slug?.match(/(r|h)(\d+)-(primary|secondary)$/);
    if (!match) continue;
    const yearCode = `${match[1]}${match[2]}`;
    const type = match[3] as 'primary' | 'secondary';
    if (!yearMap.has(yearCode)) yearMap.set(yearCode, {});
    yearMap.get(yearCode)![type] = doc.slug;
  }

  const years: ExamYear[] = Array.from(yearMap.keys())
    .sort(sortYearsDesc)
    .map((code) => {
      const pair = yearMap.get(code)!;
      return {
        yearCode: code,
        label: yearLabel(code),
        col1: pair.primary ? { slug: pair.primary } : undefined,
        col2: pair.secondary ? { slug: pair.secondary } : undefined,
        col3: undefined,
      };
    });

  return { col1Header: '択一', col2Header: '記述', col3Header: undefined, years };
}

function buildCivilData(articles: DocMeta[]): PastExamNavData | null {
  const primaryDocs = articles.filter((m) => classifyDoc(m) === 'primary');
  const secondaryDocs = articles.filter((m) => classifyDoc(m) === 'secondary');

  // primary: slug末尾 (r|h)(\d+)-(a|b)
  const yearMap = new Map<string, { a?: string; b?: string; secondary?: string }>();
  for (const doc of primaryDocs) {
    const match = doc.slug?.match(/(r|h)(\d+)-(a|b)$/);
    if (!match) continue;
    const yearCode = `${match[1]}${match[2]}`;
    const part = match[3] as 'a' | 'b';
    if (!yearMap.has(yearCode)) yearMap.set(yearCode, {});
    yearMap.get(yearCode)![part] = doc.slug;
  }

  // secondary: slug末尾 secondary-(r|h)(\d+)
  for (const doc of secondaryDocs) {
    const match = doc.slug?.match(/secondary-(r|h)(\d+)$/);
    if (!match) continue;
    const yearCode = `${match[1]}${match[2]}`;
    if (!yearMap.has(yearCode)) yearMap.set(yearCode, {});
    yearMap.get(yearCode)!.secondary = doc.slug;
  }

  if (yearMap.size === 0) return null;

  const hasSecondary = Array.from(yearMap.values()).some((v) => v.secondary);

  const years: ExamYear[] = Array.from(yearMap.keys())
    .sort(sortYearsDesc)
    .map((code) => {
      const entry = yearMap.get(code)!;
      return {
        yearCode: code,
        label: yearLabel(code),
        col1: entry.a ? { slug: entry.a } : undefined,
        col2: entry.b ? { slug: entry.b } : undefined,
        col3: entry.secondary ? { slug: entry.secondary } : undefined,
      };
    });

  return {
    col1Header: 'A',
    col2Header: 'B',
    col3Header: hasSecondary ? '2次' : undefined,
    years,
  };
}

/**
 * 2級土木 用: 前期/後期 + 第2次
 * 1級と異なり slug は `(r|h)(\d+)-(zenki|kouki)` 形式。
 */
function buildCivil2Data(articles: DocMeta[]): PastExamNavData | null {
  const primaryDocs = articles.filter((m) => classifyDoc(m) === 'primary');
  const secondaryDocs = articles.filter((m) => classifyDoc(m) === 'secondary');

  // primary: slug末尾 (r|h)(\d+)-(zenki|kouki)
  const yearMap = new Map<string, { zenki?: string; kouki?: string; secondary?: string }>();
  for (const doc of primaryDocs) {
    const match = doc.slug?.match(/(r|h)(\d+)-(zenki|kouki)$/);
    if (!match) continue;
    const yearCode = `${match[1]}${match[2]}`;
    const part = match[3] as 'zenki' | 'kouki';
    if (!yearMap.has(yearCode)) yearMap.set(yearCode, {});
    yearMap.get(yearCode)![part] = doc.slug;
  }

  // secondary: slug末尾 secondary-(r|h)(\d+)
  for (const doc of secondaryDocs) {
    const match = doc.slug?.match(/secondary-(r|h)(\d+)$/);
    if (!match) continue;
    const yearCode = `${match[1]}${match[2]}`;
    if (!yearMap.has(yearCode)) yearMap.set(yearCode, {});
    yearMap.get(yearCode)!.secondary = doc.slug;
  }

  if (yearMap.size === 0) return null;
  const hasSecondary = Array.from(yearMap.values()).some((v) => v.secondary);

  const years: ExamYear[] = Array.from(yearMap.keys())
    .sort(sortYearsDesc)
    .map((code) => {
      const entry = yearMap.get(code)!;
      return {
        yearCode: code,
        label: yearLabel(code),
        col1: entry.zenki ? { slug: entry.zenki } : undefined,
        col2: entry.kouki ? { slug: entry.kouki } : undefined,
        col3: entry.secondary ? { slug: entry.secondary } : undefined,
      };
    });

  return {
    col1Header: '前期',
    col2Header: '後期',
    col3Header: hasSecondary ? '2次' : undefined,
    years,
  };
}

export function buildPastExamNavData(
  category: string,
  categoryArticles: DocMeta[],
): PastExamNavData | null {
  if (category === 'pe-comprehensive-management') return buildPeData(categoryArticles);
  if (category === 'civil-construction-1') return buildCivilData(categoryArticles);
  if (category === 'civil-construction-2') return buildCivil2Data(categoryArticles);
  return null;
}
