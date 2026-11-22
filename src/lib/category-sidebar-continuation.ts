import type { DocMeta } from './docs';
import { getPublicDocPath } from './content-routes';
import type { PopularDoc } from './popular';
import { categoryRailGroupCount, createCardPicker, withRailAdSense, type RailGroup, type RailLink, type RailSource } from './rail-continuation';

/**
 * 資格トップの右の欄の「下に続く束」（DN-1218 段 3）。上の束（学習ナビ・note・運営者・転職バナー・人気記事）の下へ、
 * 新着の記事（サムネイルつき）の組を並べる（1 組おきに AdSense・転職バナーは置かない＝rail-continuation の RAIL_AFFILIATE_MAX）。人気順は上の束の人気記事（順位つきのサムネイル）だけが持つ
 * （2026-11-22・以前は下の続きにも同じ人気順を「よく読まれている記事」として重ねていた。28 日で表示 12,235・クリック 5）。組の数は一覧の記事数から（categoryRailGroupCount・実測は同ファイル）。
 * 上の束の人気ランキングに出た記事・同じ記事を 2 回出さない。
 */
const CATEGORY_RAIL_SLOT = 'category-rail';
const stamp = (doc: DocMeta) => doc.publishedAt || doc.created || '';
const docLinks = (docs: DocMeta[]): RailLink[] => docs.map(doc => ({ href: getPublicDocPath(doc.slug), title: doc.shortTitle || doc.title, doc }));

/** docs は資格トップに並ぶ記事、shownPopular は上の束の人気ランキング */
export function categorySidebarContinuation(docs: DocMeta[], shownPopular: PopularDoc[]): RailGroup[] {
  const count = categoryRailGroupCount(docs.length);
  if (!count) return withRailAdSense([]);
  const usedHrefs = new Set(shownPopular.map(item => getPublicDocPath(item.doc.slug)));
  const sources: RailSource[] = [
    { label: 'rail-latest', title: '新着の記事', links: docLinks([...docs].sort((a, b) => stamp(b).localeCompare(stamp(a)) || a.slug.localeCompare(b.slug)).slice(0, 2 * 3)) },
  ];
  const nextCard = createCardPicker({ others: sources, usedHrefs });
  const groups: RailGroup[] = [];
  for (let index = 0; index < count; index++) {
    const card = nextCard(index);
    if (!card) break;
    groups.push({ slot: CATEGORY_RAIL_SLOT, card });
  }
  return withRailAdSense(groups);
}
