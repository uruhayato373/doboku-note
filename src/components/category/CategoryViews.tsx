import { type ReactNode } from 'react';
import Link from 'next/link';
import { getGroupLabel } from '@/lib/doc-classifier';
import { type DocGroup } from '@/lib/category-groups';
import { DocCard, DocSection } from '@/components/category/CategorySections';

/** civil-construction-1: primary をテーブル、secondary の年度別を統合 */
export function CivilConstruction1View({ groups, mobileCareerAds = [] }: { groups: DocGroup[]; mobileCareerAds?: ReactNode[] }) {
  const guideGroup = groups.find(g => g.title === getGroupLabel('civil-construction-1', 'guide'));
  const textbookGroup = groups.find(g => g.title === getGroupLabel('civil-construction-1', 'textbook'));
  const primaryGroup = groups.find(g => g.title === getGroupLabel('civil-construction-1', 'primary'));
  const secondaryGroup = groups.find(g => g.title === getGroupLabel('civil-construction-1', 'secondary'));

  // secondary を年度別過去問と分野別に分離
  const secondaryYearDocs = secondaryGroup?.docs.filter(d =>
    /secondary-(r|h)\d+$/.test(d.slug || '')
  ) || [];
  const secondaryTopicDocs = secondaryGroup?.docs.filter(d =>
    !/secondary-(r|h)\d+$/.test(d.slug || '')
  ) || [];

  // 試験ガイドからキャリア・転職系を分離（ソート順は維持）
  const examGuideDocs = guideGroup?.docs.filter(d => !d.tags?.includes('career')) || [];
  const careerDocs = guideGroup?.docs.filter(d => d.tags?.includes('career')) || [];

  // テキストブックをエリア別にグループ化
  const TEXTBOOK_AREAS = [
    { label: '建設機械', min: 100, max: 149 },
    { label: '測量', min: 150, max: 169 },
    { label: '解体工事', min: 170, max: 179 },
    { label: '施工管理・施工計画', min: 200, max: 230 },
    { label: '工程管理', min: 250, max: 269 },
    { label: '品質管理', min: 300, max: 320 },
    { label: '関係法規', min: 400, max: 449 },
  ];
  const textbookAreas = textbookGroup ? TEXTBOOK_AREAS.map(area => ({
    ...area,
    docs: textbookGroup.docs.filter(d => {
      const order = d.textbook_order ?? 999;
      return order >= area.min && order <= area.max;
    }),
  })).filter(a => a.docs.length > 0) : [];

  return (
    <>
      {guideGroup && examGuideDocs.length > 0 && (
        <DocSection group={{ ...guideGroup, docs: examGuideDocs }} />
      )}
      {mobileCareerAds[0]}
      {textbookGroup && (
        <section id={`sec-${textbookGroup.key}`} className="scroll-mt-24">
          <div className="mb-6">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <h2 className="font-serif text-[22px] sm:text-[26px] font-black text-[var(--ink)]">{textbookGroup.title}</h2>
              <span className="font-mono text-[11px] text-[var(--ink-muted)]">{textbookGroup.docs.length} docs</span>
            </div>
            <p className="text-[14px] text-[var(--ink-muted)] mt-1">{textbookGroup.description}</p>
          </div>
          <div className="space-y-8">
            {textbookAreas.map(area => (
              <div key={area.label}>
                <h3 className="font-serif text-lg font-bold text-[var(--ink)] mb-3 border-b border-[var(--rule-soft)] pb-2">{area.label}</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {area.docs.map(doc => (
                    <DocCard key={doc.slug} doc={doc} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
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
      {careerDocs.length > 0 && (
        <DocSection
          group={{
            key: 'career',
            title: 'キャリア・転職',
            description: '年収・転職・キャリアパス・働き方の実務ガイド',
            docs: careerDocs,
          }}
        />
      )}
    </>
  );
}

/** civil-construction-2: 2級向け、前期/後期テーブル */
export function CivilConstruction2View({ groups, mobileCareerAds = [] }: { groups: DocGroup[]; mobileCareerAds?: ReactNode[] }) {
  const guideGroup = groups.find(g => g.title === getGroupLabel('civil-construction-2', 'guide'));
  const textbookGroup = groups.find(g => g.title === getGroupLabel('civil-construction-2', 'textbook'));
  const primaryGroup = groups.find(g => g.title === getGroupLabel('civil-construction-2', 'primary'));
  const secondaryGroup = groups.find(g => g.title === getGroupLabel('civil-construction-2', 'secondary'));

  const secondaryYearDocs = secondaryGroup?.docs.filter(d =>
    /secondary-(r|h)\d+$/.test(d.slug || '')
  ) || [];
  const secondaryTopicDocs = secondaryGroup?.docs.filter(d =>
    !/secondary-(r|h)\d+$/.test(d.slug || '')
  ) || [];

  // 試験ガイドからキャリア・転職系を分離（ソート順は維持）
  const examGuideDocs = guideGroup?.docs.filter(d => !d.tags?.includes('career')) || [];
  const careerDocs = guideGroup?.docs.filter(d => d.tags?.includes('career')) || [];

  return (
    <>
      {guideGroup && examGuideDocs.length > 0 && (
        <DocSection group={{ ...guideGroup, docs: examGuideDocs }} />
      )}
      {mobileCareerAds[0]}
      {textbookGroup && <DocSection group={textbookGroup} />}
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
      {careerDocs.length > 0 && (
        <DocSection
          group={{
            key: 'career',
            title: 'キャリア・転職',
            description: '年収・転職・キャリアパス・働き方の実務ガイド',
            docs: careerDocs,
          }}
        />
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

  // essay-mlit-* 7 記事は 2026-05-18 撤回済み（旧分離ロジック削除）
  return (
    <>
      {guideGroup && guideGroup.docs.length > 0 && <DocSection group={guideGroup} />}
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

/** pe-construction: ガイド・キーワード・科目×年度マトリクス */
export function PeConstructionView({ groups }: { groups: DocGroup[] }) {
  const guideGroup = groups.find(g => g.title === getGroupLabel('pe-construction', 'guide'));
  const keywordGroup = groups.find(g => g.title === getGroupLabel('pe-construction', 'keyword'));
  const pastExamGroup = groups.find(g => g.title === getGroupLabel('pe-construction', 'pastExam'));
  return (
    <>
      {guideGroup && <DocSection group={guideGroup} />}
      {keywordGroup && <DocSection group={keywordGroup} />}
      {pastExamGroup && (
        <DocSection group={pastExamGroup} layout="pe-construction-exam-table" />
      )}
    </>
  );
}
