/**
 * ドキュメント分類ロジック
 * カテゴリページとサイドバーで共通使用。
 * 1つのDocをグループに振り分ける。
 */
import type { DocMeta } from './docs';

export type DocGroupKey = 'guide' | 'textbook' | 'pastExam' | 'section' | 'keyword' | 'primary' | 'secondary';

const PE_GROUP_ORDER: DocGroupKey[] = ['guide', 'pastExam', 'section', 'keyword'];
const CIVIL_GROUP_ORDER: DocGroupKey[] = ['guide', 'textbook', 'primary', 'secondary'];

export function classifyDoc(meta: DocMeta): DocGroupKey {
  const tags = meta.tags || [];
  const category = meta.category;

  if (category === 'pe-comprehensive-management') {
    if (tags.includes('索引') || tags.includes('guide')) return 'guide';
    if (tags.includes('択一式') || tags.includes('記述式')) return 'pastExam';
    if (meta.section || meta.type === 'digest') return 'section';
    return 'keyword';
  }

  if (category === 'civil-construction-1') {
    if (tags.includes('textbook')) return 'textbook';
    if (tags.includes('guide')) return 'guide';
    if (tags.includes('primary')) return 'primary';
    if (tags.includes('secondary')) return 'secondary';
    return 'guide';
  }

  return 'keyword';
}

export const GROUP_LABELS: Record<string, Partial<Record<DocGroupKey, string>>> = {
  'pe-comprehensive-management': {
    guide: '試験概要',
    pastExam: '過去問',
    section: 'セクション別解説',
    keyword: 'キーワード',
  },
  'civil-construction-1': {
    guide: '試験ガイド',
    textbook: 'テキスト（教科書）',
    primary: '第1次検定 過去問',
    secondary: '第2次検定 対策',
  },
};

export function getGroupOrder(category: string): DocGroupKey[] {
  if (category === 'pe-comprehensive-management') return PE_GROUP_ORDER;
  if (category === 'civil-construction-1') return CIVIL_GROUP_ORDER;
  return ['keyword'];
}

export function getGroupLabel(category: string, group: DocGroupKey): string {
  return GROUP_LABELS[category]?.[group] ?? group;
}
