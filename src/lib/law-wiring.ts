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
import { resolveLawSiblings, resolveTopicHubLinks, spreadAcrossCategories, toWired, type TopicHubLink, type WiredDoc } from '@/lib/article-end-wiring';
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
function lawLink(lawId: string): LawLink {
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

/** 法令のリンクを行き先で 1 つにまとめる（道路法・同施行令・同施行規則はどれも道路法のページへ行くので 1 本にする） */
function uniqueLinks(ids: readonly string[]): LawLink[] {
  const seen = new Set<string>();
  return ids.filter((id) => LAWS[id]).map(lawLink).filter((link) => (seen.has(link.href) ? false : (seen.add(link.href), true)));
}
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
function resolveLawTopics(lawIds: readonly string[], limit = 3): Map<string, LawTopicLink[]> {
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
    return [{ lawId, ...lawLink(lawId), count: docs.length, picks: spreadAcrossCategories(candidates, perLaw).map(toWired) }];
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

/** 計画・施策・審議会を決定日の新しい順に並べ、根拠法令のリンクを付ける（skipLaws＝そのページ自身の法令は出さない） */
function withLawLinks(policies: Policy[], skipLaws: ReadonlySet<string> = new Set()): (Policy & { laws: LawLink[] })[] {
  return [...policies]
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
    .map((p) => ({ ...p, laws: uniqueLinks(p.basisLaws.filter((id) => !skipLaws.has(id))) }));
}

/** テーマに関わる計画・施策・審議会（決定日の新しい順） */
export function getTopicPolicies(topicSlug: string): (Policy & { laws: LawLink[] })[] {
  return withLawLinks(POLICIES.filter((p) => p.topics.includes(topicSlug)));
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
function getLawPageData(lawId: string, family: readonly string[] = []): LawPageData {
  const ids = [lawId, ...family];
  const idSet = new Set(ids);
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
    // 関わるテーマ: 法令と政令・省令のどれかを引く記事を、テーマごとに数える（2 本以上）
    topics: toLinks(topicsOfLaw(getIndex(), ids)),
    policies: withLawLinks(POLICIES.filter((p) => p.basisLaws.some((id) => idSet.has(id))), idSet),
    articles,
    docsByArea,
    enforced: ids.filter((id) => LAWS[id]).map((id) => ({ lawId: id, title: LAWS[id]!.title, enforced: LAWS[id]!.enforced, url: lawUrl(id) })),
  };
}

export type ArticleEnd = {
  lawSiblings: Map<string, WiredDoc[]>;
  lawTopics: Map<string, LawTopicLink[]>;
  /** 法令 ID → 法令ページの URL（法令ページがある法令だけ。法令ページ自身が解説する法令は入れない） */
  lawPageLinks: Map<string, string>;
  /** 法令ページなら、末尾の自動の節 */
  lawPage: LawPageData | null;
  topicLinks: TopicHubLink[];
  /** 記事末の法令とテーマのカードに出した記事（関連記事から外す） */
  shownSlugs: Set<string>;
};

/**
 * 記事末の回遊（content-taxonomy.md §6-3）の中身をまとめて決める。根拠法令（同じ法令を扱う記事・関わるテーマ・法令ページ）
 * → この記事のテーマ の順に選び、先に出した記事は後ろのカードと関連記事から外す。
 * @param lawIds 本文の e-Gov へのリンクから集めた法令（本文に出た順）
 * @param pool 記事末に出す候補の母集団（関連記事と同じ）
 */
export function resolveArticleEnd(meta: DocMeta, lawIds: readonly string[], pool: DocMeta[]): ArticleEnd {
  const lawSiblings = lawIds.length > 0 ? resolveLawSiblings(meta, lawIds, pool) : new Map<string, WiredDoc[]>();
  const lawSiblingSlugs = new Set([...lawSiblings.values()].flat().map((doc) => doc.slug));
  const ownLaws = new Set(meta.category === 'laws' ? [meta.lawId, ...(meta.lawFamily ?? [])].filter(Boolean) : []);
  const lawPageLinks = new Map(lawIds.filter((id) => !ownLaws.has(id)).flatMap((id) => {
    const link = lawLink(id);
    return link.internal ? [[id, link.href] as const] : [];
  }));
  const topicLinks = resolveTopicHubLinks(meta, pool, { exclude: lawSiblingSlugs });
  return {
    lawSiblings,
    lawTopics: lawIds.length > 0 ? resolveLawTopics(lawIds) : new Map(),
    lawPageLinks,
    lawPage: meta.category === 'laws' && meta.lawId ? getLawPageData(meta.lawId, meta.lawFamily ?? []) : null,
    topicLinks,
    shownSlugs: new Set([...lawSiblingSlugs, ...topicLinks.flatMap((link) => link.picks.map((doc) => doc.slug))]),
  };
}
