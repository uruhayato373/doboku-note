/**
 * 法令と横断テーマ（分野・立場）の多対多の配線（content-taxonomy.md §6-3）。
 *
 * 記事が本文で引く法令（記事メタの lawIds・build-doc-meta-index が e-Gov へのリンクから入れる）と、記事が属すテーマから、
 * 「この法令が関わるテーマ」（記事末の根拠法令のカード）と「このテーマの法令」（テーマのページ）と
 * 「法令と分野の対応」（法令・制度の軸のテーマのページ）を作る。数え方は src/lib/law-topic-core.mjs（週次の報告と同じ）。
 * 法令名は e-Gov 法令 API の写し config/egov-laws.json。法令ページ（category: laws・/laws/<参考文献の id>・frontmatter の
 * lawId と lawFamily）がある法令は法令名の行き先を法令ページに、無い法令は e-Gov にする（DN-0731）。
 * 計画・施策・審議会は config/policy-registry.json（根拠法とテーマで引く）。
 */
import egovLaws from '../../config/egov-laws.json';
import policyRegistry from '../../config/policy-registry.json';
import { getAllDocsMeta, type DocMeta } from '@/lib/docs';
import { isCareerDoc } from '@/lib/doc-classifier';
import { getDocTopics, getTopicBySlug, type Topic } from '@/lib/topics';
import { toWired, type WiredDoc } from '@/lib/article-end-wiring';
import { EGOV_LAW_BASE, articleLabel } from '@/lib/egov-links.mjs';
import { getPublicDocPath, getPublicDocRouteArea } from '@/lib/content-routes';
import { lawTopicIndex, lawsOfTopic, topicsOfLaw } from '@/lib/law-topic-core.mjs';

const LAWS = egovLaws.laws as Record<string, { title: string; enforced: string | null }>;

export type Policy = {
  id: string; kind: 'council' | 'plan' | 'policy'; title: string; shortTitle: string; owner: string;
  decidedAt: string; period?: string; basisLaws: string[]; basisLawTitles?: string[]; topics: string[];
  summary: string; url: string; checkedAt: string;
};
const POLICIES = (policyRegistry as { policies: Policy[] }).policies;

/** 法令名のリンク。法令ページがあれば内部（internal: true）、無ければ e-Gov */
export type LawLink = { title: string; href: string; internal: boolean; egovUrl: string };
export type LawTopicLink = { slug: string; label: string; count: number };
export type TopicLaw = LawLink & { lawId: string; count: number; picks: WiredDoc[] };
export type LawDirectoryRow = LawLink & { lawId: string; count: number; topics: LawTopicLink[] };

// 記事の一覧に出す記事と同じ母集団（模範論文・カテゴリ非表示・法令ページ自身を除く）。ビルド中に何度も引くので 1 回だけ作る
let pool: DocMeta[] | null = null;
let index: Map<string, Map<string, string[]>> | null = null;
let lawPages: Map<string, DocMeta> | null = null;
function getPool(): DocMeta[] {
  pool ??= getAllDocsMeta().filter((d) => d.published !== false && !d.tags?.includes('模範論文') && !d.hideFromCategory && d.category !== 'laws');
  return pool;
}

/** 法令 ID → 法令ページ（lawId と lawFamily の両方で引く） */
function getLawPages(): Map<string, DocMeta> {
  if (!lawPages) {
    lawPages = new Map();
    for (const d of getAllDocsMeta()) {
      if (d.published === false || d.category !== 'laws' || !d.lawId) continue;
      for (const id of [d.lawId, ...(d.lawFamily ?? [])]) if (!lawPages.has(id)) lawPages.set(id, d);
    }
  }
  return lawPages;
}

/** 法令名のリンク（法令ページがあればその URL、無ければ e-Gov） */
export function lawLink(lawId: string): LawLink {
  const page = getLawPages().get(lawId);
  const title = LAWS[lawId]?.title ?? lawId;
  const egovUrl = lawUrl(lawId);
  return page ? { title, href: getPublicDocPath(page.slug), internal: true, egovUrl } : { title, href: egovUrl, internal: false, egovUrl };
}
function getIndex(): Map<string, Map<string, string[]>> {
  index ??= lawTopicIndex(getPool(), (doc) => getDocTopics(doc as DocMeta).map((t) => t.slug));
  return index;
}
function lawUrl(lawId: string): string { return `${EGOV_LAW_BASE}${lawId}`; }
function toLinks(rows: { slug: string; count: number }[]): LawTopicLink[] {
  return rows.flatMap(({ slug, count }) => {
    const topic = getTopicBySlug(slug);
    return topic ? [{ slug, label: topic.label, count }] : [];
  });
}

/** 法令が関わるテーマ（そのテーマの記事のうち 2 本以上が引く。引く記事の多い順） */
function getLawTopicLinks(lawId: string, limit = 3): LawTopicLink[] {
  return toLinks(topicsOfLaw(getIndex(), lawId, { limit }));
}

/** 記事末の根拠法令のカード用: 法令 ID → 関わるテーマ */
export function resolveLawTopics(lawIds: readonly string[], limit = 3): Map<string, LawTopicLink[]> {
  const out = new Map<string, LawTopicLink[]>();
  for (const lawId of lawIds) {
    const links = getLawTopicLinks(lawId, limit);
    if (links.length) out.set(lawId, links);
  }
  return out;
}

/**
 * テーマの記事が引く法令（2 本以上が引くもの・多い順に limit まで）と、その法令を引くこのテーマの記事（資格が重ならないように perLaw 本）。
 */
export function getTopicLaws(topic: Topic, { limit = 8, perLaw = 3 }: { limit?: number; perLaw?: number } = {}): TopicLaw[] {
  const bySlug = new Map(getPool().map((d) => [d.slug, d]));
  return lawsOfTopic(getIndex(), topic.slug, { limit }).flatMap(({ lawId, docs }) => {
    if (!LAWS[lawId]?.title) return [];
    const candidates = docs.map((s) => bySlug.get(s)).filter((d): d is DocMeta => Boolean(d) && !isCareerDoc(d as DocMeta));
    const picks: DocMeta[] = [];
    const seen = new Set<string>();
    for (const d of candidates) if (picks.length < perLaw && !seen.has(String(d.category))) { seen.add(String(d.category)); picks.push(d); }
    for (const d of candidates) if (picks.length < perLaw && !picks.includes(d)) picks.push(d);
    return [{ lawId, ...lawLink(lawId), count: docs.length, picks: picks.map(toWired) }];
  });
}

/**
 * 法令と分野・立場の対応の一覧（法令・制度の軸のテーマのページ）。minDocs 本以上の記事が引く法令を、引く記事の多い順に。
 * excludeTopic（そのページのテーマ自身）は関わるテーマから外す。
 */
export function getLawDirectory({ minDocs = 3, topicsPerLaw = 4, excludeTopic }: { minDocs?: number; topicsPerLaw?: number; excludeTopic?: string } = {}): LawDirectoryRow[] {
  const counts = new Map<string, number>();
  for (const d of getPool()) for (const lawId of d.lawIds ?? []) counts.set(lawId, (counts.get(lawId) ?? 0) + 1);
  return [...counts]
    .filter(([lawId, n]) => n >= minDocs && LAWS[lawId])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([lawId, count]) => ({
      lawId, ...lawLink(lawId), count,
      topics: getLawTopicLinks(lawId, topicsPerLaw + 1).filter((t) => t.slug !== excludeTopic).slice(0, topicsPerLaw),
    }));
}

/** テーマに関わる計画・施策・審議会（決定日の新しい順） */
export function getTopicPolicies(topicSlug: string): (Policy & { laws: LawLink[] })[] {
  return POLICIES.filter((p) => p.topics.includes(topicSlug))
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
    .map((p) => ({ ...p, laws: p.basisLaws.filter((id) => LAWS[id]).map(lawLink) }));
}

export type LawPageData = {
  topics: LawTopicLink[];
  policies: (Policy & { laws: LawLink[] })[];
  articles: { lawId: string; article: string; label: string; url: string; count: number }[];
  docsByArea: { exam: WiredDoc[]; practice: WiredDoc[] };
  enforced: { lawId: string; title: string; enforced: string | null; url: string }[];
};

/**
 * 法令ページの末尾に出す自動の節（関わるテーマ・計画と審議会・よく引かれる条・この法令を扱う記事・最新の改正の施行日）。
 * family（同じページで扱う政令・省令）も合わせて数える。
 */
export function getLawPageData(lawId: string, family: readonly string[] = []): LawPageData {
  const ids = [lawId, ...family];
  const idSet = new Set(ids);
  // 関わるテーマ: 法令と政令・省令のどれかを引く記事を、テーマごとに数え直す（2 本以上）
  const byTopic = new Map<string, Set<string>>();
  for (const id of ids) for (const [slug, docs] of getIndex().get(id) ?? []) {
    const set = byTopic.get(slug) ?? new Set<string>();
    for (const d of docs) set.add(d);
    byTopic.set(slug, set);
  }
  const topics = [...byTopic].map(([slug, set]) => ({ slug, count: set.size })).filter((r) => r.count >= 2)
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
  const citing = getPool().filter((d) => (d.lawIds ?? []).some((id) => idSet.has(id)));
  // よく引かれる条（条ごとに引く記事の本数）
  const articleCount = new Map<string, number>();
  for (const d of citing) for (const id of ids) for (const a of d.lawArticles?.[id] ?? []) {
    const key = `${id}#${a}`;
    articleCount.set(key, (articleCount.get(key) ?? 0) + 1);
  }
  const articles = [...articleCount].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12).map(([key, count]) => {
    const [id, article] = key.split('#') as [string, string];
    const prefix = id === lawId ? '' : `${LAWS[id]?.title ?? ''} `;
    return { lawId: id, article, label: `${prefix}${articleLabel(article)}`, url: `${lawUrl(id)}#Mp-At_${article}`, count };
  });
  const usable = citing.filter((d) => !isCareerDoc(d));
  const docsByArea = {
    exam: usable.filter((d) => getPublicDocRouteArea(d.slug) === 'exam').map(toWired),
    practice: usable.filter((d) => getPublicDocRouteArea(d.slug) === 'practice').map(toWired),
  };
  return {
    topics: toLinks(topics),
    policies: POLICIES.filter((p) => p.basisLaws.some((id) => idSet.has(id)))
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
      .map((p) => ({ ...p, laws: p.basisLaws.filter((id) => LAWS[id] && !idSet.has(id)).map(lawLink) })),
    articles,
    docsByArea,
    enforced: ids.filter((id) => LAWS[id]).map((id) => ({ lawId: id, title: LAWS[id]!.title, enforced: LAWS[id]!.enforced, url: lawUrl(id) })),
  };
}
