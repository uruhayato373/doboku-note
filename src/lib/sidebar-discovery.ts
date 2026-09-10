import type { DocMeta } from './docs';
import { isStructuralTag } from '@/lib/content-taxonomy';
import { classifyDoc } from './doc-classifier';
import { getMagazine, type MagazineId } from './note-magazines';
import { resolvePlacement } from './magazine-placement';

export const DISCOVERY_CATEGORIES = ['pe-first-stage', 'pe-construction', 'concrete-engineer', 'concrete-chief-engineer', 'concrete-diagnostician', 'civil-practice'];
const products: Partial<Record<string, MagazineId>> = {
  'pe-first-stage': 'pe1-takuitsu-pdf',
  'concrete-engineer': 'ce-mix-jis-practice',
  'concrete-chief-engineer': 'cce-marugoto-pack',
  'concrete-diagnostician': 'cd-essay-magazine',
};
export function sidebarProduct(category: string, doc?: DocMeta) {
  if (!products[category]) return null;
  if (!doc) return getMagazine(products[category]!);
  if (classifyDoc(doc) === 'career') return null;
  const placement = resolvePlacement(doc.slug, classifyDoc(doc));
  const slot = placement.top || placement.inline[0];
  return slot ? getMagazine(slot.magazineId) : null;
}

/** 同じ科目の年度違い、同年度の別科目、同分野の教材と演習を先に出す。 */
export function discoveryGroups(category: string, currentSlug: string, docs: DocMeta[]) {
  const current = docs.find(d => d.slug === currentSlug);
  const pool = docs.filter(d => d.slug !== currentSlug && d.published !== false && !d.hideFromCategory && classifyDoc(d) !== 'career');
  const local = currentSlug.slice(category.length + 1);
  const year = local.match(/^(?:h|r)\d{2}(?=-)/)?.[0];
  const subject = year ? local.slice(year.length + 1) : local.replace(/^(textbook|primary|guide)-/, '');
  const sameSubject = pool.filter(d => d.slug.slice(category.length + 1).replace(/^(?:(?:h|r)\d{2}|textbook|primary|guide)-/, '') === subject);
  const sameYear = year ? pool.filter(d => d.slug.startsWith(`${category}-${year}-`) && !sameSubject.includes(d)) : [];
  const used = new Set([...sameSubject, ...sameYear].map(d => d.slug));
  const related = pool.filter(d => !used.has(d.slug)).sort((a,b) => {
    const score = (d: DocMeta) => (current?.tags || []).filter(t => !isStructuralTag(t) && d.tags?.includes(t)).length + Number(!!current && classifyDoc(d) === classifyDoc(current));
    return score(b)-score(a) || a.slug.localeCompare(b.slug);
  });
  return [
    {title:'同じ分野・科目', docs:sameSubject.sort((a,b)=>b.slug.localeCompare(a.slug)).slice(0,4)},
    {title:'同じ年度の科目',docs:sameYear.slice(0,3)},
    {title:'あわせて学ぶ',docs:related.slice(0,sameSubject.length||sameYear.length?2:4)},
  ].filter(g=>g.docs.length);
}
