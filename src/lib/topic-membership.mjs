/**
 * topic-membership — 記事がどのテーマ（src/config/topics.json）に属すか、属すべき記事かの純関数。
 *
 * サイト（src/lib/topics.ts）・検査（check-content-taxonomy / check-topic-wiring）・週次の報告
 * （report-taxonomy-wiring）が同じ判定を使う（同じ判定を複数箇所に実装しない）。I/O と import を持たない。
 * 規則の真実源: .claude/knowledge/reference/content-taxonomy.md §6
 */

/** 過去問の記事型。問題ごとに RelatedKeywords・backlink で用語へつなぐので、テーマへの所属は求めない */
const PAST_EXAM_GROUPS = new Set(['primary', 'secondary', 'past-exam']);
/** 1 語・1 章・1 分野を扱う記事型。中身が技術テーマなので、テーマへの所属を必ず求める */
const SUBJECT_GROUPS = new Set(['keyword', 'textbook', 'pillar']);

/**
 * 記事が属するテーマの slug。明示（frontmatter `topics:`）→ カテゴリ丸ごと → タグの順で、重複なし。
 * @param {{ category?: string, tags?: string[], topics?: unknown, published?: boolean }} doc tags は正規表記
 * @param {Array<{ slug: string, tags?: string[], categories?: string[] }>} topics
 * @param {(tag: string) => string} [canon] 綴り → 正規表記（topics.json のタグも通す）
 * @returns {string[]}
 */
export function topicsOfDoc(doc, topics, canon = (t) => t) {
  if (!doc || doc.published === false) return [];
  const out = [];
  const add = (slug) => { if (!out.includes(slug)) out.push(slug); };
  const explicit = Array.isArray(doc.topics) ? doc.topics : [];
  for (const slug of explicit) if (topics.some((t) => t.slug === slug)) add(slug);
  for (const t of topics) if ((t.categories ?? []).includes(String(doc.category))) add(t.slug);
  const tags = new Set((doc.tags ?? []).map(canon));
  for (const t of topics) if ((t.tags ?? []).some((tag) => tags.has(canon(tag)))) add(t.slug);
  return out;
}

/**
 * テーマへの所属が要る記事か（content-taxonomy.md §6-2）。
 * 要る: 用語・章・分野ハブ（keyword / textbook / pillar）、実務の記事、技術テーマのタグを持つガイド。
 * 要らない: 非公開、転職・キャリア（career）、模範論文、過去問（問題ごとに用語へつなぐ）、
 *           技術テーマのタグを持たないガイド（試験の概要・申込・勉強法など試験の手続きの記事）。
 * @param {{ group?: string, tags?: string[], published?: boolean }} doc tags は正規表記
 * @param {{ area: string, classOf: (tag: string) => string | undefined }} ctx area は記事のカテゴリの領域
 * @returns {boolean}
 */
export function needsTopic(doc, { area, classOf }) {
  if (!doc || doc.published === false) return false;
  const tags = doc.tags ?? [];
  if (tags.includes('career') || tags.includes('模範論文')) return false;
  if (PAST_EXAM_GROUPS.has(String(doc.group))) return false;
  if (area === 'standards') return false;
  if (SUBJECT_GROUPS.has(String(doc.group)) || area === 'practice') return true;
  return tags.some((tag) => (classOf(tag) ?? 'topical') === 'topical');
}
