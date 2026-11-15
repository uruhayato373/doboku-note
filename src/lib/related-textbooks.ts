/**
 * 過去問に関連する教科書の章（1級・2級土木の第1次/第2次）。右の欄の「rail-textbooks」用。
 * 順位づけは本文末の RelatedTextbooks と同じ規則（過去問→教材インデックスを優先し、0 件ならタグの共通数）。
 * 本文末は触らない指示のため規則を写している。変えるときは RelatedTextbooks.tsx も同時に直す。
 */
import type { DocMeta } from './docs';
import { classifyDoc } from './doc-classifier';
import examTextbookIndex from '@/config/civil-exam-textbook-index.json';
import examTextbookIndex2 from '@/config/civil-exam-textbook-index-2.json';

type Match = { slug: string; title: string; score: number };
type Index = { questionToTextbooks: Record<string, Record<string, Match[]>> };

const INDEX: Record<string, { index: Index; prefix: string }> = {
  'civil-construction-1': { index: examTextbookIndex as unknown as Index, prefix: 'civil-construction-1-' },
  'civil-construction-2': { index: examTextbookIndex2 as unknown as Index, prefix: 'civil-construction-2-' },
};

/** 過去問に関連する教科書の章（最大 6 件・関連の強い順）。該当なし・土木以外は空。 */
export function relatedTextbookSlugs(current: DocMeta, categoryArticles: DocMeta[]): string[] {
  const config = INDEX[current.category ?? ''];
  if (!config) return [];
  const short = current.slug.startsWith(config.prefix) ? current.slug.slice(config.prefix.length) : current.slug;
  const scores = new Map<string, number>();
  for (const matches of Object.values(config.index.questionToTextbooks?.[short] ?? {})) {
    for (const m of matches) scores.set(m.slug, (scores.get(m.slug) ?? 0) + m.score);
  }
  if (scores.size) {
    return [...scores].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([slug]) => `${config.prefix}${slug}`);
  }
  const tags = new Set((current.tags ?? []).filter(t => !['primary', 'secondary', 'past-questions'].includes(t)));
  if (!tags.size) return [];
  return categoryArticles
    .filter(doc => classifyDoc(doc) === 'textbook')
    .map(doc => ({ slug: doc.slug, score: (doc.tags ?? []).filter(t => t !== 'textbook' && tags.has(t)).length }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(row => row.slug);
}
