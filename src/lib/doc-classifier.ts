/**
 * ドキュメント分類ロジック
 * カテゴリページ、ナビカード、パンくずで共通使用。
 * frontmatter の `group` フィールドを優先し、未設定時はタグから推測（フォールバック）。
 */
import type { DocMeta } from './docs';

/**
 * 記事の体系グループ。
 *
 * 注意: `'career'` は `classifyDoc()` が **決して返さない**（career 記事は frontmatter で
 * `group: guide` + `tags: [career]` として書かれ、classifyDoc は group を優先するため
 * 常に `'guide'` になる）。`'career'` はカテゴリページの体系表示（careerFeatured）側で
 * 使う語彙。「この記事は転職・キャリア意図か」の判定は必ず `isCareerDoc()` を使うこと。
 */
export type DocGroupKey = 'guide' | 'pillar' | 'textbook' | 'pastExam' | 'keyword' | 'primary' | 'secondary' | 'career';

/**
 * 転職・キャリア意図の記事か（真実源 = frontmatter `tags: [career]`）。
 *
 * classifyDoc はこれらを `'guide'` として返すため、**学習系の一覧・ナビに career を混ぜない**
 * 用途では必ずこの述語で除外する。混在は 2026-07-28 に docs サイドバー「試験ガイド」で
 * 実際に発生した（civil-1 は 49 件中 26 件が転職記事）。
 * 判定を各所で `tags?.includes('career')` と直書きすると抜けが生まれるのでここへ集約する。
 */
export function isCareerDoc(meta: Pick<DocMeta, 'tags'>): boolean {
  return meta.tags?.includes('career') === true;
}

/** frontmatter の group 値 → DocGroupKey のマッピング */
const GROUP_FIELD_MAP: Record<string, DocGroupKey> = {
  'guide': 'guide',
  'pillar': 'pillar',
  'past-exam': 'pastExam',
  'keyword': 'keyword',
  'primary': 'primary',
  'secondary': 'secondary',
  'textbook': 'textbook',
};

const PE_GROUP_ORDER: DocGroupKey[] = ['guide', 'pillar', 'pastExam', 'keyword'];
const PE_FIRST_STAGE_GROUP_ORDER: DocGroupKey[] = ['primary'];
const PE_CONSTRUCTION_GROUP_ORDER: DocGroupKey[] = ['guide', 'keyword', 'pastExam'];
const CIVIL_GROUP_ORDER: DocGroupKey[] = ['guide', 'textbook', 'primary', 'secondary'];
const CONCRETE_GROUP_ORDER: DocGroupKey[] = ['guide', 'textbook', 'primary'];

export function classifyDoc(meta: DocMeta): DocGroupKey {
  // 明示的 group フィールドがあれば優先
  if (meta.group && GROUP_FIELD_MAP[meta.group]) {
    return GROUP_FIELD_MAP[meta.group]!;
  }

  // フォールバック: タグから推測（group 未設定の既存コンテンツ向け）
  const tags = meta.tags || [];
  const category = meta.category;

  if (category === 'pe-comprehensive-management') {
    if (tags.includes('索引') || tags.includes('guide')) return 'guide';
    if (tags.includes('択一式') || tags.includes('記述式') || tags.includes('past-questions')) return 'pastExam';
    return 'keyword';
  }

  if (category === 'civil-construction-1' || category === 'civil-construction-2') {
    if (tags.includes('textbook')) return 'textbook';
    if (tags.includes('guide')) return 'guide';
    if (tags.includes('primary')) return 'primary';
    if (tags.includes('secondary')) return 'secondary';
    return 'guide';
  }

  if (category === 'concrete-engineer' || category === 'concrete-chief-engineer' || category === 'concrete-diagnostician') {
    if (tags.includes('textbook')) return 'textbook';
    if (tags.includes('primary') || tags.includes('past-questions')) return 'primary';
    if (tags.includes('guide')) return 'guide';
    return 'guide';
  }

  return 'keyword';
}

const GROUP_LABELS: Record<string, Partial<Record<DocGroupKey, string>>> = {
  'pe-comprehensive-management': {
    guide: '試験概要',
    pillar: '5 管理学習ガイド',
    pastExam: '過去問',
    keyword: 'キーワード',
  },
  'civil-construction-1': {
    guide: '試験ガイド',
    textbook: 'テキスト（教科書）',
    primary: '第1次検定',
    secondary: '第2次検定',
  },
  'civil-construction-2': {
    guide: '試験ガイド',
    textbook: 'テキスト（教科書）',
    primary: '第1次検定',
    secondary: '第2次検定',
  },
  'pe-first-stage': {
    primary: '過去問',
  },
  'pe-construction': {
    guide: '試験ガイド',
    pastExam: '過去問',
    keyword: 'キーワード',
  },
  'concrete-engineer': {
    guide: '試験ガイド',
    textbook: 'テキスト（分野別解説）',
    primary: 'オリジナル演習',
  },
  'concrete-chief-engineer': {
    guide: '試験ガイド',
    textbook: 'テキスト（分野別解説）',
    primary: '過去問',
  },
  'concrete-diagnostician': {
    guide: '試験ガイド',
    textbook: 'テキスト（分野別解説）',
    primary: '過去問（四肢択一）',
  },
};

export function getGroupOrder(category: string): DocGroupKey[] {
  if (category === 'pe-comprehensive-management') return PE_GROUP_ORDER;
  if (category === 'pe-first-stage') return PE_FIRST_STAGE_GROUP_ORDER;
  if (category === 'pe-construction') return PE_CONSTRUCTION_GROUP_ORDER;
  if (category === 'civil-construction-1' || category === 'civil-construction-2') return CIVIL_GROUP_ORDER;
  if (category === 'concrete-engineer' || category === 'concrete-chief-engineer' || category === 'concrete-diagnostician') return CONCRETE_GROUP_ORDER;
  return ['keyword'];
}

export function getGroupLabel(category: string, group: DocGroupKey): string {
  return GROUP_LABELS[category]?.[group] ?? group;
}
