import { type DocMeta } from '@/lib/docs';
import { classifyDoc, getGroupOrder, getGroupLabel, type DocGroupKey } from '@/lib/doc-classifier';

export type DocGroup = {
  key: DocGroupKey;
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
    guide: '試験制度・科目構成・合格基準・学習計画・一次合格後のロードマップ',
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
  'concrete-engineer': {
    guide: '試験概要・2026年度の受験資格・学習計画・主任技士との違い',
    textbook: '材料・配（調）合・試験・製造品質管理・施工・環境問題の体系的な基礎解説',
    primary: '技士レベルのオリジナル四肢択一と解説',
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
  } else if (category === 'concrete-engineer' || category === 'concrete-chief-engineer' || category === 'concrete-diagnostician') {
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
    if (group === 'guide') {
      docs.sort((a, b) => {
        const orderA = a.guide_order ?? 999;
        const orderB = b.guide_order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.title || '').localeCompare(b.title || '', 'ja');
      });
    } else if (group === 'primary') {
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
export function groupDocs(docs: DocMeta[], category: string): DocGroup[] {
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
      key: groupKey,
      title: getGroupLabel(category, groupKey),
      description: GROUP_DESCRIPTIONS[category]?.[groupKey] ?? '',
      docs: groupDocs,
    });
  }

  return result;
}
