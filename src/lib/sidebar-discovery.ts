import type { DocMeta } from './docs';
import { isStructuralTag } from '@/lib/content-taxonomy';
import { classifyDoc, isCareerDoc } from './doc-classifier';
import { getMagazine } from './note-magazines';
import { surfaceRow } from './cta-surfaces';
import { categoryLeadMagazineId, resolvePlacement, renderedNoteCards, renderedMagazineCardIds, resolveArticleMidNoteSlot, resolveEndNoteSlot } from './magazine-placement';

export const DISCOVERY_CATEGORIES = ['pe-first-stage', 'pe-construction', 'concrete-engineer', 'concrete-chief-engineer', 'concrete-diagnostician', 'civil-practice', 'rccm'];
export function sidebarProduct(category: string, doc?: DocMeta, content?: string) {
  // 記事の横の欄の商品カードは、台帳で単品・パックへ案内する資格だけ（もくじへ寄せる資格は横の欄もくじタイル）
  // 資格トップ（doc なし）は台帳がいま出す商品（lead: product の主商品か季節の商品）。もくじへ寄せる資格の季節外は null
  if (!doc) { const id = categoryLeadMagazineId(category); return id ? getMagazine(id) : null; }
  if (surfaceRow(category)?.lead !== 'product') return null;
  // career 記事に note 商品カードを出さない（学習意図＝note／キャリア意図＝転職アフィリの分離）。
  // classifyDoc は 'career' を返さない（career は group: guide のまま・doc-classifier.ts:11-14）ため、
  // 旧実装 `classifyDoc(doc) === 'career'` は常に false の死んだガードだった（2026-09-22 是正）。
  if (isCareerDoc(doc)) return null;
  const placement = resolvePlacement(doc.slug, classifyDoc(doc), isCareerDoc(doc));
  const slot = placement.top || placement.inline[0];
  if (!slot) return null;
  if (content !== undefined) {
    // もくじタイルと異なり個別商品は記事内と重ねない。描画と到達性検査で同じ除外を使う。
    const group = classifyDoc(doc);
    const article = resolvePlacement(doc.slug, group, false, renderedNoteCards(content));
    const mid = resolveArticleMidNoteSlot(article, group, content, group === 'secondary' && /^civil-construction-[12]$/.test(category));
    const end = resolveEndNoteSlot(article, content);
    const shownIds = [...renderedMagazineCardIds(content), article.top?.magazineId, mid?.magazineId, end?.magazineId];
    if (shownIds.includes(slot.magazineId)) return null;
  }
  return getMagazine(slot.magazineId);
}

/** 同じ科目の年度違い、同年度の別科目、同分野の教材と演習を先に出す。 */
export function discoveryGroups(category: string, currentSlug: string, docs: DocMeta[]) {
  const current = docs.find(d => d.slug === currentSlug);
  const pool = docs.filter(d => d.slug !== currentSlug && d.published !== false && !d.hideFromCategory && !isCareerDoc(d));
  const local = currentSlug.slice(category.length + 1);
  const year = local.match(/^(?:h|r)\d{2}(?:-retry)?(?=-)/)?.[0];
  const subject = year ? local.slice(year.length + 1) : local.replace(/^(textbook|primary|guide)-/, '');
  const sameSubject = pool.filter(d => d.slug.slice(category.length + 1).replace(/^(?:(?:h|r)\d{2}(?:-retry)?|textbook|primary|guide)-/, '') === subject);
  const sameYear = year ? pool.filter(d => d.slug.slice(category.length + 1).match(/^(?:h|r)\d{2}(?:-retry)?(?=-)/)?.[0] === year && !sameSubject.includes(d)) : [];
  const used = new Set([...sameSubject, ...sameYear].map(d => d.slug));
  const related = pool.filter(d => !used.has(d.slug)).sort((a,b) => {
    const score = (d: DocMeta) => (current?.tags || []).filter(t => !isStructuralTag(t) && d.tags?.includes(t)).length + Number(!!current && classifyDoc(d) === classifyDoc(current));
    return score(b)-score(a) || a.slug.localeCompare(b.slug);
  });
  return [
    {title:'同じ分野・科目', docs:sameSubject.sort((a,b)=>b.slug.localeCompare(a.slug)).slice(0,4)},
    {title:'同じ年度・実施回の科目',docs:sameYear.slice(0,3)},
    {title:'あわせて学ぶ',docs:related.slice(0,sameSubject.length||sameYear.length?2:4)},
  ].filter(g=>g.docs.length);
}
