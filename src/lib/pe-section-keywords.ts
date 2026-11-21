/**
 * pe-section-keywords.ts — 総監のキーワードページの「同じセクションのキーワード」（唯一の解決）。
 * 右の欄の一覧（CategoryNavCard の SectionCard）・スマホの記事末の一覧（SectionKeywords）・右の欄に出すかの判定と
 * 計画の slug 一覧（category-nav-plan）が共用する。pe-chapters.json にあってページの無い slug は、内部リンク切れに
 * なるので除く（いま見ているページは残す）。
 */
import peChapters from '@/config/pe-chapters.json';
import { peKeywordPageExists } from './pe-keyword-nav';

const PREFIX = 'pe-comprehensive-management-';
type Chapter = (typeof peChapters.chapters)[number];
type Section = Chapter['sections'][number];
type Keyword = Section['keywords'][number];

export type PeSectionKeywords = {
  chapter: Chapter;
  section: Section;
  /** ページのあるキーワードと、いま見ているページ（pe-chapters.json の順） */
  keywords: Keyword[];
  /** いま見ているページの slug から接頭辞を外したもの */
  currentSuffix: string;
};

export const peKeywordSlug = (suffix: string) => `${PREFIX}${suffix}`;

export function peSectionKeywords(sectionId: string | undefined, currentSlug: string): PeSectionKeywords | null {
  if (!sectionId) return null;
  const chapter = peChapters.chapters.find((c) => c.id === sectionId.split('.')[0]);
  const section = chapter?.sections.find((s) => s.id === sectionId);
  if (!chapter || !section?.keywords) return null;
  const currentSuffix = currentSlug.replace(PREFIX, '');
  const keywords = section.keywords.filter((k) => k.slug === currentSuffix || peKeywordPageExists(k.slug));
  return { chapter, section, keywords, currentSuffix };
}
