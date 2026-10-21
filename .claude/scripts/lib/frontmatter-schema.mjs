/**
 * MDX frontmatter の zod スキーマ（doc 17 §5.1）
 *
 * ── 設計方針 ──
 * - 実体はこの .mjs に置く。Node スクリプト (`scripts/*.mjs`) からそのまま import できる。
 * - TypeScript 側の再エクスポート（src/lib/frontmatter-schema.ts）は使い手が 1 件も無く 2026-10-11 に削除した（knip・DN-0687）。
 * - ほぼ全フィールドをオプショナルにし、キーは許可リスト（`.strict()`）。知らないキーは HIGH で止める（DN-0796）。
 *   以前は `.passthrough()` で、`updated` と `updatedAt` のような綴りの違いや、表示の日付を古いまま上書きする
 *   `updatedAt` が黙って通っていた。新しいキーを使うときは、ここに型と意味を足してから書く。
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

// gray-matter が YAML の日付を Date に読むので文字列と両方を受ける
const dateLike = z.union([z.string(), z.date()]);

export const FrontmatterSchema = z
  .object({
    title: z.string().min(1),
    shortTitle: z.string().optional(),
    subtitle: z.string().optional(),
    // 500 はスキーマ検証の構文上の上限（SEO の長さの目安ではない）。description の推奨長・lint の上限は
    // config/seo-meta-config.json の thresholds.description（scripts/lib/seo-thresholds.mjs・src/lib/metadata.ts が読む）。
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
    // 参考文献台帳（config/reference-sources.json）の id。自由記述の書名は不可。
    // 逐語・図・公開可否と出典粒度は reference-sources-policy.md を真実源とする。
    // 条番号等の detail は `source-id#第240条` のように末尾へ付与できる。
    sources: z.array(z.string()).optional(),
    // ---- 2026-10-20 に実データ全 1,470 記事から起こした許可リスト（DN-0796）----
    seoTitle: z.string().min(1).optional(),
    // 作成日・最終更新日（frontmatter が真実源。sitemap の lastmod と JSON-LD に出る。check-mdx-dates）
    created: dateLike.optional(),
    dateModified: dateLike.optional(),
    lastRewrittenAt: dateLike.optional(),
    revisionCycle: z.number().optional(),
    // 一覧の並び（ガイド・教科書）
    guide_order: z.number().optional(),
    textbook_order: z.number().optional(),
    section: z.union([z.string(), z.number()]).optional(),
    toc_min_heading_level: z.number().int().optional(),
    toc_max_heading_level: z.number().int().optional(),
    // OGP の文言（ogp-create・srcHash が読む）
    ogp: z.object({ title: z.string().optional(), subtitle: z.string().optional(), template: z.string().optional() }).strict().optional(),
    // よくある質問（表示と FAQ の構造化データ。q/a と question/answer の両方を読む）
    faqs: z.array(z.union([z.object({ q: z.string(), a: z.string() }).strict(), z.object({ question: z.string(), answer: z.string() }).strict()])).optional(),
    // 過去問ページの属性
    officialQuestions: z.boolean().optional(),
    exam: z.string().optional(),
    examType: z.string().optional(),
    year: z.string().optional(),
    questionCount: z.number().int().optional(),
    source_pdf: z.string().optional(),
    sub: z.string().optional(),
    type: z.string().optional(),
    hideFromHome: z.boolean().optional(),
    // 法令ページ（category: laws・DN-0731）が解説する法令の e-Gov 法令 ID と、同じページで扱う政令・省令の ID
    lawId: z.string().regex(/^[0-9A-Z]+$/).optional(),
    lawFamily: z.array(z.string().regex(/^[0-9A-Z]+$/)).optional(),
    // 法令ページの無い法令の解説を兼ねる記事（総監の用語「大気汚染防止法」など）が解説する法令の e-Gov 法令 ID。
    // ほかの記事の根拠法令の法令名がこの記事へ向く（content-taxonomy.md §6-3）
    explainsLaw: z.string().regex(/^[0-9A-Z]+$/).optional(),
    // 非公開にした記事の記録（published: false と組で使う）
    unpublishedAt: z.string().optional(),
    unpublishedReason: z.string().optional(),
  })
  .strict();

/**
 * 安全にパース。成功時は { success: true, data }、失敗時は { success: false, error }。
 */
export function parseFrontmatter(data) {
  return FrontmatterSchema.safeParse(data);
}
