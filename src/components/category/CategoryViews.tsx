import { type ReactNode } from 'react';
import Link from 'next/link';
import { getGroupLabel } from '@/lib/doc-classifier';
import { type DocGroup } from '@/lib/category-groups';
import { DocSection } from '@/components/category/CategorySections';
import { resolveCurriculum, resolveTextbookChapters } from '@/lib/category-curriculum';
import { CurriculumSection, CurriculumList, CareerSection } from '@/components/category/CurriculumSections';

/** civil-construction-1: 受験ガイド＋分野別＋テキスト章目次をリスト化、過去問はテーブル維持 */
export function CivilConstruction1View({ groups, mobileCareerAds = [] }: { groups: DocGroup[]; mobileCareerAds?: ReactNode[] }) {
  const category = 'civil-construction-1';
  const guideGroup = groups.find(g => g.key === 'guide');
  const textbookGroup = groups.find(g => g.key === 'textbook');
  const primaryGroup = groups.find(g => g.key === 'primary');
  const secondaryGroup = groups.find(g => g.key === 'secondary');

  const curriculum = resolveCurriculum(category, guideGroup?.docs ?? []);
  const chapters = resolveTextbookChapters(category, textbookGroup?.docs ?? [], guideGroup?.docs ?? []);
  // 受験ガイド節に未割当（config 追記漏れ・新規記事）を必ず合流させ silent drop を防ぐ
  const examGuideDocs = [...(curriculum.examGuide?.docs ?? []), ...curriculum.unassigned];
  const fieldsCount = curriculum.fields?.blocks.reduce((n, b) => n + b.docs.length, 0) ?? 0;
  const textbookCount = chapters.reduce((n, c) => n + c.docs.length + c.intro.length, 0);

  // secondary を年度別過去問と分野別に分離
  const secondaryYearDocs = secondaryGroup?.docs.filter(d => /secondary-(r|h)\d+$/.test(d.slug || '')) || [];
  const secondaryTopicDocs = secondaryGroup?.docs.filter(d => !/secondary-(r|h)\d+$/.test(d.slug || '')) || [];

  return (
    <>
      {examGuideDocs.length > 0 && (
        <CurriculumSection id="guide" title={curriculum.examGuide?.title ?? '受験ガイド'} description={curriculum.examGuide?.description} count={examGuideDocs.length}>
          <CurriculumList blocks={[{ docs: examGuideDocs }]} />
        </CurriculumSection>
      )}
      {curriculum.fields && (
        <CurriculumSection id="fields" title={curriculum.fields.title} description={curriculum.fields.description} count={fieldsCount}>
          <CurriculumList blocks={curriculum.fields.blocks} />
        </CurriculumSection>
      )}
      {mobileCareerAds[0]}
      {chapters.length > 0 && (
        <CurriculumSection id="textbook" title="テキスト" description="分冊・章立てに沿った本文テキスト（各章の冒頭に要点まとめを収録）" count={textbookCount}>
          <CurriculumList blocks={chapters} numbered />
        </CurriculumSection>
      )}
      {mobileCareerAds[1]}
      {primaryGroup && (
        <DocSection
          group={{
            ...primaryGroup,
            title: '過去問',
            description: '年度別の第1次検定（問題A・問題B）と第2次検定',
            docs: primaryGroup.docs,
          }}
          layout="exam-table"
          secondaryDocs={secondaryYearDocs}
        />
      )}
      {secondaryTopicDocs.length > 0 && (
        <DocSection
          group={{
            key: 'secondary',
            title: '第2次検定 分野別対策',
            description: '経験記述・施工管理（コンクリート工・土工・品質管理・施工計画）の基礎と過去問',
            docs: secondaryTopicDocs,
          }}
        />
      )}
      <CareerSection
        featured={curriculum.career.featured}
        rest={curriculum.career.rest}
        description="年収・転職・キャリアパス・働き方の実務ガイド"
      />
    </>
  );
}

/** civil-construction-2: 受験ガイド＋分野別をリスト化、過去問は前期/後期テーブル維持（textbook 記事は無し） */
export function CivilConstruction2View({ groups, mobileCareerAds = [] }: { groups: DocGroup[]; mobileCareerAds?: ReactNode[] }) {
  const category = 'civil-construction-2';
  const guideGroup = groups.find(g => g.key === 'guide');
  const textbookGroup = groups.find(g => g.key === 'textbook');
  const primaryGroup = groups.find(g => g.key === 'primary');
  const secondaryGroup = groups.find(g => g.key === 'secondary');

  const curriculum = resolveCurriculum(category, guideGroup?.docs ?? []);
  const chapters = resolveTextbookChapters(category, textbookGroup?.docs ?? [], guideGroup?.docs ?? []);
  const examGuideDocs = [...(curriculum.examGuide?.docs ?? []), ...curriculum.unassigned];
  const fieldsCount = curriculum.fields?.blocks.reduce((n, b) => n + b.docs.length, 0) ?? 0;
  const textbookCount = chapters.reduce((n, c) => n + c.docs.length + c.intro.length, 0);

  const secondaryYearDocs = secondaryGroup?.docs.filter(d => /secondary-(r|h)\d+$/.test(d.slug || '')) || [];
  const secondaryTopicDocs = secondaryGroup?.docs.filter(d => !/secondary-(r|h)\d+$/.test(d.slug || '')) || [];

  return (
    <>
      {examGuideDocs.length > 0 && (
        <CurriculumSection id="guide" title={curriculum.examGuide?.title ?? '受験ガイド'} description={curriculum.examGuide?.description} count={examGuideDocs.length}>
          <CurriculumList blocks={[{ docs: examGuideDocs }]} />
        </CurriculumSection>
      )}
      {curriculum.fields && (
        <CurriculumSection id="fields" title={curriculum.fields.title} description={curriculum.fields.description} count={fieldsCount}>
          <CurriculumList blocks={curriculum.fields.blocks} />
        </CurriculumSection>
      )}
      {mobileCareerAds[0]}
      {chapters.length > 0 && (
        <CurriculumSection id="textbook" title="テキスト" description="章立てに沿った本文テキスト" count={textbookCount}>
          <CurriculumList blocks={chapters} numbered />
        </CurriculumSection>
      )}
      {mobileCareerAds[1]}
      {primaryGroup && (
        <DocSection
          group={{
            ...primaryGroup,
            title: '過去問',
            description: '年度別の第1次検定（前期・後期）と第2次検定',
            docs: primaryGroup.docs,
          }}
          layout="exam-table-2"
          secondaryDocs={secondaryYearDocs}
        />
      )}
      {secondaryTopicDocs.length > 0 && (
        <DocSection
          group={{
            key: 'secondary',
            title: '第2次検定 分野別対策',
            description: '経験記述・施工管理（コンクリート工・土工・品質管理・施工計画）の基礎と過去問（主任技術者視点）',
            docs: secondaryTopicDocs,
          }}
        />
      )}
      <CareerSection
        featured={curriculum.career.featured}
        rest={curriculum.career.rest}
        description="年収・転職・キャリアパス・働き方の実務ガイド"
      />
    </>
  );
}

/** concrete-chief-engineer / concrete-diagnostician: 受験ガイド＋テキスト章目次＋分野別過去問をリスト化（共用） */
export function ConcreteView({ groups }: { groups: DocGroup[] }) {
  const guideGroup = groups.find(g => g.key === 'guide');
  const textbookGroup = groups.find(g => g.key === 'textbook');
  const primaryGroup = groups.find(g => g.key === 'primary');
  // 共用 View なので category は実データ（各記事の category は同一）から取る
  const category = groups.flatMap(g => g.docs)[0]?.category ?? '';

  const curriculum = resolveCurriculum(category, guideGroup?.docs ?? []);
  const chapters = resolveTextbookChapters(category, textbookGroup?.docs ?? [], guideGroup?.docs ?? []);
  const examGuideDocs = [...(curriculum.examGuide?.docs ?? []), ...curriculum.unassigned];
  const textbookCount = chapters.reduce((n, c) => n + c.docs.length + c.intro.length, 0);

  return (
    <>
      {examGuideDocs.length > 0 && (
        <CurriculumSection id="guide" title={curriculum.examGuide?.title ?? '受験ガイド'} description={curriculum.examGuide?.description} count={examGuideDocs.length}>
          <CurriculumList blocks={[{ docs: examGuideDocs }]} />
        </CurriculumSection>
      )}
      {chapters.length > 0 && (
        <CurriculumSection id="textbook" title={textbookGroup?.title ?? 'テキスト'} description={textbookGroup?.description} count={textbookCount}>
          <CurriculumList blocks={chapters} numbered />
        </CurriculumSection>
      )}
      {primaryGroup && primaryGroup.docs.length > 0 && (
        <CurriculumSection id="primary" title={primaryGroup.title} description={primaryGroup.description} count={primaryGroup.docs.length}>
          <CurriculumList blocks={[{ docs: primaryGroup.docs }]} numbered />
        </CurriculumSection>
      )}
    </>
  );
}

/** pe-first-stage: 適性・基礎・専門マトリクス */
export function PeFirstStageView({ groups }: { groups: DocGroup[] }) {
  const primaryGroup = groups.find(g => g.title === getGroupLabel('pe-first-stage', 'primary'));
  return (
    <>
      {primaryGroup && (
        <DocSection group={primaryGroup} layout="pe-first-stage-table" />
      )}
    </>
  );
}

/** pe-comprehensive-management: ガイド・ピラー・過去問・キーワード索引導線 */
export function PeComprehensiveView({ groups, mobileCareerAds = [] }: { groups: DocGroup[]; mobileCareerAds?: ReactNode[] }) {
  const guideGroup = groups.find(g => g.title === getGroupLabel('pe-comprehensive-management', 'guide'));
  const pillarGroup = groups.find(g => g.title === getGroupLabel('pe-comprehensive-management', 'pillar'));
  const pastExamGroup = groups.find(g => g.title === getGroupLabel('pe-comprehensive-management', 'pastExam'));
  const keywordGroup = groups.find(g => g.title === getGroupLabel('pe-comprehensive-management', 'keyword'));
  const keywordCount = keywordGroup?.docs.length ?? 0;

  // guide をカード→受験ガイド＋論文対策のリストへ。pillar/pastExam/keyword 導線は現状維持。
  const curriculum = resolveCurriculum('pe-comprehensive-management', guideGroup?.docs ?? []);
  const examGuideDocs = [...(curriculum.examGuide?.docs ?? []), ...curriculum.unassigned];
  const fieldsCount = curriculum.fields?.blocks.reduce((n, b) => n + b.docs.length, 0) ?? 0;

  // essay-mlit-* 7 記事は 2026-05-18 撤回済み（旧分離ロジック削除）
  return (
    <>
      {examGuideDocs.length > 0 && (
        <CurriculumSection id="guide" title={curriculum.examGuide?.title ?? '受験ガイド'} description={curriculum.examGuide?.description} count={examGuideDocs.length}>
          <CurriculumList blocks={[{ docs: examGuideDocs }]} />
        </CurriculumSection>
      )}
      {curriculum.fields && (
        <CurriculumSection id="fields" title={curriculum.fields.title} description={curriculum.fields.description} count={fieldsCount}>
          <CurriculumList blocks={curriculum.fields.blocks} />
        </CurriculumSection>
      )}
      {mobileCareerAds[0]}
      {pillarGroup && <DocSection group={pillarGroup} />}
      {pastExamGroup && (
        <DocSection group={pastExamGroup} layout="pe-exam-table" />
      )}
      {/* キーワード索引へのナビゲーション（本体は /sitemap-keywords に移動） */}
      {keywordCount > 0 && (
        <section id="sec-keyword" className="scroll-mt-24">
          <div className="mb-6">
            <h2 className="font-serif text-[22px] sm:text-[26px] font-black text-[var(--ink)]">キーワードを探す</h2>
            <p className="text-[14px] text-[var(--ink-muted)] mt-1">
              5 管理 × 26 セクションで体系化された全 {keywordCount} キーワードの索引
            </p>
          </div>
          <Link
            href="/sitemap-keywords"
            className="group flex items-center gap-4 p-5 rounded-card-content border border-[var(--rule-soft)] bg-[var(--paper)] hover:border-[var(--accent)] hover:shadow-card-hover transition-all"
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-sm bg-[var(--accent)] flex items-center justify-center text-white font-bold text-lg">
              ≡
            </div>
            <div className="flex-1">
              <div className="font-bold text-lg text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors">
                キーワードを全件見る（{keywordCount} 件）
              </div>
              <div className="text-sm text-[var(--ink-muted)]">
                文部科学省「総合技術監理 キーワード集 2026」に基づくセクション別索引へ
              </div>
            </div>
            <span className="text-[var(--accent)] group-hover:translate-x-1 transition-transform" aria-hidden>›</span>
          </Link>
        </section>
      )}
    </>
  );
}

/** pe-construction: 受験ガイド＋論文の書き方をリスト化、キーワード・科目×年度マトリクスは維持 */
export function PeConstructionView({ groups }: { groups: DocGroup[] }) {
  const guideGroup = groups.find(g => g.key === 'guide');
  const keywordGroup = groups.find(g => g.key === 'keyword');
  const pastExamGroup = groups.find(g => g.key === 'pastExam');

  const curriculum = resolveCurriculum('pe-construction', guideGroup?.docs ?? []);
  const examGuideDocs = [...(curriculum.examGuide?.docs ?? []), ...curriculum.unassigned];
  const fieldsCount = curriculum.fields?.blocks.reduce((n, b) => n + b.docs.length, 0) ?? 0;

  return (
    <>
      {examGuideDocs.length > 0 && (
        <CurriculumSection id="guide" title={curriculum.examGuide?.title ?? '受験ガイド'} description={curriculum.examGuide?.description} count={examGuideDocs.length}>
          <CurriculumList blocks={[{ docs: examGuideDocs }]} />
        </CurriculumSection>
      )}
      {curriculum.fields && (
        <CurriculumSection id="fields" title={curriculum.fields.title} description={curriculum.fields.description} count={fieldsCount}>
          <CurriculumList blocks={curriculum.fields.blocks} />
        </CurriculumSection>
      )}
      {keywordGroup && <DocSection group={keywordGroup} />}
      {pastExamGroup && (
        <DocSection group={pastExamGroup} layout="pe-construction-exam-table" />
      )}
      <CareerSection
        featured={curriculum.career.featured}
        rest={curriculum.career.rest}
        description="建設部門技術士のキャリア・年収"
      />
    </>
  );
}
