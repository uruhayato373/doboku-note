import { type ReactNode } from 'react';
import Link from 'next/link';
import { getGroupLabel } from '@/lib/doc-classifier';
import { type DocGroup } from '@/lib/category-groups';
import { DocSection } from '@/components/category/CategorySections';
import { resolveCurriculum, resolveKeywordSection, resolveTextbookChapters } from '@/lib/category-curriculum';
import { CurriculumSection, CurriculumList, CareerSection } from '@/components/category/CurriculumSections';
import { KeywordSection } from '@/components/category/KeywordSections';
import { resolveCareerSmallBanner } from '@/config/affiliate-creatives';

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
        <CurriculumSection id="textbook" title="テキスト" description="分冊・章立てに沿った本文テキスト（章を開いて閲覧・各章の冒頭に要点まとめを収録）" count={textbookCount}>
          <CurriculumList blocks={chapters} numbered collapsible />
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
          layout="ogp-rows"
        />
      )}
      <CareerSection
        featured={curriculum.career.featured}
        rest={curriculum.career.rest}
        description="年収・転職・キャリアパス・働き方の実務ガイド"
        smallBanner={resolveCareerSmallBanner()}
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
          layout="ogp-rows"
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
export function ConcreteView({ groups, mobileCareerAds = [] }: { groups: DocGroup[]; mobileCareerAds?: ReactNode[] }) {
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
      {mobileCareerAds[0]}
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
      {mobileCareerAds[1]}
    </>
  );
}

/** civil-practice: 実務ノート 49 本を工種別ブロック（category-curriculum の fields）で束ねる。
 *  既定の DocSection はフラットなカード列（モバイル 9,700px・2026-09 監査）になるため専用 View にした。
 *  fields に無い記事は unassigned として末尾に必ず出す（silent drop 防止）。 */
export function PracticeView({ groups, mobileCareerAds = [] }: { groups: DocGroup[]; mobileCareerAds?: ReactNode[] }) {
  const guideGroup = groups.find(g => g.key === 'guide');
  const category = groups.flatMap(g => g.docs)[0]?.category ?? 'civil-practice';
  const curriculum = resolveCurriculum(category, guideGroup?.docs ?? []);
  const fieldsCount = curriculum.fields?.blocks.reduce((n, b) => n + b.docs.length, 0) ?? 0;
  const restDocs = [...(curriculum.examGuide?.docs ?? []), ...curriculum.unassigned];
  const others = groups.filter(g => g.key !== 'guide');
  return (
    <>
      {curriculum.fields && fieldsCount > 0 && (
        <CurriculumSection id="fields" title={curriculum.fields.title} description={curriculum.fields.description} count={fieldsCount}>
          <CurriculumList blocks={curriculum.fields.blocks} />
        </CurriculumSection>
      )}
      {restDocs.length > 0 && (
        <CurriculumSection id="guide" title="その他の実務ノート" count={restDocs.length}>
          <CurriculumList blocks={[{ docs: restDocs }]} />
        </CurriculumSection>
      )}
      {mobileCareerAds[0]}
      {others.map(group => (
        <DocSection key={group.title} group={group} />
      ))}
    </>
  );
}

/** pe-first-stage: 適性・基礎・専門マトリクス */
export function PeFirstStageView({ groups, mobileCareerAds = [] }: { groups: DocGroup[]; mobileCareerAds?: ReactNode[] }) {
  const primaryGroup = groups.find(g => g.title === getGroupLabel('pe-first-stage', 'primary'));
  return (
    <>
      <section className="card-surface-section mb-10 p-5 sm:p-6" aria-labelledby="pe1-free-quiz">
        <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">登録不要・無料</div>
        <h2 id="pe1-free-quiz" className="mt-1 font-serif text-[21px] sm:text-[24px] font-black text-[var(--ink)]">
          平成25〜令和7年度・全1,040問をその場で演習
        </h2>
        <p className="mt-2 text-[14px] leading-7 text-[var(--ink-body)]">
          基礎・適性・専門（建設部門）を、年度別・科目別・ランダムで即採点。間違えた問題だけの復習にも対応しています。
        </p>
        <Link
          href="/tools/kakomon-quiz/pe-first-stage"
          className="focus-ring mt-4 inline-flex rounded-card-content border border-[var(--accent)] bg-[var(--accent-fill)] px-4 py-2 text-sm font-bold text-[var(--accent)] hover:underline"
        >
          無料で過去問を解く →
        </Link>
      </section>
      {primaryGroup && (
        <DocSection group={primaryGroup} layout="pe-first-stage-table" />
      )}
      {/* セクションが1個のためテーブル後ろに転職枠を配置（モバイル・href のみ）。 */}
      {mobileCareerAds[0]}
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
            className="focus-ring card-surface-content group flex items-center gap-4 p-5 transition-[border-color,box-shadow] hover:border-[var(--accent)] hover:shadow-card-hover"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-card-inline bg-[var(--accent)] text-lg font-bold text-white">
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
export function PeConstructionView({ groups, mobileCareerAds = [] }: { groups: DocGroup[]; mobileCareerAds?: ReactNode[] }) {
  const guideGroup = groups.find(g => g.key === 'guide');
  const keywordGroup = groups.find(g => g.key === 'keyword');
  const pastExamGroup = groups.find(g => g.key === 'pastExam');

  const curriculum = resolveCurriculum('pe-construction', guideGroup?.docs ?? []);
  const examGuideDocs = [...(curriculum.examGuide?.docs ?? []), ...curriculum.unassigned];
  const fieldsCount = curriculum.fields?.blocks.reduce((n, b) => n + b.docs.length, 0) ?? 0;
  // キーワード 35 本はカードグリッド（12 行）ではなく 必須科目I ブロック＋科目×種別マトリクスで出す。
  // config（keywordSection）未定義なら null → 従来のカードグリッドへ fallback。
  const keywordSection = resolveKeywordSection('pe-construction', keywordGroup?.docs ?? []);

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
      {keywordGroup && (keywordSection ? (
        <KeywordSection section={keywordSection} title={keywordGroup.title} description={keywordGroup.description} />
      ) : (
        <DocSection group={keywordGroup} />
      ))}
      {pastExamGroup && (
        <DocSection group={pastExamGroup} layout="pe-construction-exam-table" />
      )}
      {mobileCareerAds[1]}
      <CareerSection
        featured={curriculum.career.featured}
        rest={curriculum.career.rest}
        description="建設部門技術士のキャリア・年収"
      />
    </>
  );
}
