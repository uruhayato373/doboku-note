import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getAllCategories, getCategoryBySlug } from '@/lib/categories';
import { getDocsMetaByCategory, type DocMeta } from '@/lib/docs';
import { classifyDoc, getGroupOrder, getGroupLabel, type DocGroupKey } from '@/lib/doc-classifier';
import peChaptersData from '@/config/pe-chapters.json';
import type { PeChapter } from '@/config/pe-chapters';

const PE_CHAPTERS: PeChapter[] = peChaptersData.chapters;

export async function generateStaticParams() {
  const categories = getAllCategories();
  return categories.map(cat => ({
    slug: cat.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) {
    return {
      title: 'カテゴリが見つかりません | doboku-note',
    };
  }
  return {
    title: `${cat.label} | doboku-note`,
    description: cat.subtitle,
  };
}

type DocGroup = {
  title: string;
  description: string;
  docs: DocMeta[];
};

const GROUP_DESCRIPTIONS: Record<string, Record<string, string>> = {
  'civil-construction-1': {
    guide: '出題傾向の分析・得点戦略・分野別の重要ポイント',
    textbook: '試験テキスト全文（土木一般編・施工管理法規編）の体系的な解説',
    primary: '年度別の過去問と解説（問題A: 土木一般・専門土木・法規 / 問題B: 施工管理）',
    secondary: '経験記述・施工管理（コンクリート工・土工・品質管理・施工計画）の基礎と過去問',
  },
  'pe-comprehensive-management': {
    guide: '試験の構成・出題傾向・学習ガイド',
    pastExam: '年度別の択一式・記述式問題と解説',
    section: '総合技術監理キーワード集に基づくセクション要約',
    keyword: '頻出キーワードの解説',
  },
};

/** Sort functions per group */
function sortDocs(docs: DocMeta[], group: DocGroupKey, category: string) {
  if (category === 'civil-construction-1') {
    if (group === 'guide') {
      docs.sort((a, b) => {
        if (a.slug?.includes('strategy')) return -1;
        if (b.slug?.includes('strategy')) return 1;
        return (a.title || '').localeCompare(b.title || '', 'ja');
      });
    } else if (group === 'primary') {
      docs.sort((a, b) => {
        const slugA = a.slug || '';
        const slugB = b.slug || '';
        const yearA = slugA.match(/(r|h)(\d+)/);
        const yearB = slugB.match(/(r|h)(\d+)/);
        if (yearA && yearB) {
          const valA = (yearA[1] === 'r' ? 100 : 0) + parseInt(yearA[2]!);
          const valB = (yearB[1] === 'r' ? 100 : 0) + parseInt(yearB[2]!);
          if (valB !== valA) return valB - valA;
        }
        return slugA.localeCompare(slugB);
      });
    } else if (group === 'textbook') {
      docs.sort((a, b) => {
        const orderA = a.textbook_order ?? 999;
        const orderB = b.textbook_order ?? 999;
        return orderA - orderB;
      });
    } else if (group === 'secondary') {
      docs.sort((a, b) => {
        const slugA = a.slug || '';
        const slugB = b.slug || '';
        const topicA = slugA.replace(/.*secondary-/, '').replace(/-(basics|past-problems|guide|examples)$/, '');
        const topicB = slugB.replace(/.*secondary-/, '').replace(/-(basics|past-problems|guide|examples)$/, '');
        if (topicA !== topicB) return topicA.localeCompare(topicB);
        const isBasicsA = slugA.endsWith('-basics') || slugA.endsWith('-guide') ? 0 : 1;
        const isBasicsB = slugB.endsWith('-basics') || slugB.endsWith('-guide') ? 0 : 1;
        return isBasicsA - isBasicsB;
      });
    }
  } else if (category === 'pe-comprehensive-management') {
    if (group === 'pastExam') {
      docs.sort((a, b) => {
        const yearA = a.slug?.match(/r(\d+)/)?.[1] || '0';
        const yearB = b.slug?.match(/r(\d+)/)?.[1] || '0';
        if (yearB !== yearA) return parseInt(yearB) - parseInt(yearA);
        const isPrimaryA = a.tags?.includes('択一式') ? 0 : 1;
        const isPrimaryB = b.tags?.includes('択一式') ? 0 : 1;
        return isPrimaryA - isPrimaryB;
      });
    } else if (group === 'section') {
      docs.sort((a, b) => {
        const numA = parseFloat(a.section || '99');
        const numB = parseFloat(b.section || '99');
        return numA - numB;
      });
    } else if (group === 'keyword') {
      docs.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ja'));
    }
  }
}

/**
 * Group docs using the shared classifier logic.
 */
function groupDocs(docs: DocMeta[], category: string): DocGroup[] {
  const buckets = new Map<DocGroupKey, DocMeta[]>();

  for (const doc of docs) {
    const group = classifyDoc(doc);
    if (!buckets.has(group)) buckets.set(group, []);
    buckets.get(group)!.push(doc);
  }

  const order = getGroupOrder(category);
  const result: DocGroup[] = [];

  for (const groupKey of order) {
    const groupDocs = buckets.get(groupKey);
    if (!groupDocs || groupDocs.length === 0) continue;

    sortDocs(groupDocs, groupKey, category);

    result.push({
      title: getGroupLabel(category, groupKey),
      description: GROUP_DESCRIPTIONS[category]?.[groupKey] ?? '',
      docs: groupDocs,
    });
  }

  return result;
}

function DocCard({ doc }: { doc: DocMeta }) {
  return (
    <Link
      href={`/docs/${doc.slug}`}
      className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all"
    >
      <div className="flex flex-col gap-2 h-full">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2">
          {doc.title}
        </h3>
        {doc.description && (
          <p className="text-[15px] text-gray-600 dark:text-gray-400 line-clamp-2 flex-grow">
            {doc.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-700">
          {(doc.tags || []).slice(0, 2).map(tag => (
            <span
              key={tag}
              className="inline-block text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
            >
              {tag}
            </span>
          ))}
          {doc.tags && doc.tags.length > 2 && (
            <span className="text-xs text-gray-500 dark:text-gray-500">
              +{doc.tags.length - 2}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * 年度コードから表示名に変換（例: "r07" → "令和7年度", "h26" → "平成26年度"）
 */
function yearLabel(code: string): string {
  const match = code.match(/^(r|h)(\d+)$/);
  if (!match) return code;
  const era = match[1] === 'r' ? '令和' : '平成';
  return `${era}${match[2]}年度`;
}

/**
 * 第1次検定の過去問をテーブル形式で表示
 * 年度ごとに問題A・問題Bをまとめる
 */
function PrimaryExamTable({ docs, secondaryDocs = [] }: { docs: DocMeta[]; secondaryDocs?: DocMeta[] | undefined }) {
  // 年度コードでグループ化
  const yearMap = new Map<string, { a?: DocMeta; b?: DocMeta }>();
  for (const doc of docs) {
    const match = doc.slug?.match(/(r|h)(\d+)-(a|b)$/);
    if (!match) continue;
    const yearCode = `${match[1]}${match[2]}`;
    const part = match[3] as 'a' | 'b';
    if (!yearMap.has(yearCode)) yearMap.set(yearCode, {});
    yearMap.get(yearCode)![part] = doc;
  }

  // 第2次検定のマップ
  const secondaryMap = new Map<string, DocMeta>();
  if (secondaryDocs) {
    for (const doc of secondaryDocs) {
      const match = doc.slug?.match(/(r|h)(\d+)$/);
      if (match) {
        secondaryMap.set(`${match[1]}${match[2]}`, doc);
      }
    }
  }

  // 年度ソート（新しい順）
  const years = Array.from(yearMap.keys()).sort((a, b) => {
    const valA = (a.startsWith('r') ? 100 : 0) + parseInt(a.slice(1));
    const valB = (b.startsWith('r') ? 100 : 0) + parseInt(b.slice(1));
    return valB - valA;
  });

  const hasSecondary = secondaryMap.size > 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">年度</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">第1次 問題A</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">第1次 問題B</th>
            {hasSecondary && (
              <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">第2次検定</th>
            )}
          </tr>
        </thead>
        <tbody>
          {years.map(yearCode => {
            const pair = yearMap.get(yearCode)!;
            const secondary = secondaryMap.get(yearCode);
            return (
              <tr key={yearCode} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{yearLabel(yearCode)}</td>
                <td className="py-3 px-4 text-center">
                  {pair.a ? (
                    <Link href={`/docs/${pair.a.slug}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                      問題A
                    </Link>
                  ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>
                <td className="py-3 px-4 text-center">
                  {pair.b ? (
                    <Link href={`/docs/${pair.b.slug}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                      問題B
                    </Link>
                  ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>
                {hasSecondary && (
                  <td className="py-3 px-4 text-center">
                    {secondary ? (
                      <Link href={`/docs/${secondary.slug}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                        第2次
                      </Link>
                    ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * PE過去問をテーブル形式で表示
 * 年度ごとに択一式・記述式をまとめる
 */
function PeExamTable({ docs }: { docs: DocMeta[] }) {
  const yearMap = new Map<string, { primary?: DocMeta; secondary?: DocMeta }>();
  for (const doc of docs) {
    const match = doc.slug?.match(/(r|h)(\d+)-(primary|secondary)$/);
    if (!match) continue;
    const yearCode = `${match[1]}${match[2]}`;
    const type = match[3] as 'primary' | 'secondary';
    if (!yearMap.has(yearCode)) yearMap.set(yearCode, {});
    yearMap.get(yearCode)![type] = doc;
  }

  const toWesternYear = (code: string) => {
    const era = code[0];
    const num = parseInt(code.slice(1));
    return era === 'r' ? 2018 + num : 1988 + num;
  };

  const years = Array.from(yearMap.keys()).sort((a, b) => {
    return toWesternYear(b) - toWesternYear(a);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">年度</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">択一式</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">記述式</th>
          </tr>
        </thead>
        <tbody>
          {years.map(yearCode => {
            const pair = yearMap.get(yearCode)!;
            const era = yearCode[0];
            const yearNum = parseInt(yearCode.slice(1));
            const label = era === 'r'
              ? (yearNum === 1 ? '令和元年度' : `令和${yearNum}年度`)
              : `平成${yearNum}年度`;
            return (
              <tr key={yearCode} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{label}</td>
                <td className="py-3 px-4 text-center">
                  {pair.primary ? (
                    <Link href={`/docs/${pair.primary.slug}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                      択一式
                    </Link>
                  ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>
                <td className="py-3 px-4 text-center">
                  {pair.secondary ? (
                    <Link href={`/docs/${pair.secondary.slug}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                      記述式
                    </Link>
                  ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * PE セクション別ツリー表示
 * キーワード集の5管理体系に基づきキーワードをグルーピング
 */
function PeSectionTree({ sectionDocs, keywordDocs }: { sectionDocs: DocMeta[]; keywordDocs: DocMeta[] }) {
  // セクションdigest の slug → DocMeta マップ（例: "section-3-1-human-behavior" → Doc）
  const digestMap = new Map<string, DocMeta>();
  for (const doc of sectionDocs) {
    const sec = doc.section; // "3.1" 等
    if (sec) digestMap.set(sec, doc);
  }

  // キーワードをセクション番号でグルーピング
  const keywordsBySection = new Map<string, DocMeta[]>();
  const unmapped: DocMeta[] = [];
  for (const doc of keywordDocs) {
    const sec = doc.section as string | undefined;
    if (sec) {
      if (!keywordsBySection.has(sec)) keywordsBySection.set(sec, []);
      keywordsBySection.get(sec)!.push(doc);
    } else {
      unmapped.push(doc);
    }
  }

  return (
    <div className="space-y-10">
      {PE_CHAPTERS.map(chapter => {
        // この章にコンテンツがあるか確認
        const hasContent = chapter.sections.some(sec =>
          digestMap.has(sec.id) || keywordsBySection.has(sec.id)
        );
        if (!hasContent) return null;

        return (
          <div key={chapter.id}>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">
              {chapter.title}
            </h3>
            <div className="space-y-3 ml-2">
              {chapter.sections.map(sec => {
                const digest = digestMap.get(sec.id);
                const keywords = keywordsBySection.get(sec.id) || [];
                if (!digest && keywords.length === 0) return null;

                return (
                  <div key={sec.id} className="border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                    {/* セクションタイトル（digestがあればリンク） */}
                    <div className="flex items-center gap-2 mb-1">
                      {digest ? (
                        <Link
                          href={`/docs/${digest.slug}`}
                          className="text-base font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                        >
                          {sec.title}
                        </Link>
                      ) : (
                        <span className="text-base font-semibold text-gray-700 dark:text-gray-300">{sec.title}</span>
                      )}
                    </div>
                    {/* キーワードリスト */}
                    {keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 ml-9 mt-1">
                        {keywords
                          .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ja'))
                          .map(kw => (
                          <Link
                            key={kw.slug}
                            href={`/docs/${kw.slug}`}
                            className="text-base px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {kw.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* 未分類キーワード */}
      {unmapped.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4">その他</h3>
          <div className="flex flex-wrap gap-2 ml-2">
            {unmapped
              .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ja'))
              .map(kw => (
              <Link
                key={kw.slug}
                href={`/docs/${kw.slug}`}
                className="text-base px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {kw.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocSection({ group, layout, secondaryDocs }: { group: DocGroup; layout?: 'cards' | 'exam-table' | 'pe-exam-table'; secondaryDocs?: DocMeta[] | undefined }) {
  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{group.title}</h2>
        <p className="text-base text-gray-500 dark:text-gray-400 mt-1">{group.description}</p>
        <span className="text-sm text-gray-400 dark:text-gray-500">{group.docs.length} 件</span>
      </div>
      {layout === 'exam-table' ? (
        <PrimaryExamTable docs={group.docs} secondaryDocs={secondaryDocs} />
      ) : layout === 'pe-exam-table' ? (
        <PeExamTable docs={group.docs} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {group.docs.map(doc => (
            <DocCard key={doc.slug} doc={doc} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);

  if (!cat) {
    notFound();
  }

  const allDocs = await getDocsMetaByCategory(slug);
  const docs = allDocs.filter(d => d.published !== false);

  const groups = (slug === 'civil-construction-1' || slug === 'pe-comprehensive-management')
    ? groupDocs(docs, slug)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-300">
      <Header />

      <main className="flex-grow">
        {/* Category Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 border-b border-blue-100 dark:border-gray-700 py-12 px-6">
          <div className="max-w-[1200px] mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
              {cat.label}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">{cat.subtitle}</p>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-6 py-12 text-[17px] leading-[1.9]">
          {docs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                このカテゴリにはまだコンテンツがありません。
              </p>
            </div>
          ) : groups ? (
            <div className="space-y-16">
              {slug === 'civil-construction-1' ? (
                /* civil-construction-1: primary をテーブル、secondary の年度別を統合 */
                (() => {
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

                  return (
                    <>
                      {guideGroup && <DocSection group={guideGroup} />}
                      {textbookGroup && <DocSection group={textbookGroup} />}
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
                            title: '第2次検定 分野別対策',
                            description: '経験記述・施工管理（コンクリート工・土工・品質管理・施工計画）の基礎と過去問',
                            docs: secondaryTopicDocs,
                          }}
                        />
                      )}
                    </>
                  );
                })()
              ) : slug === 'pe-comprehensive-management' ? (
                (() => {
                  const guideGroup = groups.find(g => g.title === getGroupLabel('pe-comprehensive-management', 'guide'));
                  const pastExamGroup = groups.find(g => g.title === getGroupLabel('pe-comprehensive-management', 'pastExam'));
                  const sectionGroup = groups.find(g => g.title === getGroupLabel('pe-comprehensive-management', 'section'));
                  const keywordGroup = groups.find(g => g.title === getGroupLabel('pe-comprehensive-management', 'keyword'));

                  // キーワード集2026を分離（セクションツリーの「その他」から除外）
                  const keyword2026 = keywordGroup?.docs.find(d => d.slug === 'pe-comprehensive-management-keyword-2026');
                  const keywordDocsFiltered = keywordGroup?.docs.filter(d => d.slug !== 'pe-comprehensive-management-keyword-2026') || [];

                  return (
                    <>
                      {guideGroup && <DocSection group={guideGroup} />}
                      {pastExamGroup && (
                        <DocSection group={pastExamGroup} layout="pe-exam-table" />
                      )}
                      {/* セクション別解説 + キーワードを統合ツリー表示 */}
                      {(sectionGroup || keywordGroup) && (
                        <section>
                          <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">セクション別解説・キーワード</h2>
                            <p className="text-base text-gray-500 dark:text-gray-400 mt-1">
                              <a href="https://www.mext.go.jp/b_menu/shingi/gijyutu/gijyutu7/toushin/1411203_00007.htm" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">文部科学省「総合技術監理 キーワード集 2026」</a>に基づき、5管理分野の体系で整理しています
                            </p>
                          </div>
                          {/* キーワード集 2026 全文リンク */}
                          {keyword2026 && (
                            <Link
                              href={`/docs/${keyword2026.slug}`}
                              className="group flex items-center gap-4 mb-10 p-5 rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all"
                            >
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                K
                              </div>
                              <div>
                                <div className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                  {keyword2026.title}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  文部科学省公開PDFをWeb上で閲覧・検索できるようにしたものです
                                </div>
                              </div>
                            </Link>
                          )}
                          <PeSectionTree
                            sectionDocs={sectionGroup?.docs || []}
                            keywordDocs={keywordDocsFiltered}
                          />
                        </section>
                      )}
                    </>
                  );
                })()
              ) : (
                groups.map(group => (
                  <DocSection key={group.title} group={group} />
                ))
              )}
            </div>
          ) : (
            /* Default flat grid for other categories */
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {docs.map(doc => (
                <DocCard key={doc.slug} doc={doc} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
