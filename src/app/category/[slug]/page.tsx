import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { getAllCategories, getCategoryBySlug } from '@/lib/categories';
import { getDocsByCategory, Doc } from '@/lib/docs';
import { classifyDoc, getGroupOrder, getGroupLabel, type DocGroupKey } from '@/lib/doc-classifier';

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
  docs: Doc[];
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
function sortDocs(docs: Doc[], group: DocGroupKey, category: string) {
  if (category === 'civil-construction-1') {
    if (group === 'guide') {
      docs.sort((a, b) => {
        if (a.meta.slug?.includes('strategy')) return -1;
        if (b.meta.slug?.includes('strategy')) return 1;
        return (a.meta.title || '').localeCompare(b.meta.title || '', 'ja');
      });
    } else if (group === 'primary') {
      docs.sort((a, b) => {
        const slugA = a.meta.slug || '';
        const slugB = b.meta.slug || '';
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
        const orderA = a.meta.textbook_order ?? 999;
        const orderB = b.meta.textbook_order ?? 999;
        return orderA - orderB;
      });
    } else if (group === 'secondary') {
      docs.sort((a, b) => {
        const slugA = a.meta.slug || '';
        const slugB = b.meta.slug || '';
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
        const yearA = a.meta.slug?.match(/r(\d+)/)?.[1] || '0';
        const yearB = b.meta.slug?.match(/r(\d+)/)?.[1] || '0';
        if (yearB !== yearA) return parseInt(yearB) - parseInt(yearA);
        const isPrimaryA = a.meta.tags?.includes('択一式') ? 0 : 1;
        const isPrimaryB = b.meta.tags?.includes('択一式') ? 0 : 1;
        return isPrimaryA - isPrimaryB;
      });
    } else if (group === 'section') {
      docs.sort((a, b) => {
        const numA = parseFloat(a.meta.section || '99');
        const numB = parseFloat(b.meta.section || '99');
        return numA - numB;
      });
    } else if (group === 'keyword') {
      docs.sort((a, b) => (a.meta.title || '').localeCompare(b.meta.title || '', 'ja'));
    }
  }
}

/**
 * Group docs using the shared classifier logic.
 */
function groupDocs(docs: Doc[], category: string): DocGroup[] {
  const buckets = new Map<DocGroupKey, Doc[]>();

  for (const doc of docs) {
    const group = classifyDoc(doc.meta);
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

function DocCard({ doc }: { doc: Doc }) {
  return (
    <Link
      href={`/docs/${doc.meta.slug}`}
      className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-400 hover:shadow-lg transition-all"
    >
      <div className="flex flex-col gap-2 h-full">
        <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2">
          {doc.meta.title}
        </h3>
        {doc.meta.description && (
          <p className="text-sm text-gray-600 line-clamp-2 flex-grow">
            {doc.meta.description}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
          {(doc.meta.tags || []).slice(0, 2).map(tag => (
            <span
              key={tag}
              className="inline-block text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
            >
              {tag}
            </span>
          ))}
          {doc.meta.tags && doc.meta.tags.length > 2 && (
            <span className="text-xs text-gray-500">
              +{doc.meta.tags.length - 2}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function DocSection({ group }: { group: DocGroup }) {
  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{group.title}</h2>
        <p className="text-sm text-gray-500 mt-1">{group.description}</p>
        <span className="text-xs text-gray-400">{group.docs.length} 件</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {group.docs.map(doc => (
          <DocCard key={doc.meta.slug} doc={doc} />
        ))}
      </div>
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

  const allDocs = await getDocsByCategory(slug);
  const docs = allDocs.filter(d => d.meta.published !== false);

  const groups = (slug === 'civil-construction-1' || slug === 'pe-comprehensive-management')
    ? groupDocs(docs, slug)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-grow">
        {/* Category Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              {cat.label}
            </h1>
            <p className="text-lg text-gray-600">{cat.subtitle}</p>
            <p className="text-sm text-gray-400 mt-2">
              全 {docs.length} 件のコンテンツ
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-12">
          {docs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                このカテゴリにはまだコンテンツがありません。
              </p>
            </div>
          ) : groups ? (
            /* Grouped layout for pe-comprehensive-management */
            <div className="space-y-16">
              {groups.map(group => (
                <DocSection key={group.title} group={group} />
              ))}
            </div>
          ) : (
            /* Default flat grid for other categories */
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {docs.map(doc => (
                <DocCard key={doc.meta.slug} doc={doc} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
