import type { DocMeta } from './docs';
import type { ResolvedPlacement } from './affiliate-placement';
import { getPublicDocPath } from './content-routes';
import { getPopularDocs, type PopularDoc } from './popular';
import { categoryRailGroupCount, createCardPicker, railFillColumn, type RailGroup, type RailLink, type RailSource } from './rail-continuation';

/**
 * 資格トップの右の欄の「下に続く束」（DN-1218 段 3）。上の束（学習ナビ・note・運営者・転職バナー・人気ランキング）の下へ、
 * 人気・新着の記事（サムネイルつき）と転職バナーの組を並べる。組の数は一覧の記事数から（categoryRailGroupCount・実測は同ファイル）。
 * 上の束の人気ランキングに出た記事・同じ記事を 2 回出さない。バナーは上の束の転職バナーと同じ案件を繰り返し、ピクセルは付けない。
 */
const CATEGORY_RAIL_FILL_SLOT = 'category-rail-fill';
const stamp = (doc: DocMeta) => doc.publishedAt || doc.created || '';
const docLinks = (docs: DocMeta[]): RailLink[] => docs.map(doc => ({ href: getPublicDocPath(doc.slug), title: doc.shortTitle || doc.title, doc }));

/** docs は資格トップに並ぶ記事、shownPopular は上の束の人気ランキング、sidebarAd は上の束の転職バナーの案件 */
export function categorySidebarContinuation(docs: DocMeta[], shownPopular: PopularDoc[], sidebarAd: ResolvedPlacement | null): RailGroup[] {
  const count = categoryRailGroupCount(docs.length);
  if (!count) return [];
  const usedHrefs = new Set(shownPopular.map(item => getPublicDocPath(item.doc.slug)));
  const sources: RailSource[] = [
    { label: 'rail-popular', title: 'よく読まれている記事', links: docLinks(getPopularDocs(docs, docs.length).map(item => item.doc)) },
    { label: 'rail-latest', title: '新着の記事', links: docLinks([...docs].sort((a, b) => stamp(b).localeCompare(stamp(a)) || a.slug.localeCompare(b.slug)).slice(0, 2 * 3)) },
  ];
  const nextCard = createCardPicker({ others: sources, usedHrefs });
  const column = railFillColumn(sidebarAd ? [sidebarAd] : [], CATEGORY_RAIL_FILL_SLOT);
  const groups: RailGroup[] = [];
  for (let index = 0; index < count; index++) {
    const card = nextCard(index);
    if (!card) break;
    groups.push({ slot: CATEGORY_RAIL_FILL_SLOT, card, banner: column[index % Math.max(1, column.length)] });
  }
  return groups;
}
