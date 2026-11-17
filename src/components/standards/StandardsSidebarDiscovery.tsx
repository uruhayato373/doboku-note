import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui/Button/Button';
import Arrow from '@/components/ui/Arrow/Arrow';
import { EYEBROW } from '@/components/ui/Eyebrow/Eyebrow';
import LinkRow, { LinkRowList } from '@/components/ui/LinkRow/LinkRow';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import QualificationBridge from '@/components/ui/QualificationBridge/QualificationBridge';
import type { RailItem } from '@/components/ui/RailStack/RailStack';
import { getPublicDocPath } from '@/lib/content-routes';
import { resolveNavTitle } from '@/lib/doc-title';
import { qualificationShortLabel } from '@/lib/qualification-names';
import { topicPath } from '@/lib/route-paths';
import type { DocMeta } from '@/lib/docs';
import type { Topic } from '@/lib/topics';
import type { StandardDocument } from '@/lib/standards';
import { standardChapterPath, type StandardChapter } from '@/lib/standards-articles';
import {
  getStandardChapterTopics,
  getStandardEntryChapters,
  getStandardRegionalVersions,
  getStandardRelatedDocs,
} from '@/lib/standards-discovery';

/**
 * 基準書ページの右の欄（モバイルは「資料内を移動」の中）に置く回遊の部品。
 * 何を出すかの判定は src/lib/standards-discovery.ts に集約し、ここは見た目だけ持つ。
 * クリックは MetaCard の trackNav（internal_nav_click）、資格の橋渡しは qualification-bridge（placement=standards-bridge-sidebar）で計る。
 */

const SUB_HEADING = `mt-3 ${EYEBROW.plain}`;

/** 試験対策の記事は短い題名（「コンクリート」「試験概要」）だけでは資格が分からないので、資格名を添える */
function DocList({ docs, showQualification = false }: { docs: DocMeta[]; showQualification?: boolean }) {
  return (
    <LinkRowList>
      {docs.map((doc) => (
        <LinkRow
          key={doc.slug}
          href={getPublicDocPath(doc.slug)}
          title={resolveNavTitle(doc).main}
          eyebrow={showQualification && doc.category ? qualificationShortLabel(doc.category) : undefined}
        />
      ))}
    </LinkRowList>
  );
}

/** テーマの入口記事（実務・試験対策）とテーマのページ */
function RelatedReading({ topics, heading }: { topics: Topic[]; heading: string }) {
  const { practice, exam } = getStandardRelatedDocs(topics);
  if (practice.length === 0 && exam.length === 0) return null;
  return (
    <MetaCard padding="compact" ariaLabel={heading} trackNav="standards-related" className="dark:border-(--rule-soft)" title={heading}>
      {practice.length > 0 && (
        <>
          <h3 className={SUB_HEADING}>実務で使う</h3>
          <DocList docs={practice} />
        </>
      )}
      {exam.length > 0 && (
        <>
          <h3 className={SUB_HEADING}>試験対策で確かめる</h3>
          <DocList docs={exam} showQualification />
        </>
      )}
      <ul className="mt-2 flex flex-wrap gap-x-4">
        {topics.map((topic) => (
          <li key={topic.slug}>
            <ButtonLink href={topicPath(topic.slug)} variant="text">
              {topic.label}のテーマへ <Arrow />
            </ButtonLink>
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}

/** 複数の機関をまとめるときは「地方整備局」を 1 回にする（近畿・中部・関東地方整備局） */
function regionLabel(names: string[]): string {
  if (names.length === 1) return names[0] ?? '';
  const suffix = '地方整備局';
  if (!names.every((name) => name.endsWith(suffix))) return names.join('・');
  return `${names.map((name) => name.slice(0, -suffix.length)).join('・')}${suffix}`;
}

/** 共通仕様書の同じ章を他の地方整備局で読む */
function RegionalVersions({ document, chapter }: { document: StandardDocument; chapter: StandardChapter }) {
  const versions = getStandardRegionalVersions(document, chapter);
  if (versions.length === 0) return null;
  return (
    <MetaCard padding="compact" ariaLabel="他の地方整備局の同じ章" trackNav="standards-region" className="dark:border-(--rule-soft)" title="他の地方整備局の同じ章">
      <LinkRowList className="mt-1" data={{ 'data-standards-nav': 'regions' }}>
        {versions.map((version) => (
          <LinkRow
            key={version.href}
            href={version.href}
            title={regionLabel(version.agencyNames)}
            current={version.current}
            description={!version.current && version.changed ? <span className="font-bold text-warn">この章に本文の違いあり</span> : undefined}
          />
        ))}
      </LinkRowList>
      <ButtonLink href="/standards/compare" variant="text" className="mt-1">
        地方整備局別の違いを一覧で見る <Arrow />
      </ButtonLink>
    </MetaCard>
  );
}

/** 最初の回遊カードの後に間のバナーを挟む。カードが無ければ間のバナーだけ。 */
function discoveryItems(cards: RailItem[], betweenCards?: ReactNode): RailItem[] {
  const visible = cards.filter((card) => card.node);
  const between: RailItem[] = betweenCards ? [{ kind: 'career', node: betweenCards }] : [];
  return visible.length === 0 ? between : [visible[0] as RailItem, ...between, ...visible.slice(1)];
}

/** 章ページ・節ページの右の欄（目次の下） */
export function standardChapterDiscoveryItems({ document, chapter, withBridge, betweenCards }: { document: StandardDocument; chapter: StandardChapter; withBridge: boolean; betweenCards?: ReactNode }): RailItem[] {
  const topics = getStandardChapterTopics(chapter);
  return discoveryItems([
    { kind: 'nav', node: RelatedReading({ topics, heading: 'この章を実務・試験で深める' }) },
    { kind: 'nav', node: RegionalVersions({ document, chapter }) },
    { kind: 'bridge', node: withBridge && <QualificationBridge placement="standards-bridge-sidebar" layout="sidebar" /> },
  ], betweenCards);
}

/** 共通仕様書の入口の章（共通編・土木工事共通編）へ直接入る */
function StandardEntryChapters({ agencyId, heading = '共通仕様書を章から読む' }: { agencyId: string; heading?: string }) {
  const entry = getStandardEntryChapters(agencyId);
  if (!entry) return null;
  return (
    <MetaCard padding="compact" ariaLabel={heading} trackNav="standards-entry-chapter" className="dark:border-(--rule-soft)" title={heading}>
      {entry.document.agencyId !== agencyId && (
        <p className="mt-1 text-[12px] text-(--ink-muted)">{entry.document.agencyName}版（本文が共通の地域をまとめた版）</p>
      )}
      <LinkRowList className="mt-1">
        {entry.chapters.map((chapter) => (
          <LinkRow
            key={chapter.chapterId}
            href={standardChapterPath(entry.document, chapter)}
            marker={<span className="shrink-0 font-mono text-[11px] text-(--ink-muted)">{chapter.chapterId}</span>}
            title={`${chapter.bookTitle}・${chapter.chapterTitle}`}
          />
        ))}
      </LinkRowList>
    </MetaCard>
  );
}

/** 入口の章の区画（右の欄の 1 つ） */
export function standardEntryChaptersItem(agencyId: string, heading?: string): RailItem {
  return { kind: 'nav', node: StandardEntryChapters({ agencyId, ...(heading ? { heading } : {}) }) };
}

/** 文書・機関・トップのページの右の欄（テーマの記事と資格の橋渡し） */
export function standardTopicDiscoveryItems({ topics, heading, withBridge, betweenCards }: { topics: Topic[]; heading: string; withBridge: boolean; betweenCards?: ReactNode }): RailItem[] {
  return discoveryItems([
    { kind: 'nav', node: topics.length > 0 && RelatedReading({ topics: topics.slice(0, 2), heading }) },
    { kind: 'bridge', node: withBridge && <QualificationBridge placement="standards-bridge-sidebar" layout="sidebar" /> },
  ], betweenCards);
}
