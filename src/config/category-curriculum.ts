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
  min: number;
  max: number;
};

/** 1カテゴリの体系編成。examGuide / fields / textbookChapters / careerFeatured はいずれも任意。 */
export type CategoryCurriculum = {
  examGuide?: ExamGuideDef;
  fields?: FieldsDef;
  textbookChapters?: TextbookChapterDef[];
  careerFeatured?: string[];
};

// JSON 先頭の $comment キーは型に含めない（実データのカテゴリのみ抽出）。
const raw = curriculumData as Record<string, unknown>;
const CURRICULUM: Record<string, CategoryCurriculum> = Object.fromEntries(
  Object.entries(raw).filter(([k]) => !k.startsWith('$')),
) as Record<string, CategoryCurriculum>;

export function getCategoryCurriculum(category: string): CategoryCurriculum | undefined {
  return CURRICULUM[category];
}
