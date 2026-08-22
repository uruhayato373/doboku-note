/**
 * MDX frontmatter zod スキーマ ── TypeScript 消費者向けラッパー。
 *
 * 実体は `.claude/scripts/lib/frontmatter-schema.mjs` にある（Node スクリプトから
 * そのまま import するため）。このファイルは Next.js 側からも同じ schema を
 * 使えるようにし、zod の型推論で `Frontmatter` 型を提供する。
 *
 * 真実源: .claude/reference/data-storage-decision.md
 */
import {
  FrontmatterSchema,
  ExamId,
  GroupId,
  ReviewStatus,
  parseFrontmatter,
} from '../../.claude/scripts/lib/frontmatter-schema.mjs';
import type { z } from 'zod';

export { FrontmatterSchema, ExamId, GroupId, ReviewStatus, parseFrontmatter };

export type Frontmatter = z.infer<typeof FrontmatterSchema>;
export type ExamIdValue = z.infer<typeof ExamId>;
export type GroupIdValue = z.infer<typeof GroupId>;
export type ReviewStatusValue = z.infer<typeof ReviewStatus>;
