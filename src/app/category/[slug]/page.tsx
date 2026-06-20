import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getAllCategories, getCategoryBySlug } from '@/lib/categories';
import { getDocsMetaByCategory, type DocMeta } from '@/lib/docs';
import { classifyDoc, getGroupOrder, getGroupLabel, type DocGroupKey } from '@/lib/doc-classifier';
import MagazineInlineCard from '@/components/ui/MagazineInlineCard';
import MagazineSidebarPromoCard from '@/components/ui/MagazineSidebarPromoCard';
import { resolveCategoryMagazines } from '@/lib/magazine-placement';
import { getMagazine, buildMagazineUrl } from '@/lib/note-magazines';
import SidebarAdBanner from '@/components/ui/SidebarAdBanner';
import { resolveCategoryCareerAd } from '@/config/affiliate-creatives';

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
      title: 'カテゴリが見つかりません',
    };
  }
  // SEO description は cat.description（50〜160 文字）を優先、未指定なら subtitle に fallback。
  // UI の <p> は subtitle を使うため、SEO 用の description と分離している。
  return {
    title: cat.label,
    description: cat.description ?? cat.subtitle,
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
  'civil-construction-2': {
    guide: '出題傾向の分析・得点戦略・分野別の基礎ポイント（2級向け）',
    textbook: '試験テキスト・基準類の解説（将来追加予定）',
    primary: '年度別の過去問と解説（前期: 6月実施・後期: 10月実施）',
    secondary: '経験記述・施工管理（コンクリート工・土工・品質管理・施工計画）の基礎と過去問（主任技術者視点）',
  },
  'pe-first-stage': {
    primary: '年度別の適性科目・基礎科目・専門科目（建設部門）全問解説',
  },
  'pe-comprehensive-management': {
    guide: '試験の構成・出題傾向・学習ガイド',
    pillar: '5 管理（経済性 / 人的資源 / 情報 / 安全 / 社会環境）の体系学習ガイド',
    pastExam: '年度別の択一式・記述式問題と解説',
    keyword: 'キーワード解説',
  },
  'pe-construction': {
    guide: '試験制度・勉強法・答案の書き方・業務経歴票の作り方',
    keyword: '必須科目Iの論点キーワードと選択科目別の出題テーマ分析（R01〜R07）',
    pastExam: '令和元〜7年度の必須科目I・選択科目（11科目）の記述式問題文',
  },
  'concrete-chief-engineer': {
    guide: '試験概要・出題傾向・小論文対策',
    textbook: '8分野（材料・性質・耐久性・配合設計・製造品質管理・施工・製品・構造設計）の体系的な解説',
    primary: '分野別の四肢択一 過去問と解説',
  },
  'concrete-diagnostician': {
    guide: '試験概要・出題傾向・記述式（問題A/B）対策',
    textbook: '劣化機構・調査・診断評価・補修・補強・維持管理の体系的な解説',
    primary: '分野別の四肢択一 過去問と解説',
  },
};

/** Sort functions per group */
function sortDocs(docs: DocMeta[], group: DocGroupKey, category: string) {
  if (category === 'civil-construction-1' || category === 'civil-construction-2') {
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
  } else if (category === 'concrete-chief-engineer' || category === 'concrete-diagnostician') {
    if (group === 'guide') {
      docs.sort((a, b) => {
        const orderA = a.guide_order ?? 999;
        const orderB = b.guide_order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.title || '').localeCompare(b.title || '', 'ja');
      });
    } else if (group === 'primary' || group === 'textbook') {
      docs.sort((a, b) => {
        const sa = parseFloat((a.section as string | undefined) ?? '99');
        const sb = parseFloat((b.section as string | undefined) ?? '99');
        return sa - sb;
      });
    }
  } else if (category === 'pe-first-stage') {
    if (group === 'primary') {
      docs.sort((a, b) => {
        const yearA = a.slug?.match(/(r|h)(\d+)/);
        const yearB = b.slug?.match(/(r|h)(\d+)/);
        if (yearA && yearB) {
          const valA = (yearA[1] === 'r' ? 100 : 0) + parseInt(yearA[2]!);
          const valB = (yearB[1] === 'r' ? 100 : 0) + parseInt(yearB[2]!);
          return valB - valA;
        }
        return 0;
      });
    }
  } else if (category === 'pe-comprehensive-management') {
    if (group === 'guide') {
      docs.sort((a, b) => {
        const orderA = a.guide_order ?? 999;
        const orderB = b.guide_order ?? 999;
        return orderA - orderB;
      });
    } else if (group === 'pillar') {
      docs.sort((a, b) => {
        const sa = parseFloat((a.section as string | undefined) ?? '99');
        const sb = parseFloat((b.section as string | undefined) ?? '99');
        return sa - sb;
      });
    } else if (group === 'pastExam') {
      docs.sort((a, b) => {
        const yearA = a.slug?.match(/r(\d+)/)?.[1] || '0';
        const yearB = b.slug?.match(/r(\d+)/)?.[1] || '0';
        if (yearB !== yearA) return parseInt(yearB) - parseInt(yearA);
        const isPrimaryA = a.tags?.includes('択一式') ? 0 : 1;
        const isPrimaryB = b.tags?.includes('択一式') ? 0 : 1;
        return isPrimaryA - isPrimaryB;
      });
    } else if (group === 'keyword') {
      docs.sort((a, b) => {
        // section フィールドがあるものは section番号順、なければ title 50音順
        const numA = parseFloat(a.section || '99');
        const numB = parseFloat(b.section || '99');
        if (numA !== numB) return numA - numB;
        return (a.title || '').localeCompare(b.title || '', 'ja');
      });
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
  const displayTitle = doc.shortTitle || doc.title;
  return (
    <Link
      href={`/docs/${doc.slug}`}
      className="group relative overflow-hidden rounded-card-content border border-[var(--rule-soft)] bg-[var(--paper)] p-5 hover:border-[var(--accent)] hover:shadow-soft transition-all"
    >
      <div className="flex flex-col gap-1 h-full">
        <h3 className="font-serif text-lg font-bold text-[var(--ink)] group-hover:text-[var(--accent)] line-clamp-2 transition-colors">
          {displayTitle}
        </h3>
        {doc.subtitle && (
          <p className="text-sm text-[var(--ink-muted)] line-clamp-2">
            {doc.subtitle}
          </p>
        )}
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
 * 第1次検定の過去問をテーブル形式で表示（2級向け、前期/後期）
 * 年度ごとに前期・後期・第2次をまとめる
 */
function PrimaryExamTable2({ docs, secondaryDocs = [] }: { docs: DocMeta[]; secondaryDocs?: DocMeta[] | undefined }) {
  // 年度コードでグループ化
  const yearMap = new Map<string, { zenki?: DocMeta; kouki?: DocMeta }>();
  for (const doc of docs) {
    const match = doc.slug?.match(/(r|h)(\d+)-(zenki|kouki)$/);
    if (!match) continue;
    const yearCode = `${match[1]}${match[2]}`;
    const part = match[3] as 'zenki' | 'kouki';
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
            <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">第1次 前期（6月）</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">第1次 後期（10月）</th>
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
                  {pair.zenki ? (
                    <Link href={`/docs/${pair.zenki.slug}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                      前期
                    </Link>
                  ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>
                <td className="py-3 px-4 text-center">
                  {pair.kouki ? (
                    <Link href={`/docs/${pair.kouki.slug}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                      後期
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
 * 技術士第一次試験の過去問をテーブル形式で表示
 * 年度ごとに適性科目・基礎科目・専門科目（建設部門）をまとめる
 */
function PeFirstStageExamTable({ docs }: { docs: DocMeta[] }) {
  const yearMap = new Map<string, { aptitude?: DocMeta; basic?: DocMeta; construction?: DocMeta }>();
  for (const doc of docs) {
    const match = doc.slug?.match(/(r|h)(\d+)-(aptitude|basic|construction)$/);
    if (!match) continue;
    const yearCode = `${match[1]}${match[2]}`;
    const type = match[3] as 'aptitude' | 'basic' | 'construction';
    if (!yearMap.has(yearCode)) yearMap.set(yearCode, {});
    yearMap.get(yearCode)![type] = doc;
  }

  const years = Array.from(yearMap.keys()).sort((a, b) => {
    const valA = (a.startsWith('r') ? 100 : 0) + parseInt(a.slice(1));
    const valB = (b.startsWith('r') ? 100 : 0) + parseInt(b.slice(1));
    return valB - valA;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200 dark:border-gray-700">
            <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">年度</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">適性科目</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">基礎科目</th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">専門科目（建設）</th>
          </tr>
        </thead>
        <tbody>
          {years.map(yearCode => {
            const row = yearMap.get(yearCode)!;
            return (
              <tr key={yearCode} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{yearLabel(yearCode)}</td>
                <td className="py-3 px-4 text-center">
                  {row.aptitude ? (
                    <Link href={`/docs/${row.aptitude.slug}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                      適性科目
                    </Link>
                  ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>
                <td className="py-3 px-4 text-center">
                  {row.basic ? (
                    <Link href={`/docs/${row.basic.slug}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                      基礎科目
                    </Link>
                  ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                </td>
                <td className="py-3 px-4 text-center">
                  {row.construction ? (
                    <Link href={`/docs/${row.construction.slug}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">
                      専門科目
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
 * 技術士第二次試験（建設部門）の過去問を 科目 × 年度 のマトリクスで表示。
 * 行 = 必須科目I + 11 選択科目、列 = 令和元〜7年度。受験者は「必須 + 自分の選択科目1つ」を
 * 年度横断で追うため、年度×2-3列の他資格テーブルではなく専用マトリクスにする。
 */
const PE_CONSTRUCTION_SUBJECTS: { key: string; label: string }[] = [
  { key: 'required', label: '必須科目I' },
  { key: 'geotechnical', label: '土質及び基礎' },
  { key: 'steel-concrete', label: '鋼構造及びコンクリート' },
  { key: 'urban-planning', label: '都市及び地方計画' },
  { key: 'river-coast', label: '河川、砂防及び海岸・海洋' },
  { key: 'port-airport', label: '港湾及び空港' },
  { key: 'power-civil', label: '電力土木' },
  { key: 'road', label: '道路' },
  { key: 'railway', label: '鉄道' },
  { key: 'tunnel', label: 'トンネル' },
  { key: 'construction-planning', label: '施工計画、施工設備及び積算' },
  { key: 'environment', label: '建設環境' },
];

function PeConstructionExamTable({ docs }: { docs: DocMeta[] }) {
  // 科目key → 年度code → Doc
  const map = new Map<string, Map<string, DocMeta>>();
  const yearSet = new Set<string>();
  for (const doc of docs) {
    const m = doc.slug?.match(/r(\d+)-([a-z-]+)$/);
    if (!m) continue;
    const yearCode = `r${m[1]}`;
    const subject = m[2]!;
    yearSet.add(yearCode);
    if (!map.has(subject)) map.set(subject, new Map());
    map.get(subject)!.set(yearCode, doc);
  }

  // 年度は新しい順（令和7 → 令和元）
  const years = Array.from(yearSet).sort((a, b) => parseInt(b.slice(1)) - parseInt(a.slice(1)));
  const colLabel = (code: string) => {
    const num = parseInt(code.slice(1));
    return num === 1 ? '令和元' : `令和${num}`;
  };

  // 定義順の科目のうちデータが存在するものだけ
  const rows = PE_CONSTRUCTION_SUBJECTS.filter(s => map.has(s.key));

  return (
    <>
      {/* モバイル: 科目カード縦積み + 年度ボタングリッド（8列テーブルの横スクロールを回避） */}
      <div className="zenn-desktop:hidden space-y-4">
        {rows.map(subject => {
          const yearMap = map.get(subject.key)!;
          return (
            <div key={subject.key} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">{subject.label}</h4>
              <div className="flex flex-wrap gap-2">
                {years.map(y => {
                  const doc = yearMap.get(y);
                  return doc ? (
                    <Link
                      key={y}
                      href={`/docs/${doc.slug}`}
                      className="inline-flex items-center rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      {colLabel(y)}
                    </Link>
                  ) : null;
                })}
              </div>
            </div>
          );
        })}
      </div>
      {/* デスクトップ: 現状マトリクス */}
      <div className="hidden zenn-desktop:block overflow-x-auto">
        <table className="w-full text-base border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">科目</th>
              {years.map(y => (
                <th key={y} className="text-center py-3 px-3 font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">{colLabel(y)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(subject => {
              const yearMap = map.get(subject.key)!;
              return (
                <tr key={subject.key} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{subject.label}</td>
                  {years.map(y => {
                    const doc = yearMap.get(y);
                    return (
                      <td key={y} className="py-3 px-3 text-center">
                        {doc ? (
                          <Link href={`/docs/${doc.slug}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline">問題</Link>
                        ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DocSection({ group, layout, secondaryDocs }: { group: DocGroup; layout?: 'cards' | 'exam-table' | 'exam-table-2' | 'pe-exam-table' | 'pe-first-stage-table' | 'pe-construction-exam-table'; secondaryDocs?: DocMeta[] | undefined }) {
  return (
    <section>
      <div className="mb-6">
        <div className="flex items-baseline justify-between gap-2 flex-wrap">
          <h2 className="font-serif text-[22px] sm:text-[26px] font-black text-[var(--ink)]">{group.title}</h2>
          <span className="font-mono text-[11px] text-[var(--ink-muted)]">{group.docs.length} docs</span>
        </div>
        <p className="text-[14px] text-[var(--ink-muted)] mt-1">{group.description}</p>
      </div>
      {layout === 'exam-table' ? (
        <PrimaryExamTable docs={group.docs} secondaryDocs={secondaryDocs} />
      ) : layout === 'exam-table-2' ? (
        <PrimaryExamTable2 docs={group.docs} secondaryDocs={secondaryDocs} />
      ) : layout === 'pe-exam-table' ? (
        <PeExamTable docs={group.docs} />
      ) : layout === 'pe-first-stage-table' ? (
        <PeFirstStageExamTable docs={group.docs} />
      ) : layout === 'pe-construction-exam-table' ? (
        <PeConstructionExamTable docs={group.docs} />
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
  const docs = allDocs.filter(d => d.published !== false && !d.tags?.includes('模範論文') && !d.hideFromCategory);

  const groups = (slug === 'civil-construction-1' || slug === 'civil-construction-2' || slug === 'pe-comprehensive-management' || slug === 'pe-first-stage' || slug === 'concrete-chief-engineer' || slug === 'concrete-diagnostician' || slug === 'pe-construction')
    ? groupDocs(docs, slug)
    : null;

  // note 有料マガジン CTA（カテゴリ hub 用・文脈一致）。公開済みのみ残す（防御的）。
  const categoryMagazines = resolveCategoryMagazines(slug)
    .map((s) => ({ slot: s, magazine: getMagazine(s.magazineId) }))
    .filter((x): x is { slot: typeof x.slot; magazine: NonNullable<typeof x.magazine> } => Boolean(x.magazine));

  // 転職アフィリ（資格別セグメント）。PC は右サイドバー上部に sticky 配置してファーストビュー内で
  // インプレッションを確保し、モバイルは本文 1 セクション目の直後に visible 配置する（記事到達を阻害しない）。
  // ピクセルは PC サイドバー側のみ発火させ「1 ページ 1 ピクセル」を厳守（モバイルは href のみ）。
  // creative は資格層に合わせて出し分け（civil=施工管理系 BuildJob/GKS、pe=ハイクラス DX/コンサル）。
  // 戻り値 null＝転職枠なし（concrete / pe-construction / pe-first-stage は単一カラム）。
  const careerSidebar = resolveCategoryCareerAd(slug);
  // 右サイドバー（PC・≥993px）は「note 有料マガジン CTA」または「転職枠」のどちらかがあれば出す。
  // note CTA は冒頭全幅グリッドから PC 右サイドバーへ集約し、モバイルは記事一覧の下に出す（2026-06-20）。
  // サイドバーは縦積みのため上位 3 マガジン（placement 優先順）に絞ってコンパクトに保つ。
  const hubMagazines = categoryMagazines.slice(0, 3);
  const hasSidebar = Boolean(careerSidebar) || hubMagazines.length > 0;
  // モバイル本文中の visible バナー（pixelSrc を渡さない＝PC サイドバー側が唯一の発火源）。
  const mobileCareerAd = careerSidebar ? (
    <div className="zenn-desktop:hidden my-10">
      <SidebarAdBanner
        href={careerSidebar.creative.href}
        imageSrc={careerSidebar.creative.imageSrc}
        alt={careerSidebar.creative.alt}
        width={careerSidebar.creative.width}
        height={careerSidebar.creative.height}
        trackLabel={careerSidebar.trackLabel}
      />
    </div>
  ) : null;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] transition-colors duration-300">
      <Header />

      <main className="flex-grow">
        {/* Category Header — editorial */}
        <div className="border-b border-[var(--rule-soft)] py-10 sm:py-12 px-4 sm:px-6 lg:px-10 bg-[var(--paper)]">
          <div className="max-w-[1280px] mx-auto">
            <nav aria-label="breadcrumb" className="font-mono text-[11px] text-[var(--ink-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
              <Link href="/" className="hover:text-[var(--accent)] transition-colors">Home</Link>
              <span aria-hidden className="opacity-60">›</span>
              <span>Category</span>
            </nav>
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] px-2.5 py-1 bg-[var(--accent-fill)] rounded-full mb-4">
              CATEGORY
            </div>
            <h1 className="font-serif font-black tracking-tight text-[var(--ink)] text-[32px] sm:text-[40px] md:text-[48px] leading-[1.2] mb-3">
              {cat.label}
            </h1>
            <p className="text-[16px] leading-[1.9] text-[var(--ink-body)] max-w-[60ch]">{cat.subtitle}</p>
            <div className="mt-5 flex gap-4 flex-wrap font-mono text-[11px] text-[var(--ink-muted)] tabular-nums">
              <span>{docs.length.toLocaleString()} docs</span>
            </div>
          </div>
        </div>

        {/* カテゴリ本文 + 右サイドバー。note CTA（hub・文脈一致）または転職枠があれば 2 カラム化し、
            PC（≥993px）右サイドバー上部に note マガジン CTA、その下に転職アフィリ（SidebarAdBanner＝
            当ページ唯一のピクセル源）を sticky 配置。note CTA はモバイルでは記事一覧の下に出す。
            note CTA も転職枠も無いカテゴリは従来どおり単一カラム（flex 子 1 つ＝全幅）。 */}
        <div className={hasSidebar
          ? 'max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 flex gap-8 relative'
          : 'max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10'}>
          <div className="flex-1 min-w-0">
            <div className="py-10 sm:py-12 text-[17px] leading-[1.9]">
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
                      {guideGroup && <DocSection group={guideGroup} />}
                      {mobileCareerAd}
                      {textbookGroup && (
                        <section>
                          <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{textbookGroup.title}</h2>
                            <p className="text-base text-gray-500 dark:text-gray-400 mt-1">{textbookGroup.description}</p>
                            <span className="text-sm text-gray-400 dark:text-gray-500">{textbookGroup.docs.length} 件</span>
                          </div>
                          <div className="space-y-8">
                            {textbookAreas.map(area => (
                              <div key={area.label}>
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">{area.label}</h3>
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
              ) : slug === 'civil-construction-2' ? (
                /* civil-construction-2: 2級向け、前期/後期テーブル */
                (() => {
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

                  return (
                    <>
                      {guideGroup && <DocSection group={guideGroup} />}
                      {mobileCareerAd}
                      {textbookGroup && <DocSection group={textbookGroup} />}
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
                            title: '第2次検定 分野別対策',
                            description: '経験記述・施工管理（コンクリート工・土工・品質管理・施工計画）の基礎と過去問（主任技術者視点）',
                            docs: secondaryTopicDocs,
                          }}
                        />
                      )}
                    </>
                  );
                })()
              ) : slug === 'pe-first-stage' ? (
                (() => {
                  const primaryGroup = groups.find(g => g.title === getGroupLabel('pe-first-stage', 'primary'));
                  return (
                    <>
                      {primaryGroup && (
                        <DocSection group={primaryGroup} layout="pe-first-stage-table" />
                      )}
                    </>
                  );
                })()
              ) : slug === 'pe-comprehensive-management' ? (
                (() => {
                  const guideGroup = groups.find(g => g.title === getGroupLabel('pe-comprehensive-management', 'guide'));
                  const pillarGroup = groups.find(g => g.title === getGroupLabel('pe-comprehensive-management', 'pillar'));
                  const pastExamGroup = groups.find(g => g.title === getGroupLabel('pe-comprehensive-management', 'pastExam'));
                  const keywordGroup = groups.find(g => g.title === getGroupLabel('pe-comprehensive-management', 'keyword'));
                  const keywordCount = keywordGroup?.docs.length ?? 0;

                  // essay-mlit-* 7 記事は 2026-05-18 撤回済み（旧分離ロジック削除）
                  return (
                    <>
                      {guideGroup && guideGroup.docs.length > 0 && <DocSection group={guideGroup} />}
                      {mobileCareerAd}
                      {pillarGroup && <DocSection group={pillarGroup} />}
                      {pastExamGroup && (
                        <DocSection group={pastExamGroup} layout="pe-exam-table" />
                      )}
                      {/* キーワード索引へのナビゲーション（本体は /sitemap-keywords に移動） */}
                      {keywordCount > 0 && (
                        <section>
                          <div className="mb-6">
                            <h2 className="font-serif text-[22px] sm:text-[26px] font-black text-[var(--ink)]">キーワードを探す</h2>
                            <p className="text-[14px] text-[var(--ink-muted)] mt-1">
                              5 管理 × 26 セクションで体系化された全 {keywordCount} キーワードの索引
                            </p>
                          </div>
                          <Link
                            href="/sitemap-keywords"
                            className="group flex items-center gap-4 p-5 rounded-card-content border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-card-hover transition-all"
                          >
                            <div className="flex-shrink-0 w-10 h-10 rounded-sm bg-blue-600 dark:bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                              ≡
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                キーワードを全件見る（{keywordCount} 件）
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                文部科学省「総合技術監理 キーワード集 2026」に基づくセクション別索引へ
                              </div>
                            </div>
                            <span className="text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform" aria-hidden>›</span>
                          </Link>
                        </section>
                      )}
                    </>
                  );
                })()
              ) : slug === 'pe-construction' ? (
                (() => {
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

            {/* note 有料マガジン CTA（モバイル＜993px のみ）。PC は右サイドバーへ集約するため、
                サイドバー非表示のモバイルでは記事一覧の下にフォールバック表示する。 */}
            {hubMagazines.length > 0 && (
              <div className="zenn-desktop:hidden pb-10 grid gap-3 sm:grid-cols-2">
                {hubMagazines.map(({ slot, magazine }) => (
                  <MagazineInlineCard
                    key={slot.magazineId}
                    url={buildMagazineUrl(magazine, slot.utmContent)}
                    title={magazine.title}
                    description={magazine.description}
                    imageUrl={magazine.imageUrl}
                    badge={magazine.badge}
                    trackLabel={slot.utmContent}
                  />
                ))}
              </div>
            )}
          </div>

          {hasSidebar && (
            <aside className="hidden zenn-desktop:block w-[300px] shrink-0 py-10 sm:py-12">
              <div className="sticky top-6 space-y-3">
                {/* note 有料マガジン CTA（PC 右サイドバー上部・文脈一致）。試験単位の旗艦商品を提示する。
                    冒頭全幅グリッドから集約（2026-06-20）。未公開マガジンは getMagazine で除外済み。 */}
                {hubMagazines.map(({ slot, magazine }) => (
                  <MagazineSidebarPromoCard
                    key={slot.magazineId}
                    url={buildMagazineUrl(magazine, slot.utmContent)}
                    title={magazine.title}
                    description={magazine.description}
                    imageUrl={magazine.imageUrl}
                    badge={magazine.badge}
                    trackLabel={slot.utmContent}
                  />
                ))}
                {/* 転職アフィリ（PC 右サイドバー・sticky）。当ページ唯一のピクセル発火源。
                    creative は resolveCareerSidebarAd で期間出し分け（〜2026-08-31 ビルドジョブ / 以降 GKS）。 */}
                {careerSidebar && (
                  <SidebarAdBanner
                    {...careerSidebar.creative}
                    trackLabel={careerSidebar.trackLabel}
                  />
                )}
              </div>
            </aside>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
