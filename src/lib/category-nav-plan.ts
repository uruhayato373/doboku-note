import type { DocMeta } from './docs';
import { classifyDoc, type DocGroupKey } from './doc-classifier';
import { DISCOVERY_CATEGORIES, discoveryGroups } from './sidebar-discovery';
import { resolveCurriculum } from './category-curriculum';
import { isCivilConstructionCategory } from './qualification-names';
import { buildPastExamNavData } from './past-exam-nav';
import peChapters from '@/config/pe-chapters.json';
import { peKeywordPageExists } from './pe-keyword-nav';
export interface CategoryNavCardProps {
 variant: 'sidebar' | 'mobile'; category: string; currentSlug: string; docGroup: DocGroupKey; categoryArticles: DocMeta[];
}
function linklistcard(p: { variant: string; title: string; currentSlug: string; docs: DocMeta[]; navList?: string }) { return p.docs.length ? { kind: 'links' as const, ...p } : null; }
function pastexamcard(p: { variant: string; currentSlug: string; categoryArticles: DocMeta[]; category: string }) { return buildPastExamNavData(p.category, p.categoryArticles)?.years.length ? { kind: 'pastExam' as const } : null; }
function sectioncard(p: { variant: string; currentSlug: string; currentSection: string | undefined }) {
 if (p.variant === 'sidebar') {
  const section = peChapters.chapters.flatMap(c => c.sections).find(s => s.id === p.currentSection);
  if (!section?.keywords.some(k => k.slug === p.currentSlug.replace('pe-comprehensive-management-', '') || peKeywordPageExists(k.slug))) return null;
 }
 return { kind: 'section' as const, currentSection: p.currentSection };
}
function categoryNavSpecs({ variant, category, currentSlug, docGroup, categoryArticles }: CategoryNavCardProps) {
  if (DISCOVERY_CATEGORIES.includes(category)) return { kind: 'discovery' as const };
  if (category === 'pe-comprehensive-management') {
    const currentDoc = categoryArticles.find((m) => m.slug === currentSlug);
    const currentSection = currentDoc?.section as string | undefined;

    switch (docGroup) {
      case 'guide': {
        const guides = categoryArticles
          .filter((m) => classifyDoc(m) === 'guide')
          .sort((a, b) => (a.guide_order ?? 999) - (b.guide_order ?? 999));
        return linklistcard({ variant: variant, title: "試験概要", currentSlug: currentSlug, docs: guides });
      }
      case 'pillar': {
        const pillars = categoryArticles
          .filter((m) => classifyDoc(m) === 'pillar')
          .sort((a, b) => parseFloat(a.section ?? '99') - parseFloat(b.section ?? '99'));
        return [
          linklistcard({ variant, title: '5 管理学習ガイド', currentSlug, docs: pillars }),
          pastexamcard({ variant, currentSlug, categoryArticles, category }),
        ];
      }
      case 'pastExam':
        return pastexamcard({ variant: variant, currentSlug: currentSlug, categoryArticles: categoryArticles, category: category });
      case 'keyword':
        return sectioncard({ variant: variant, currentSlug: currentSlug, currentSection: currentSection });
      default:
        return null;
    }
  }

  if (isCivilConstructionCategory(category)) {
    switch (docGroup) {
      case 'guide': {
        // 学習系ガイドのみを curriculum の意図順で出す。
        // classifyDoc は career 記事も 'guide' を返すため、素で filter すると転職記事が混入する
        // （2026-07-28 実測: civil-1 は 49 件中 26 件が転職系・並びは slug のアルファベット順）。
        // カテゴリページと同じ resolveCurriculum に寄せることで career 除外と表示順が構造的に入る。
        // 転職導線はサイドバーのアフィリ枠とカテゴリページの CareerSection が担当（ここには出さない）。
        const guideDocs = categoryArticles.filter((m) => classifyDoc(m) === 'guide');
        const curriculum = resolveCurriculum(category, guideDocs);
        const guides = [...(curriculum.examGuide?.docs ?? []), ...curriculum.unassigned];
        return (
          linklistcard({ variant: variant, title: "試験ガイド", currentSlug: currentSlug, docs: guides, navList: "exam-guide" })
        );
      }
      case 'primary':
        return pastexamcard({ variant: variant, currentSlug: currentSlug, categoryArticles: categoryArticles, category: category });
      case 'secondary': {
        const secondaryDocs = categoryArticles.filter((m) => classifyDoc(m) === 'secondary');
        return linklistcard({ variant: variant, title: "第2次検定", currentSlug: currentSlug, docs: secondaryDocs });
      }
      case 'textbook': {
        const textbooks = categoryArticles
          .filter((m) => classifyDoc(m) === 'textbook')
          .sort((a, b) => (a.textbook_order ?? 999) - (b.textbook_order ?? 999));
        return linklistcard({ variant: variant, title: "テキスト", currentSlug: currentSlug, docs: textbooks });
      }
      default:
        return null;
    }
  }

  return null;
}


export function categoryNavPlan(props: CategoryNavCardProps) {
 const result = categoryNavSpecs(props);
 return (Array.isArray(result) ? result : [result]).filter((card): card is NonNullable<typeof card> => card !== null);
}

/** 右欄の追加カードから既存ナビの行き先を除く。描画と同じ spec / resolver を使う。 */
export function categoryNavLinkedSlugs(props: CategoryNavCardProps): string[] {
 return categoryNavPlan(props).flatMap(card => {
  if (card.kind === 'links') return card.docs.map(doc => doc.slug);
  if (card.kind === 'discovery') return discoveryGroups(props.category, props.currentSlug, props.categoryArticles).flatMap(group => group.docs.map(doc => doc.slug));
  if (card.kind === 'pastExam') return (buildPastExamNavData(props.category, props.categoryArticles)?.years ?? []).flatMap(year => [year.col1, year.col2, year.col3].flatMap(doc => doc ? [doc.slug] : []));
  return (peChapters.chapters.flatMap(chapter => chapter.sections).find(section => section.id === card.currentSection)?.keywords ?? [])
   .filter(keyword => peKeywordPageExists(keyword.slug)).map(keyword => `pe-comprehensive-management-${keyword.slug}`);
 });
}
