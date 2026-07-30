import curriculumData from '@/config/category-curriculum.json';

/** 分野別・キャリアの1ブロック（見出し＋所属記事 suffix 群）。slugs 記載順が表示順。 */
export type CurriculumBlock = {
  id: string;
  label?: string;
  slugs: string[];
};

/** 受験ガイド節（単一ブロック）。 */
export type ExamGuideDef = {
  title: string;
  description?: string;
  slugs: string[];
};

/** 分野別対策節（複数ブロック）。 */
export type FieldsDef = {
  title: string;
  description?: string;
  blocks: CurriculumBlock[];
};

/** テキスト章定義（textbook_order のレンジ→章ラベル）。volume で冊をまとめる。 */
export type TextbookChapterDef = {
  volume?: string;
  label: string;
  /** 紙テキストの章番号ラベル（例 "第1章"）。合併章は "第1-2章" 等。省略時は非表示。 */
  chapterNo?: string;
  min: number;
  max: number;
  /** 章の入口に据える要点 guide（suffix）。分野別対策から章頭へ移した「要点まとめ」記事。 */
  introGuides?: string[];
};

/**
 * キーワード節の編成（keyword group）。必須科目I ブロック（テーマ分析 1 本＋チップ帯）と
 * 選択科目マトリクス（1 分野 = 1 行 × 種別列）に分ける。カードグリッドでは 35 本が 12 行に
 * なるため、過去問マトリクスと同じ「科目の行を横に読む」形へ寄せる（2026-07-30）。
 * 節タイトル・説明は category-groups の GROUP_DESCRIPTIONS が真実源なのでここには持たない。
 */
export type KeywordSectionDef = {
  /** 全受験者共通ブロック。themeSlug = 先頭に据える出題テーマ分析（suffix）。 */
  required?: {
    label: string;
    note?: string;
    themeSlug?: string;
    /** チップ帯。slugs 記載順が表示順。 */
    groups: { label: string; slugs: string[] }[];
  };
  /** 科目 × 種別マトリクス。subjects[].slugs は columns と同じ並び・同じ個数。 */
  selective?: {
    label: string;
    note?: string;
    /** header = 列見出し（デスクトップ表）、cell = セル/チップのリンク文字（モバイルでも自己説明的に）。 */
    columns: { header: string; cell: string }[];
    subjects: { label: string; slugs: (string | null)[] }[];
  };
};

/** 1カテゴリの体系編成。examGuide / fields / textbookChapters / careerFeatured / keywordSection はいずれも任意。 */
export type CategoryCurriculum = {
  examGuide?: ExamGuideDef;
  fields?: FieldsDef;
  textbookChapters?: TextbookChapterDef[];
  careerFeatured?: string[];
  keywordSection?: KeywordSectionDef;
};

// JSON 先頭の $comment キーは型に含めない（実データのカテゴリのみ抽出）。
const raw = curriculumData as Record<string, unknown>;
const CURRICULUM: Record<string, CategoryCurriculum> = Object.fromEntries(
  Object.entries(raw).filter(([k]) => !k.startsWith('$')),
) as Record<string, CategoryCurriculum>;

export function getCategoryCurriculum(category: string): CategoryCurriculum | undefined {
  return CURRICULUM[category];
}
