/**
 * repository-paths.mjs — リポジトリ内の主要ルートを 1 箇所で定義する。
 *
 * 背景: チャネルごとのルートが scripts / skills / src / tools に散在していると、
 *   配置を変えるたびに探索もれが出る（実測 1,188 ファイルが旧パス文字列を持つ）。
 *   移行の前にここへ集約し、コードは文字列リテラルではなくこの定数を使う。
 *
 * 規約:
 *   - `process.cwd()` に依存せず **module URL からリポジトリルートを解決**する
 *     （admin app・worktree・サブディレクトリ実行でも同じ値になる）
 *   - 環境変数による上書きを持たない（テスト都合で本番経路を変えない）
 *   - **存在確認と業務処理を混ぜない**。ここは「どこにあるか」だけを答える
 *
 * 2026-08-18 時点は移行中で、`LEGACY_*` が現行 SSOT。移動が済んだ領域から
 * 正規の定数へ切り替える（新旧のコピーを同時に持たない）。
 */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** このファイルは scripts/lib/ にあるので 2 階層上がリポジトリルート。 */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const at = (...segments) => join(REPO_ROOT, ...segments);

// --- 4 領域のルート -------------------------------------------------------
export const DOCS_ROOT = at('docs');
export const CONTENT_ROOT = at('content');
export const CLAUDE_ROOT = at('.claude');

// --- content/ のチャネル別ルート（移行先） --------------------------------
/**
 * サイト原稿（MDX と記事画像）の物理 root。
 *
 * R2 の object key は「この root からの相対パス」に `posts/` を前置して作るので、
 * **ローカルの置き場が変わっても remote key は `posts/...` のまま**（2026-08-18 の移行で
 * `content/site` → `content/site` に変えたが、公開 URL も R2 key も動いていない）。
 * 利用箇所はここを import する形に集約してあるので、置き場を変えるときはこの 1 行だけ触る。
 */
export const SITE_CONTENT_ROOT = at('content', 'site');
export const NOTE_CONTENT_ROOT = at('content', 'note');
export const COCONALA_CONTENT_ROOT = at('content', 'coconala');
export const COCONALA_BLOG_ROOT = at('content', 'coconala', 'blog');
export const SNS_CONTENT_ROOT = at('content', 'sns');
export const KINDLE_CONTENT_ROOT = at('content', 'kindle');
export const CONTENT_SOURCES_ROOT = at('content', 'sources');
export const TEXTBOOK_SOURCES_ROOT = at('content', 'sources', 'textbook');

// --- .claude/ の内訳 ------------------------------------------------------
export const KNOWLEDGE_ROOT = at('.claude', 'knowledge');
export const TODO_ROOT = at('.claude', 'todo');
export const PLANS_ROOT = at('.claude', 'plans');
export const STATE_ROOT = at('.claude', 'state');
export const CONFIG_ROOT = at('.claude', 'config');

/**
 * 移行元（2026-08-18 時点の現行 SSOT）。移動が完了した領域はここから外す。
 * 移行完了後、この定数ごと削除する（互換ミラーとして残さない）。
 */
export const LEGACY_ROOTS = {
};

/** 移行対象の対応表。audit-content-layout が新旧の二重 SSOT を検出するのに使う。 */
export const MIGRATION_MAP = [
];
