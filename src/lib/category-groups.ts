import { type DocMeta } from '@/lib/docs';
import { classifyDoc, getGroupOrder, getGroupLabel, type DocGroupKey } from '@/lib/doc-classifier';
import { getCategoryBySlug, type CategoryLayout } from '@/lib/categories';

export type DocGroup = {
  key: DocGroupKey;
  title: string;
  description: string;
  docs: DocMeta[];
};

/** 記事型ごとの説明と並べ替えの規則は categories.json の layout が持つ（DN-0793） */
function layoutOf(category: string): CategoryLayout | undefined {
  return getCategoryBySlug(category)?.layout;
}

/** Sort functions per group */
function sortDocs(docs: DocMeta[], group: DocGroupKey, category: string) {
  const sort = layoutOf(category)?.sort;
  if (sort === 'civil') {
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
  } else if (sort === 'concrete') {
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
  } else if (sort === 'pe-first-stage') {
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
  } else if (sort === 'pe-comprehensive') {
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
      description: layoutOf(category)?.groupDescriptions?.[groupKey] ?? '',
      docs: groupDocs,
    });
  }

  return result;
}
