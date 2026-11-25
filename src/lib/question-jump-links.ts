import type { DocMeta } from './docs';
import { findYearSiblings } from './exam-year-nav.mjs';
import { getPublicDocPath } from './content-routes';
import { getRelatedTools } from './tools';

/** 題名から「令和7年度」「平成23年度」を抜く（無ければ題名をそのまま） */
function yearLabel(doc: DocMeta): string {
  return doc.title.match(/(?:令和|平成)\s*(?:元|\d{1,2})\s*年度/)?.[0]?.replace(/\s+/g, '') ?? doc.title;
}

/**
 * 年度別過去問の冒頭の目次（QuestionJumpNav）に添える次の行き先: 同じ科目の前後の年度と演習アプリ。
 * 年度の並びは記事末の年度の案内（ExamYearNav）と同じ findYearSiblings、演習アプリは記事末の無料ツールと同じ getRelatedTools。
 */
export function questionJumpLinks(slug: string, category: string | undefined, categoryArticles: readonly DocMeta[]) {
  const { older, newer } = findYearSiblings(slug, categoryArticles.map((m) => m.slug));
  const link = (s: string | null) => {
    const doc = s ? categoryArticles.find((m) => m.slug === s) : undefined;
    return doc ? { href: getPublicDocPath(doc.slug), label: yearLabel(doc) } : null;
  };
  const quizTool = category ? getRelatedTools(category, slug).find((t) => t.href.startsWith('/tools/kakomon-quiz')) : undefined;
  return {
    older: link(older),
    newer: link(newer),
    quiz: quizTool ? { href: quizTool.href, label: '演習アプリで解く' } : null,
  };
}
