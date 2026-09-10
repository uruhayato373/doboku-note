/**
 * content-taxonomy — 分類語彙（領域・記事型・タグ class）の runtime アクセサ。
 *
 * 真実源: 規則 = .claude/knowledge/reference/content-taxonomy.md、値 = src/config/content-taxonomy.json /
 * categories.json / tags.json。ページやコンポーネントは JSON を直読みせず、ここを通す。
 */
import taxonomy from '@/config/content-taxonomy.json';
import categoriesData from '@/config/categories.json';
import tagsData from '@/config/tags.json';

export type PublicArea = 'exam' | 'practice' | 'standards';
export type TagClass = 'structural' | 'flag' | 'qualification' | 'topical';

type GroupDef = { label: string; routeSegment: string; docGroupKey: string; structuralTags: string[] };
type TagEntry = { name: string; slug: string; class?: TagClass; canonical?: string; aliases?: string[] };

const groups = (taxonomy as { groups: Record<string, GroupDef> }).groups;
const areas = (taxonomy as { areas: Record<PublicArea, { label: string; hubPath: string }> }).areas;
const categoryArea = new Map<string, PublicArea>();
const categoryGroups = new Map<string, string[]>();
for (const c of categoriesData as Array<{ slug: string; area?: PublicArea; groups?: string[] }>) {
  categoryArea.set(c.slug, c.area ?? 'exam');
  categoryGroups.set(c.slug, c.groups ?? []);
}

const toCanonical = new Map<string, string>();
const classOf = new Map<string, TagClass>();
for (const e of tagsData as TagEntry[]) {
  const canonical = e.canonical ?? e.name;
  for (const s of [e.name, e.slug, ...(e.aliases ?? [])]) if (s) toCanonical.set(s, canonical);
  classOf.set(canonical, e.class ?? 'topical');
}

export function getCategoryArea(category: string | undefined): PublicArea {
  return (category && categoryArea.get(category)) || 'exam';
}

export function getAreaHubPath(area: PublicArea): string {
  return areas[area]?.hubPath ?? '/exam';
}

export function getGroupDef(group: string): GroupDef | undefined {
  return groups[group];
}

export function getAllowedGroups(category: string): string[] {
  return categoryGroups.get(category) ?? [];
}

/** 受理綴り（name / slug / aliases）を正規表記へ。未登録はそのまま返す。 */
export function canonicalTag(tag: string): string {
  return toCanonical.get(tag) ?? tag;
}

/** structural / flag class のタグ（記事種別・機械スイッチ）。関連度計算やカード表示から除く。 */
export function isStructuralTag(tag: string): boolean {
  const c = classOf.get(canonicalTag(tag));
  return c === 'structural' || c === 'flag';
}
