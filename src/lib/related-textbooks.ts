/**
 * 過去問に関連する教科書の章（1級・2級土木の第1次/第2次）。本文末の RelatedTextbooks と右の欄の rail-textbooks が共有する。
 * 順位づけ: 過去問→教材インデックスを優先し、0 件ならタグの共通数。
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

/** 過去問に関連する教科書の章（最大 6 件・関連の強い順。タグの経路は最大 5 件）。該当なし・土木以外は空。title は記事一覧に無い章の代わりに使う */
export function relatedTextbooks(current: DocMeta, categoryArticles: DocMeta[]): { slug: string; title: string }[] {
  const config = INDEX[current.category ?? ''];
  if (!config) return [];
  const short = current.slug.startsWith(config.prefix) ? current.slug.slice(config.prefix.length) : current.slug;
  const scores = new Map<string, { title: string; score: number }>();
  for (const matches of Object.values(config.index.questionToTextbooks?.[short] ?? {})) {
    for (const m of matches) {
      const row = scores.get(m.slug);
      if (row) row.score += m.score;
      else scores.set(m.slug, { title: m.title, score: m.score });
    }
  }
  if (scores.size) {
    return [...scores]
      .map(([slug, row]) => ({ slug, title: row.title, score: Math.round(row.score * 100) / 100 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(row => ({ slug: `${config.prefix}${row.slug}`, title: row.title }));
  }
  const tags = new Set((current.tags ?? []).filter(t => !['primary', 'secondary', 'past-questions'].includes(t)));
  if (!tags.size) return [];
  return categoryArticles
    .filter(doc => classifyDoc(doc) === 'textbook')
    .map(doc => ({ doc, score: (doc.tags ?? []).filter(t => t !== 'textbook' && tags.has(t)).length }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(row => ({ slug: row.doc.slug, title: row.doc.title }));
}

export function relatedTextbookSlugs(current: DocMeta, categoryArticles: DocMeta[]): string[] {
  return relatedTextbooks(current, categoryArticles).map(row => row.slug);
}
