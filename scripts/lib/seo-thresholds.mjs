/**
 * seo-thresholds.mjs — title・description の長さの規則。config/seo-meta-config.json の thresholds が唯一の正本。
 *
 * 読み手（lint-frontmatter・fix-descriptions・bulk-rewrite-descriptions・build 後の seo-checks）は
 * 数字を持たずここから受け取る。サイト本体の src/lib/metadata.ts は同じ JSON を直接 import する（zod 等を
 * バンドルに入れないため、この module は使わない）。
 *
 * 3 つの description 長は別の意味で、黙って 1 つに揃えない:
 *   DESCRIPTION_MIN       短すぎ。これ未満は検索結果の説明として情報が足りない（lint が警告）
 *   DESCRIPTION_MAX       推奨の上限＝検索結果に出る長さ。サイトは metadata.ts がこの長さへ整形し、
 *                         build 後の seo-checks が超過を警告する
 *   DESCRIPTION_LINT_MAX  frontmatter の lint が長すぎと指摘する長さ。MAX を超えても metadata.ts が MAX へ整形して
 *                         出すので、MAX 超〜ここまでは lint では指摘しない
 * frontmatter-schema（zod）の description 上限 500 は、スキーマ検証の構文上の上限でこれらとは別物
 * （.claude/scripts/lib/frontmatter-schema.mjs。SEO の長さの目安ではない）。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { datasetPath } from './datasets.mjs';
import { REPO_ROOT } from './repository-paths.mjs';

const file = join(REPO_ROOT, datasetPath('config.seo-meta-config'));
const { thresholds } = JSON.parse(readFileSync(file, 'utf8'));

function length(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`seo-thresholds: ${file} の thresholds.${label} が正の整数でない（${JSON.stringify(value)}）。検査不成立`);
  }
  return value;
}

/** <title> の上限（サイト名を足した後の長さ） */
export const TITLE_MAX = length(thresholds?.title?.max_length, 'title.max_length');

export const DESCRIPTION_MIN = length(thresholds?.description?.min_length, 'description.min_length');
export const DESCRIPTION_MAX = length(thresholds?.description?.max_length, 'description.max_length');
export const DESCRIPTION_LINT_MAX = length(thresholds?.description?.lint_max_length, 'description.lint_max_length');
