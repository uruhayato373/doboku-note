/**
 * ドキュメント分類ロジック
 * カテゴリページ、ナビカード、パンくずで共通使用。
 * frontmatter の `group` フィールドを優先し、未設定時はタグから推測（フォールバック）。
 */
import type { DocMeta } from './docs';
import categoriesData from '@/config/categories.json';

/**
 * 記事の体系グループ。
 *
 * 注意: `'career'` は `classifyDoc()` が **決して返さない**（career 記事は frontmatter で
 * `group: guide` + `tags: [career]` として書かれ、classifyDoc は group を優先するため
 * 常に `'guide'` になる）。`'career'` はカテゴリページの体系表示（careerFeatured）側で
 * 使う語彙。「この記事は転職・キャリア意図か」の判定は必ず `isCareerDoc()` を使うこと。
 */
export type DocGroupKey = 'guide' | 'pillar' | 'textbook' | 'pastExam' | 'keyword' | 'primary' | 'secondary' | 'career';

/**
 * 転職・キャリア意図の記事か（真実源 = frontmatter `tags: [career]`）。
 *
 * classifyDoc はこれらを `'guide'` として返すため、**学習系の一覧・ナビに career を混ぜない**
 * 用途では必ずこの述語で除外する。混在は 2026-07-28 に docs サイドバー「試験ガイド」で
 * 実際に発生した（civil-1 は 49 件中 26 件が転職記事）。
 * 判定を各所で `tags?.includes('career')` と直書きすると抜けが生まれるのでここへ集約する。
 */
export function isCareerDoc(meta: Pick<DocMeta, 'tags'>): boolean {
  return meta.tags?.includes('career') === true;
}

/** frontmatter の group 値 → DocGroupKey のマッピング */
const GROUP_FIELD_MAP: Record<string, DocGroupKey> = {
  'guide': 'guide',
  'pillar': 'pillar',
  'past-exam': 'pastExam',
  'keyword': 'keyword',
  'primary': 'primary',
  'secondary': 'secondary',
  'textbook': 'textbook',
};

// 記事型の並び（＝許可する記事型）と見出しは categories.json が持つ（groups・layout.groupLabels・DN-0793）
type ClassifierCategory = { slug: string; groups: string[]; layout?: { groupLabels?: Record<string, string> } };
const CATEGORY_BY_SLUG = new Map((categoriesData as ClassifierCategory[]).map((c) => [c.slug, c]));

export function classifyDoc(meta: DocMeta): DocGroupKey {
  // 明示的 group フィールドがあれば優先
  if (meta.group && GROUP_FIELD_MAP[meta.group]) {
    return GROUP_FIELD_MAP[meta.group]!;
  }

  // group の無い記事はカテゴリの最初の記事型へ（全記事が group を持つ。lint-frontmatter・check-content-taxonomy）
  return getGroupOrder(meta.category ?? '')[0] ?? 'keyword';
}

/** カテゴリの記事型の並び（categories.json の groups を DocGroupKey にしたもの）。知らないカテゴリは keyword だけ */
export function getGroupOrder(category: string): DocGroupKey[] {
  const def = CATEGORY_BY_SLUG.get(category);
  if (!def) return ['keyword'];
  return def.groups.map((g) => GROUP_FIELD_MAP[g]).filter((g): g is DocGroupKey => Boolean(g));
}

export function getGroupLabel(category: string, group: DocGroupKey): string {
  return CATEGORY_BY_SLUG.get(category)?.layout?.groupLabels?.[group] ?? group;
}
