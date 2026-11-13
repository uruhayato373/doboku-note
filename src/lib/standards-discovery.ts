import 'server-only';

import type { DocMeta } from '@/lib/docs';
import { getAllTopics, getTopicDocs, type Topic } from '@/lib/topics';
import { getStandardDocument, getStandardsCatalog, type StandardDocument } from '@/lib/standards';
import { getStandardChapter, getStandardChapters, standardChapterPath, type StandardChapter } from '@/lib/standards-articles';
import { getStandardsComparison } from '@/lib/standards-comparison';

/**
 * 基準書ページの右の欄の回遊（2026-11-13）。
 * 章ページの 1 セッションあたりのページ数が 1.07（GA4 2026-10-10〜11-06）で、目次のほかに次の行き先が無かった。
 * ここは「章 → 関連テーマ → 実務・試験対策の記事」「章 → 他の地方整備局の同じ章」を決める唯一の実装。
 */

/** 実務の記事として出すカテゴリ。ほかは試験対策として出す */
const PRACTICE_CATEGORIES = new Set(['civil-practice', 'laws']);

/** 章から関連テーマが 1 つも決まらないとき（総則など）・機関の一覧に出すテーマ */
const FALLBACK_TOPICS = ['construction-management', 'quality-management'];

/** 節・条の題名からの点の上限。節の多い章で、題名にたまたま何度も出る語が章名・編名に勝たないようにする */
const SECTION_SCORE_CAP = 4;

function scoreTopic(topic: Topic, chapter: StandardChapter): number {
  const titles = [
    ...chapter.sections.flatMap((section) => [section.title, ...section.articles.map((article) => article.title)]),
    ...(chapter.articles ?? []).map((article) => article.title),
  ];
  let heading = 0;
  let body = 0;
  for (const keyword of topic.standardKeywords) {
    if (chapter.chapterTitle.includes(keyword)) heading += 10;
    if (chapter.bookTitle.includes(keyword)) heading += 6;
    body += titles.filter((text) => text.includes(keyword)).length;
  }
  return heading + Math.min(body, SECTION_SCORE_CAP);
}

/**
 * 章に近いテーマ。章名 → 編名 → 節・条の題名の順に重く数え、上位 limit 件。
 * 2 番目以降は 1 位の半分以上の点のものだけ（土工の章に、節の題名に 1〜2 回出る「河川」を並べない）。
 */
export function getStandardChapterTopics(chapter: StandardChapter, limit = 2): Topic[] {
  const topics = getAllTopics();
  const scored = topics
    .map((topic) => ({ topic, score: scoreTopic(topic, chapter) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.topic.slug.localeCompare(b.topic.slug));
  const top = scored[0]?.score ?? 0;
  const ranked = scored
    .filter(({ score }, index) => index === 0 || score * 2 >= top)
    .slice(0, limit)
    .map(({ topic }) => topic);
  return ranked.length > 0 ? ranked : getStandardDefaultTopics();
}

/** 章の決まらないページ（機関の一覧・総則など）に出すテーマ。基準書の読み手の大半が使う施工計画と品質管理 */
export function getStandardDefaultTopics(): Topic[] {
  const topics = getAllTopics();
  return FALLBACK_TOPICS.map((slug) => topics.find((topic) => topic.slug === slug)).filter((topic): topic is Topic => Boolean(topic));
}

// 章ページ 344 本の静的書き出しで同じテーマを何度も引くので、テーマごとに覚える
const topicDocsCache = new Map<string, DocMeta[]>();

function publishedTopicDocs(topic: Topic): DocMeta[] {
  let docs = topicDocsCache.get(topic.slug);
  if (!docs) {
    docs = getTopicDocs(topic).filter((doc) => doc.published !== false && !doc.hideFromCategory);
    topicDocsCache.set(topic.slug, docs);
  }
  return docs;
}

export type StandardRelatedDocs = { practice: DocMeta[]; exam: DocMeta[] };

/**
 * テーマの記事を、実務と試験対策に分けて各 limit 件。公開中のものだけ。
 * 並びは getTopicDocs（入口記事 featured が先頭・残りは更新の新しい順）。各枠は 1 番目のテーマから limit - 1 件取り、
 * 残り 1 件を次のテーマに譲る（無ければ 1 番目のテーマで埋める）。
 */
export function getStandardRelatedDocs(topics: Topic[], limit = 3): StandardRelatedDocs {
  const seen = new Set<string>();
  const result: StandardRelatedDocs = { practice: [], exam: [] };
  const take = (docs: DocMeta[], cap: number) => {
    for (const doc of docs) {
      const bucket = PRACTICE_CATEGORIES.has(doc.category ?? '') ? result.practice : result.exam;
      if (seen.has(doc.slug) || bucket.length >= cap) continue;
      seen.add(doc.slug);
      bucket.push(doc);
    }
  };
  const [primary, ...rest] = topics.map(publishedTopicDocs);
  if (primary) take(primary, rest.length > 0 ? limit - 1 : limit);
  for (const docs of rest) take(docs, limit);
  if (primary) take(primary, limit);
  return result;
}

export type StandardRegionalVersion = {
  agencyNames: string[];
  href: string;
  /** この章に近畿版との差分がある */
  changed: boolean;
  current: boolean;
};

/**
 * 共通仕様書の章を、ほかの地方整備局ではどう読めるか。
 * 近畿版と本文が同じ地域は近畿版の章へまとめる（standards-chapter-merge.mjs と同じ判定＝comparison.json の identical）。
 * 文書の組み立てが違う（北海道）・原本の重複（沖縄）は章の対応が取れないので出さない。
 */
export function getStandardRegionalVersions(document: StandardDocument, chapter: StandardChapter): StandardRegionalVersion[] {
  if (document.role !== 'common') return [];
  const comparison = getStandardsComparison();
  const [baseAgency, baseDocument] = comparison.baseline.split('/');
  if (!baseAgency || !baseDocument) return [];
  const agencyName = (agencyId: string) =>
    getStandardsCatalog().agencies.find((agency) => agency.agencyId === agencyId)?.agencyName ?? agencyId;

  const identical = comparison.rows.filter((row) => row.status === 'identical');
  const different = comparison.rows.filter((row) => row.status === 'different');
  const baseChapter = getStandardChapter(baseAgency, baseDocument, chapter.chapterId);
  const versions: StandardRegionalVersion[] = [];
  const currentKey = `${document.agencyId}/${document.documentId}`;

  if (baseChapter) {
    const merged = identical.some((row) => `${row.agencyId}/${row.documentId}` === currentKey);
    versions.push({
      agencyNames: [agencyName(baseAgency), ...identical.map((row) => agencyName(row.agencyId))],
      href: standardChapterPath(baseChapter.document, baseChapter.chapter),
      changed: false,
      current: currentKey === comparison.baseline || merged,
    });
  }
  for (const row of different) {
    const target = getStandardDocument(row.agencyId, row.documentId);
    const targetChapter = target && getStandardChapters(row.agencyId, row.documentId).find((entry) => entry.chapterId === chapter.chapterId);
    if (!target || !targetChapter) continue;
    versions.push({
      agencyNames: [agencyName(row.agencyId)],
      href: standardChapterPath(target, targetChapter),
      changed: row.changedChapterIds.includes(chapter.chapterId),
      current: `${row.agencyId}/${row.documentId}` === currentKey,
    });
  }
  // 1 つしか無い（＝自分だけ）なら比べる先が無い
  return versions.length > 1 ? versions : [];
}

/** 共通仕様書の入口の章（共通編・土木工事共通編）。トップ・機関・文書ページの右の欄から章へ直接入れるようにする。 */
export function getStandardEntryChapters(agencyId: string): { document: StandardDocument; chapters: StandardChapter[] } | null {
  const comparison = getStandardsComparison();
  const [baseAgency, baseDocument] = comparison.baseline.split('/');
  const own = getStandardDocument(agencyId, 'common');
  const document = own && getStandardChapters(own.agencyId, own.documentId).length > 0
    ? own
    : baseAgency && baseDocument ? getStandardDocument(baseAgency, baseDocument) : null;
  if (!document) return null;
  const chapters = getStandardChapters(document.agencyId, document.documentId)
    .filter((chapter) => chapter.bookNumber === 1 || chapter.bookNumber === 3)
    .filter((chapter) => !chapter.bodyless);
  return chapters.length > 0 ? { document, chapters } : null;
}
