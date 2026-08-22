/**
 * MDX frontmatter の zod スキーマ（doc 17 §5.1）
 *
 * ── 設計方針 ──
 * - 実体はこの .mjs に置く。Node スクリプト (`scripts/*.mjs`) からそのまま import できる。
 * - TypeScript 消費者向けには `src/lib/frontmatter-schema.ts` が型を再エクスポートする。
 * - 既存 746 MDX との互換性を壊さないため、ほぼ全フィールドをオプショナル、`.passthrough()` で未知フィールドを許容。
 *
 * 新試験を追加する時は、まず `ExamId` と `Category` に追記してから
 * `content/site/{exam-id}/` を作成する（doc 18 参照）。
 */
import { z } from 'zod';

export const ExamId = z.enum([
  'civil-construction-1',
  'civil-construction-2',
  'pe-comprehensive-management',
]);

export const GroupId = z.enum([
  'guide',
  'pillar',
  'primary',
  'secondary',
  'keyword',
  'past-exam',
  'textbook',
]);

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
    exams: z.array(ExamId).optional(),
    sections: z.record(ExamId, z.string()).optional(),
    tags: z.array(z.string()).optional(),
    group: GroupId.optional(),
    published: z.boolean().optional(),
    // gray-matter が YAML の ISO 日付を Date として自動パースするため union で許容
    publishedAt: z.union([z.string(), z.date()]).optional(),
    reviewStatus: ReviewStatus.optional(),
  })
  .passthrough();

/**
 * 安全にパース。成功時は { success: true, data }、失敗時は { success: false, error }。
 */
export function parseFrontmatter(data) {
  return FrontmatterSchema.safeParse(data);
}
