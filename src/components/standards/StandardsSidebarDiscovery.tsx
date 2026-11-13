import Link from 'next/link';
import MetaCard from '@/components/ui/MetaCard/MetaCard';
import QualificationBridge from '@/components/ui/QualificationBridge/QualificationBridge';
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
 * クリックは MetaCard の trackNav（internal_nav_click）、資格の橋渡しは qualification-bridge（placement=standards-sidebar）で計る。
 */

const LIST_LINK = 'focus-ring flex min-h-11 flex-col justify-center py-2 text-sm text-(--accent) hover:underline';
const SUB_HEADING = 'mt-3 text-[13px] font-bold text-(--ink-muted)';

/** 試験対策の記事は短い題名（「コンクリート」「試験概要」）だけでは資格が分からないので、資格名を添える */
function DocList({ docs, showQualification = false }: { docs: DocMeta[]; showQualification?: boolean }) {
  return (
    <ul className="divide-y divide-(--rule-soft)">
      {docs.map((doc) => (
        <li key={doc.slug}>
          <Link className={LIST_LINK} href={getPublicDocPath(doc.slug)}>
            {showQualification && doc.category && (
              <span className="text-[11px] font-bold text-(--ink-muted)">{qualificationShortLabel(doc.category)}</span>
            )}
            <span>{resolveNavTitle(doc).main}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** テーマの入口記事（実務・試験対策）とテーマのページ */
function RelatedReading({ topics, heading }: { topics: Topic[]; heading: string }) {
  const { practice, exam } = getStandardRelatedDocs(topics);
  if (practice.length === 0 && exam.length === 0) return null;
  return (
    <MetaCard padding="compact" ariaLabel={heading} trackNav="standards-related" className="dark:border-(--rule-soft)">
      <h2 className="text-lg font-bold text-(--ink)">{heading}</h2>
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
            <Link className="focus-ring inline-flex min-h-11 items-center text-[13px] font-bold text-(--accent) hover:underline" href={topicPath(topic.slug)}>
              {topic.label}のテーマへ →
            </Link>
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
    <MetaCard padding="compact" ariaLabel="他の地方整備局の同じ章" trackNav="standards-region" className="dark:border-(--rule-soft)">
      <h2 className="text-lg font-bold text-(--ink)">他の地方整備局の同じ章</h2>
      <ul className="mt-1 divide-y divide-(--rule-soft)" data-standards-nav="regions">
        {versions.map((version) => (
          <li key={version.href}>
            {version.current ? (
              <span className="flex min-h-11 flex-col justify-center py-2 text-sm text-(--ink)" aria-current="page">
                <span className="font-bold">{regionLabel(version.agencyNames)}</span>
                <span className="text-[12px] text-(--ink-muted)">表示中</span>
              </span>
            ) : (
              <Link className="focus-ring flex min-h-11 flex-col justify-center py-2 text-sm text-(--accent) hover:underline" href={version.href}>
                <span>{regionLabel(version.agencyNames)}</span>
                {version.changed && <span className="text-[12px] font-bold text-warn">この章に本文の違いあり</span>}
              </Link>
            )}
          </li>
        ))}
      </ul>
      <Link className="focus-ring mt-1 inline-flex min-h-11 items-center text-[13px] font-bold text-(--accent) hover:underline" href="/standards/compare">
        地方整備局別の違いを一覧で見る →
      </Link>
    </MetaCard>
  );
}

/** 章ページ・節ページの右の欄（目次の下） */
export function StandardChapterDiscovery({ document, chapter, withBridge }: { document: StandardDocument; chapter: StandardChapter; withBridge: boolean }) {
  const topics = getStandardChapterTopics(chapter);
  return (
    <>
      <RelatedReading topics={topics} heading="この章を実務・試験で深める" />
      <RegionalVersions document={document} chapter={chapter} />
      {withBridge && <QualificationBridge placement="standards-sidebar" layout="sidebar" />}
    </>
  );
}

/** 共通仕様書の入口の章（共通編・土木工事共通編）へ直接入る */
export function StandardEntryChapters({ agencyId, heading = '共通仕様書を章から読む' }: { agencyId: string; heading?: string }) {
  const entry = getStandardEntryChapters(agencyId);
  if (!entry) return null;
  return (
    <MetaCard padding="compact" ariaLabel={heading} trackNav="standards-entry-chapter" className="dark:border-(--rule-soft)">
      <h2 className="text-lg font-bold text-(--ink)">{heading}</h2>
      {entry.document.agencyId !== agencyId && (
        <p className="mt-1 text-[12px] text-(--ink-muted)">{entry.document.agencyName}版（本文が共通の地域をまとめた版）</p>
      )}
      <ul className="mt-1 divide-y divide-(--rule-soft)">
        {entry.chapters.map((chapter) => (
          <li key={chapter.chapterId}>
            <Link className="focus-ring flex min-h-11 items-center gap-2 py-2 text-sm text-(--accent) hover:underline" href={standardChapterPath(entry.document, chapter)}>
              <span className="shrink-0 font-mono text-[11px] text-(--ink-muted)">{chapter.chapterId}</span>
              <span>{chapter.bookTitle}・{chapter.chapterTitle}</span>
            </Link>
          </li>
        ))}
      </ul>
    </MetaCard>
  );
}

/** 文書・機関・トップのページの右の欄（テーマの記事と資格の橋渡し） */
export function StandardTopicDiscovery({ topics, heading, withBridge }: { topics: Topic[]; heading: string; withBridge: boolean }) {
  return (
    <>
      {topics.length > 0 && <RelatedReading topics={topics.slice(0, 2)} heading={heading} />}
      {withBridge && <QualificationBridge placement="standards-sidebar" layout="sidebar" />}
    </>
  );
}
