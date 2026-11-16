import 'server-only';

import type { DocMeta } from './docs';
import { getAllDocsMeta } from './docs';
import { resolvePlacements, type ResolvedPlacement, type ResolvedPlacements } from './affiliate-placement';
import { articleSidebarGroupCount } from './article-sidebar-plan';
import { getPublicDocPath } from './content-routes';
import { getPopularDocs } from './popular';
import { createCardPicker, interleaveFillGroups, railFillColumn, type RailGroup, type RailLink, type RailSource } from './rail-continuation';
import type { StandardDocument } from './standards';
import { getStandardChapterTopics, getStandardRelatedDocs } from './standards-discovery';
import { getStandardChapters, standardChapterPath, type StandardChapter } from './standards-articles';

/**
 * 基準書の章・節ページの右の欄の「下に続く束」（DN-1218 段 3）。上の束（目次・回遊・資格の橋渡し）の下へ、
 * 回遊カード＋転職バナーの組を本文の長さに応じた数だけ並べる。組の数は記事と同じ判定（articleSidebarGroupCount・係数 standards）。
 * 組の中身は、この章に近い実務の記事 → 試験対策の記事 → 同じ文書の前後の章（文字の一覧）→ 同じ資格の人気・新着の順に回し、
 * 上の束のカードに出た記事・同じ記事を 2 回出さない。バナーは基準書の右の欄の案件（standards-rail 系）を順に繰り返し、
 * ピクセルは付けない（上の束の同じ案件が持つ）。候補が尽きて見積もりに足りない組は、バナーだけの組で埋める。
 */

/** 回遊の「同じ資格」。基準書の読み手の主な行き先（施工管理基準＝土木施工管理技士） */
const STANDARDS_QUALIFICATION = 'civil-construction-1';
const STANDARDS_RAIL_FILL_SLOT = 'standards-rail-fill';
const RAIL_SLOTS = ['standards-rail', 'standards-rail-2', 'standards-rail-3'];
/** 同じ文書の前後の章として出す範囲（現在の章から数えて前後それぞれ） */
const NEARBY_CHAPTERS = 3;

const stamp = (doc: DocMeta) => doc.publishedAt || doc.created || '';
const docLinks = (docs: DocMeta[]): RailLink[] => docs.map(doc => ({ href: getPublicDocPath(doc.slug), title: doc.shortTitle || doc.title, doc }));

/** 同じ文書の前後の章（manifest の並び）。本文の無い章は除く */
function nearbyChapters(document: StandardDocument, chapter: StandardChapter): RailLink[] {
  const chapters = getStandardChapters(document.agencyId, document.documentId);
  const index = chapters.findIndex(entry => entry.chapterId === chapter.chapterId);
  if (index < 0) return [];
  return chapters
    .map((entry, i) => ({ entry, i }))
    .filter(({ entry, i }) => i !== index && Math.abs(i - index) <= NEARBY_CHAPTERS && !entry.bodyless)
    .map(({ entry }) => ({ href: standardChapterPath(document, entry), title: entry.title }));
}

export function standardsSidebarContinuation(
  document: StandardDocument,
  chapter: StandardChapter,
  bodyLength: number,
  placements: ResolvedPlacements = resolvePlacements({ pageKind: 'standards' }),
): RailGroup[] {
  const count = articleSidebarGroupCount(bodyLength, 0, 'standards');
  if (!count) return [];

  // 上の束の「この章を実務・試験で深める」に出ている記事は出さない
  const topics = getStandardChapterTopics(chapter);
  const usedHrefs = new Set<string>();
  const shown = getStandardRelatedDocs(topics, 3);
  [...shown.practice, ...shown.exam].forEach(doc => usedHrefs.add(getPublicDocPath(doc.slug)));
  usedHrefs.add(standardChapterPath(document, chapter));

  const wide = getStandardRelatedDocs(topics, 12);
  const categoryDocs = getAllDocsMeta().filter(doc => doc.category === STANDARDS_QUALIFICATION && doc.published !== false && !doc.hideFromCategory && !doc.tags?.includes('模範論文'));
  const sources: RailSource[] = [
    { label: 'rail-standards-practice', title: 'この章に近い実務の記事', links: docLinks(wide.practice) },
    { label: 'rail-standards-exam', title: '試験対策で確かめる', links: docLinks(wide.exam) },
    { label: 'rail-standards-chapters', title: '同じ文書の前後の章', links: nearbyChapters(document, chapter), plain: true },
    { label: 'rail-popular', title: '土木施工管理のよく読まれている記事', links: docLinks(getPopularDocs(categoryDocs, categoryDocs.length).map(item => item.doc)) },
    { label: 'rail-latest', title: '土木施工管理の新着記事', links: docLinks([...categoryDocs].sort((a, b) => stamp(b).localeCompare(stamp(a)) || a.slug.localeCompare(b.slug)).slice(0, 6)) },
  ];
  const nextCard = createCardPicker({ others: sources, usedHrefs });

  const column = railFillColumn(RAIL_SLOTS.flatMap(slot => placements[slot] ? [placements[slot] as ResolvedPlacement] : []), STANDARDS_RAIL_FILL_SLOT);
  const groups: RailGroup[] = [];
  for (let index = 0; index < count; index++) {
    const card = nextCard(index);
    if (!card) break;
    groups.push({ slot: STANDARDS_RAIL_FILL_SLOT, card, banner: column.length ? column[index % column.length] : undefined });
  }
  return interleaveFillGroups(groups, count - groups.length, column, STANDARDS_RAIL_FILL_SLOT);
}
