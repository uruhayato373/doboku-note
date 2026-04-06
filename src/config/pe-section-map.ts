/**
 * 総合技術監理キーワード集2026の章・節構造
 * pe-keyword-tree-2026.json から導出
 */
import treeData from './pe-keyword-tree-2026.json';

export type PeSection = {
  id: string;    // "2.1"
  title: string; // "事業企画"
};

export type PeChapter = {
  id: string;    // "2"
  title: string; // "経済性管理"
  sections: PeSection[];
};

type TreeKeyword = {
  title: string;
  slug?: string;
  level: number;
  children?: TreeKeyword[];
};

type TreeSection = {
  id: string;
  title: string;
  keywords: TreeKeyword[];
};

type TreeChapter = {
  id: string;
  title: string;
  sections: TreeSection[];
};

// PE_CHAPTERS: 章・節構造
export const PE_CHAPTERS: PeChapter[] = (treeData.chapters as TreeChapter[]).map(ch => ({
  id: ch.id,
  title: ch.title,
  sections: ch.sections.map(sec => ({ id: sec.id, title: sec.title })),
}));

// KEYWORD_SECTION_MAP: slug末尾 → セクション番号
function buildKeywordMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const ch of treeData.chapters as TreeChapter[]) {
    for (const sec of ch.sections) {
      collectSlugs(sec.keywords, sec.id, map);
    }
  }
  return map;
}

function collectSlugs(keywords: TreeKeyword[], sectionId: string, map: Record<string, string>) {
  for (const kw of keywords) {
    if (kw.slug) {
      map[kw.slug] = sectionId;
    }
    if (kw.children) {
      collectSlugs(kw.children, sectionId, map);
    }
  }
}

export const KEYWORD_SECTION_MAP: Record<string, string> = buildKeywordMap();

/**
 * slugからキーワード部分を抽出
 * "pe-comprehensive-management-followership" → "followership"
 */
export function extractKeywordSlug(fullSlug: string): string {
  return fullSlug.replace(/^pe-comprehensive-management-/, '');
}

/**
 * キーワードが属するセクション番号を返す（未登録はnull）
 */
export function getKeywordSection(fullSlug: string): string | null {
  const key = extractKeywordSlug(fullSlug);
  return KEYWORD_SECTION_MAP[key] ?? null;
}
