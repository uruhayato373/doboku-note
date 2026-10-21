/**
 * 記事末の回遊（content-taxonomy.md §6-3）: 「この記事のテーマ」と「同じ法令を扱う記事」の中身を選ぶ。
 *
 * どちらも他の資格・実務の記事を優先する（同じ資格の記事はカテゴリのナビと関連記事が既に出す）。
 * 選んだ記事は後ろの関連記事（RelatedArticles）から外すので、記事末に同じ記事が 2 度並ばない。
 */
import type { DocMeta } from '@/lib/docs';
import { isCareerDoc } from '@/lib/doc-classifier';
import { getPublicDocPath } from '@/lib/content-routes';
import { getCategoryLabel } from '@/lib/categories';
import { relatedScore } from '@/lib/related-score';
import { stableTieBreak } from '@/lib/related-core.mjs';
import { getDocTopics, getTopicDocs, type Topic } from '@/lib/topics';

export type WiredDoc = { slug: string; href: string; title: string; categoryLabel: string };
export type TopicHubLink = { topic: Pick<Topic, 'slug' | 'label'>; total: number; picks: WiredDoc[] };

export function toWired(doc: DocMeta): WiredDoc {
  return {
    slug: doc.slug,
    href: getPublicDocPath(doc.slug),
    title: doc.shortTitle || doc.title,
    categoryLabel: getCategoryLabel(String(doc.category)),
  };
}

/**
 * 候補から limit 件を選ぶ。関連度の高い順に、まず資格（カテゴリ）が重ならないように 1 件ずつ取り、足りなければ残りで埋める。
 * 資格をまたいだ回遊（同じテーマ・同じ法令を、別の資格や実務ではどう扱うか）を見せるのが目的。
 */
function pickAcrossCategories(current: DocMeta, candidates: DocMeta[], limit: number): DocMeta[] {
  const ranked = candidates
    .map((doc) => ({ doc, score: relatedScore(current, doc) }))
    .sort((a, b) => b.score - a.score || stableTieBreak(current, a.doc, b.doc))
    .map((s) => s.doc);
  const picked: DocMeta[] = [];
  const seen = new Set<string>();
  for (const doc of ranked) {
    if (picked.length >= limit) break;
    if (seen.has(String(doc.category))) continue;
    seen.add(String(doc.category));
    picked.push(doc);
  }
  for (const doc of ranked) {
    if (picked.length >= limit) break;
    if (!picked.includes(doc)) picked.push(doc);
  }
  return picked;
}

/**
 * 記事末に出す候補の母集団から、同じ法令（本文の e-Gov へのリンク）を引く他の記事を法令ごとに選ぶ。
 * 同じ資格の記事も候補に入れる（法令は資格をまたいで同じ条を読むため）が、別の資格を先に出す。
 * 記事ページの meta は frontmatter から作られ lawIds を持たないので、今の記事の法令は本文から集めたもの（lawsOfArticle）を渡す。
 * 候補の側は記事メタの索引の lawIds（build-doc-meta-index が同じ本文のリンクから入れる）で引く。
 * 本文に先に出た法令から埋め、カード全体で maxTotal 本まで（法令を 9 つ引く記事で 27 本並べない）。
 * @returns 法令 ID → 記事（最大 perLaw 件）。他に引く記事が無い法令は入らない
 */
export function resolveLawSiblings(
  current: DocMeta,
  lawIds: readonly string[],
  pool: DocMeta[],
  { perLaw = 3, maxTotal = 6, exclude = new Set<string>() }: { perLaw?: number; maxTotal?: number; exclude?: ReadonlySet<string> } = {},
): Map<string, WiredDoc[]> {
  const out = new Map<string, WiredDoc[]>();
  const used = new Set([current.slug, ...exclude]);
  let total = 0;
  for (const lawId of lawIds) {
    const limit = Math.min(perLaw, maxTotal - total);
    if (limit <= 0) break;
    // 法令ページ（category: laws）は法令名のリンク先なので、同じ法令を扱う記事には入れない
    const candidates = pool.filter((doc) => !used.has(doc.slug) && !isCareerDoc(doc) && doc.category !== 'laws' && (doc.lawIds ?? []).includes(lawId));
    // 同じ資格の記事より他の資格・実務の記事を先に（pickAcrossCategories は資格の重なりを避けるだけなので、ここで並べ替える）
    const others = candidates.filter((doc) => doc.category !== current.category);
    const same = candidates.filter((doc) => doc.category === current.category);
    const picks = [...pickAcrossCategories(current, others, limit), ...pickAcrossCategories(current, same, limit)].slice(0, limit);
    if (picks.length === 0) continue;
    for (const doc of picks) used.add(doc.slug);
    total += picks.length;
    out.set(lawId, picks.map(toWired));
  }
  return out;
}

/**
 * 記事が属するテーマ（最大 maxTopics）と、それぞれのテーマで他の資格・実務が扱う記事（最大 perTopic 件）。
 * テーマへのリンクはテーマに 2 本以上の記事があるときだけ出す（自分 1 本だけのテーマへは送らない）。
 */
export function resolveTopicHubLinks(
  current: DocMeta,
  pool: DocMeta[],
  { maxTopics = 3, perTopic = 3, exclude = new Set<string>() }: { maxTopics?: number; perTopic?: number; exclude?: ReadonlySet<string> } = {},
): TopicHubLink[] {
  if (isCareerDoc(current)) return [];
  const inPool = new Set(pool.map((doc) => doc.slug));
  const used = new Set([current.slug, ...exclude]);
  const links: TopicHubLink[] = [];
  for (const topic of getDocTopics(current).slice(0, maxTopics)) {
    const members = getTopicDocs(topic).filter((doc) => inPool.has(doc.slug) || doc.slug === current.slug);
    if (members.length < 2) continue;
    const candidates = members.filter((doc) => !used.has(doc.slug) && doc.category !== current.category && !isCareerDoc(doc));
    const picks = pickAcrossCategories(current, candidates, perTopic);
    for (const doc of picks) used.add(doc.slug);
    links.push({ topic: { slug: topic.slug, label: topic.label }, total: members.length, picks: picks.map(toWired) });
  }
  return links;
}
