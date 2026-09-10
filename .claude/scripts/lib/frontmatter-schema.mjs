/**
 * MDX frontmatter の zod スキーマ（doc 17 §5.1）
 *
 * ── 設計方針 ──
 * - 実体はこの .mjs に置く。Node スクリプト (`scripts/*.mjs`) からそのまま import できる。
 * - TypeScript 消費者向けには `src/lib/frontmatter-schema.ts` が型を再エクスポートする。
 * - 既存 746 MDX との互換性を壊さないため、ほぼ全フィールドをオプショナル、`.passthrough()` で未知フィールドを許容。
 *
 * 新試験を追加する時は src/config/categories.json（area / groups）へ登録してから
 * `content/site/{exam-id}/` を作成する（exam-content-policy.md Part 4）。
 */
import { readFileSync } from 'node:fs';
import { z } from 'zod';

export const ExamId = z.enum([
  'civil-construction-1',
  'civil-construction-2',
  'pe-comprehensive-management',
]);

// 記事型の語彙は src/config/content-taxonomy.json の groups が真実源（規則は content-taxonomy.md）。
// ここで列挙し直すと二重 SSOT になるので、キーから導出する。
const taxonomy = JSON.parse(readFileSync(new URL('../../../src/config/content-taxonomy.json', import.meta.url), 'utf8'));
export const GroupId = z.enum(Object.keys(taxonomy.groups));

export const ReviewStatus = z.enum(['needs-review', 'approved', 'rejected']);

// 既存 MDX で実際に使われている値のユニオン（監査時に収集したもの）
// 緩く z.string() でも通るが、既知の試験は enum で縛る
export const Category = z.string();

export const FrontmatterSchema = z
  .object({
    title: z.string().min(1),
    shortTitle: z.string().optional(),
    subtitle: z.string().optional(),
    description: z.string().min(1).max(500).optional(),
    category: Category.optional(),
    // exams / sections は 2026-09-11 に廃止（読み捨て・新規記事には書かない。横断は資格タグと topics で表現）
    exams: z.array(ExamId).optional(),
    sections: z.record(ExamId, z.string()).optional(),
    // 横断テーマ（src/config/topics.json の slug）への明示所属。タグ由来の自動収集に加えて宣言できる
    topics: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    group: GroupId.optional(),
    published: z.boolean().optional(),
    // gray-matter が YAML の ISO 日付を Date として自動パースするため union で許容
    publishedAt: z.union([z.string(), z.date()]).optional(),
    reviewStatus: ReviewStatus.optional(),
    // 参考文献台帳（.claude/config/reference-sources.json）の id。自由記述の書名は不可。
    // 逐語・図・公開可否と出典粒度は reference-sources-policy.md を真実源とする。
    // 条番号等の detail は `source-id#第240条` のように末尾へ付与できる。
    sources: z.array(z.string()).optional(),
  })
  .passthrough();

/**
 * 安全にパース。成功時は { success: true, data }、失敗時は { success: false, error }。
 */
export function parseFrontmatter(data) {
  return FrontmatterSchema.safeParse(data);
}
