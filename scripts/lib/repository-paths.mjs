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
/** エージェント運用・品質ゲートの基準と許可リスト（CI 書き込み・認証の許可リストもここ＝.claude/ の書き込み保護下） */
export const AGENT_CONFIG_ROOT = at('.claude', 'config');

// --- 正本・記録（2026-10-02 に .claude/ から分離） -------------------------
/** 事業・試験・商品の正本と、スクリプト・CI・サイトの設定 */
export const CONFIG_ROOT = at('config');
/** 外から取ってきた・発生した事業の記録（売上・計測・市場・受注・実験） */
export const DATA_ROOT = at('data');
/** 3プロジェクト共通事業方針の配布物置き場（正本はObsidian vault、ここは写し）。 */
export const SHARED_POLICY_ROOT = at('.claude', 'shared-policy');

/**
 * 移行元（2026-08-18 時点の現行 SSOT）。移動が完了した領域はここから外す。
 * 移行完了後、この定数ごと削除する（互換ミラーとして残さない）。
 */
export const LEGACY_ROOTS = {
};

/** 移行対象の対応表。audit-content-layout が新旧の二重 SSOT を検出するのに使う。 */
export const MIGRATION_MAP = [
];

/**
 * 2026-10-02 に .claude/ から config/・data/・content/ へ移したパス（旧 → 新・長い順）。
 * 追記だけを許す台帳（data/metrics/business・data/metrics/gsc/rank-watch の記録）は内容ハッシュで改ざんを検出するため
 * 中の旧パスを書き換えていない。記録に書かれたパスを読むときは resolveMovedPath で新しい位置へ読み替える。
 * 新しく書く記録は新しいパスで書く（旧パスでの新規作成は check-information-architecture が止める）。
 */
export const MOVED_PATHS = [
  [".claude/config/pe-first-stage-historical-sources.json", "config/pe-first-stage-historical-sources.json"],
  [".claude/config/note-intro-standard-civil-cross.json", "config/note-intro-standard-civil-cross.json"],
  [".claude/config/youtube-production-disclosure.json", "config/youtube-production-disclosure.json"],
  [".claude/config/coconala/resolved-inquiries.json", "data/coconala/resolved-inquiries.json"],
  [".claude/config/keiken-answer-sheet-limits.json", "config/keiken-answer-sheet-limits.json"],
  [".claude/config/note-intro-standard-civil2.json", "config/note-intro-standard-civil2.json"],
  [".claude/config/google-console-automation.json", "config/google-console-automation.json"],
  [".claude/config/note-magazine-membership.json", "config/note-magazine-membership.json"],
  [".claude/config/coconala-thumb-approved.json", "config/coconala-thumb-approved.json"],
  [".claude/config/ga4-admin-desired-state.json", "config/ga4-admin-desired-state.json"],
  [".claude/config/public-view-breakpoints.json", "config/public-view-breakpoints.json"],
  [".claude/config/note-cover-magazine-v4.json", "config/note-cover-magazine-v4.json"],
  [".claude/config/note-price-consistency.json", "config/note-price-consistency.json"],
  [".claude/config/qualification-registry.json", "config/qualification-registry.json"],
  [".claude/config/note-character-covers.json", "config/note-character-covers.json"],
  [".claude/config/note-cover-categories.json", "config/note-cover-categories.json"],
  [".claude/config/a8-report-automation.json", "config/a8-report-automation.json"],
  [".claude/config/coconala-competitors.json", "config/coconala-competitors.json"],
  [".claude/state/x-repost/reposted-log.json", "data/x-repost/reposted-log.json"],
  [".claude/config/note-intro-standard.json", "config/note-intro-standard.json"],
  [".claude/config/past-exam-inventory.json", "config/past-exam-inventory.json"],
  [".claude/config/standards-structure.json", "config/standards-structure.json"],
  [".claude/config/youtube-competitors.json", "config/youtube-competitors.json"],
  [".claude/config/business-direction.json", "config/business-direction.json"],
  [".claude/config/instagram-campaign.json", "config/instagram-campaign.json"],
  [".claude/config/cce-essay-history.json", "config/cce-essay-history.json"],
  [".claude/config/coconala-listings.json", "config/coconala-listings.json"],
  [".claude/config/git-binary-policy.json", "config/git-binary-policy.json"],
  [".claude/config/reference-sources.json", "config/reference-sources.json"],
  [".claude/config/coconala-account.json", "config/coconala-account.json"],
  [".claude/config/note-competitors.json", "config/note-competitors.json"],
  [".claude/config/youtube-delivery.json", "config/youtube-delivery.json"],
  [".claude/config/character-poses.json", "config/character-poses.json"],
  [".claude/config/local-resources.json", "config/local-resources.json"],
  [".claude/config/note-membership.json", "config/note-membership.json"],
  [".claude/config/search-strategy.json", "config/search-strategy.json"],
  [".claude/config/seo-meta-config.json", "config/seo-meta-config.json"],
  [".claude/config/workflow-health.json", "config/workflow-health.json"],
  [".claude/state/sns/x-publish-log.csv", "data/sns/x-publish-log.csv"],
  [".claude/config/annual-roadmap.json", "config/annual-roadmap.json"],
  [".claude/config/content-themes.json", "config/content-themes.json"],
  [".claude/config/figure-sources.json", "config/figure-sources.json"],
  [".claude/config/ig-competitors.json", "config/ig-competitors.json"],
  [".claude/config/product-lineup.json", "config/product-lineup.json"],
  [".claude/config/seo-watchwords.json", "config/seo-watchwords.json"],
  [".claude/state/x-repost/config.json", "config/x-repost.json"],
  [".claude/config/affiliate-asp.json", "config/affiliate-asp.json"],
  [".claude/config/asset-storage.json", "config/asset-storage.json"],
  [".claude/config/career-funnel.json", "config/career-funnel.json"],
  [".claude/config/coconala-blog.json", "config/coconala-blog.json"],
  [".claude/config/content-rules.json", "config/content-rules.json"],
  [".claude/config/exam-calendar.json", "config/exam-calendar.json"],
  [".claude/config/figure-canvas.json", "config/figure-canvas.json"],
  [".claude/config/r2-delete-list.txt", "config/r2-delete-list.txt"],
  [".claude/config/utm-templates.json", "config/utm-templates.json"],
  [".claude/config/video-content.json", "config/video-content.json"],
  [".claude/config/x-competitors.json", "config/x-competitors.json"],
  [".claude/state/yt-posted-log.jsonl", "data/yt-posted-log.jsonl"],
  [".claude/config/disk-hygiene.json", "config/disk-hygiene.json"],
  [".claude/config/exam-formats.json", "config/exam-formats.json"],
  [".claude/config/growth-cycle.json", "config/growth-cycle.json"],
  [".claude/config/image-limits.json", "config/image-limits.json"],
  [".claude/config/drive-vault.json", "config/drive-vault.json"],
  [".claude/config/market-scan.json", "config/market-scan.json"],
  [".claude/config/note-funnel.json", "config/note-funnel.json"],
  [".claude/config/video-brand.json", "config/video-brand.json"],
  [".claude/config/cloudflare.json", "config/cloudflare.json"],
  [".claude/config/exam-stats.json", "config/exam-stats.json"],
  [".claude/config/ig-account.json", "config/ig-account.json"],
  [".claude/config/psi-config.json", "config/psi-config.json"],
  [".claude/state/experiments.json", "data/experiments.json"],
  [".claude/config/coconala/assets", "content/coconala/assets"],
  [".claude/config/x-account.json", "config/x-account.json"],
  [".claude/config/indexnow.json", "config/indexnow.json"],
  [".claude/config/kdp-memo.json", "config/kdp-memo.json"],
  [".claude/config/x-review.json", "config/x-review.json"],
  [".claude/state/weekly-metrics", "data/weekly-metrics"],
  [".claude/state/ig-competitors", "data/ig-competitors"],
  [".claude/config/domains.json", "config/domains.json"],
  [".claude/config/psi-urls.txt", "config/psi-urls.txt"],
  [".claude/state/x-competitors", "data/x-competitors"],
  [".claude/config/x-campaigns", "config/x-campaigns"],
  [".claude/state/x-metrics", "data/x-metrics"],
  [".claude/state/coconala", "data/coconala"],
  [".claude/state/metrics", "data/metrics"],
  [".claude/state/market", "data/market"],
  [".claude/state/sales", "data/sales"],
  [".claude/config/ogp", "config/ogp"],
  [".claude/state/note", "data/note"],
  [".claude/state/ads", "data/ads"],
];

/**
 * DN-0498（2026-10-02〜）で data/ の中を取得元ごとに組み替えたパス（旧 → 新）。MOVED_PATHS と同じく、追記だけを許す
 * 台帳の中の旧パスを読むために使う。文字列は前方一致、正規表現はパス全体に当てて置き換える。
 * .claude/ → data/ → 取得元ごとの 2 段の移動は resolveMovedPath が続けてたどる。
 * **ここに足した旧パス（文字列）は、検査のたびに check-information-architecture が禁止ルート・旧パス走査へ取り込む**
 * （.claude/config/information-architecture.json には書かない。移動表に載らない旧パスだけをそちらに書く）。
 */
export const RESTRUCTURED_PATHS = [
  ["data/sales/sales-log.json", "data/note/sales.json"],
  ["data/sales/kdp-royalties.json", "data/kdp/royalties.json"],
  ["data/note/magazines-snapshot.json", "data/note/magazines.json"],
  ["data/note/status-snapshot.json", "data/note/status.json"],
  [/^data\/metrics\/note\/articles-pv-(\d{4}-\d{2})\.json$/, "data/note/articles-pv/$1.json"],
  [/^data\/metrics\/note\/referrers-(\d{4}-\d{2})\.json$/, "data/note/referrers/$1.json"],
  ["data/coconala/orders-log.json", "data/coconala/orders.json"],
  ["data/coconala/kpi-log.json", "data/coconala/kpi.json"],
  ["data/coconala/analytics-snapshot.json", "data/coconala/analytics.json"],
  // SNS・アフィリエイト・サイトの計測（2026-10-02）
  [/^data\/x-metrics\/history\/(\d{4}-\d{2}-\d{2})\.json$/, "data/x/own-posts/$1.json"],
  ["data/sns/x-publish-log.csv", "data/x/publish-log.csv"],
  ["data/x-repost/reposted-log.json", "data/x/reposted.json"],
  ["data/yt-posted-log.jsonl", "data/youtube/posted.jsonl"],
  ["data/ads/a8-catalog.json", "data/a8/catalog.json"],
  ["data/ads/affiliate-catalog.json", "data/affiliate/catalog.json"],
  ["data/ads/inventory-latest.json", "data/a8/inventory.json"],
  ["data/metrics/affiliate/a8-report-log.json", "data/a8/report-log.json"],
  ["data/metrics/affiliate/a8-results.json", "data/a8/results.json"],
  ["data/metrics/affiliate/a8-ui/last-run.json", "data/a8/ui-last-run.json"],
  ["data/metrics/affiliate/a8-ui", "data/a8/ui"],
  ["data/metrics/affiliate/career-funnel-latest.json", "data/analysis/career-funnel.json"],
  ["data/metrics/affiliate/career-funnel-latest.md", "data/analysis/career-funnel.md"],
  ["data/metrics/affiliate/buildjob-report-latest.md", "data/analysis/buildjob-report.md"],
  [/^data\/metrics\/affiliate\/career-funnel-baseline-(\d{4}-\d{2}-\d{2})\.json$/, "data/analysis/career-funnel-baseline/$1.json"],
  [/^data\/metrics\/affiliate\/opportunities-(\d{4}-\d{2}-\d{2})\.json$/, "data/analysis/affiliate-opportunities/$1.json"],
  [/^data\/metrics\/affiliate\/research-baseline-(\d{4}-\d{2}-\d{2})\.json$/, "data/analysis/affiliate-research/$1.json"],
  [/^data\/metrics\/affiliate\/afb-outcomes-(\d{4}-\d{2}-\d{2})\.json$/, "data/afb/outcomes/$1.json"],
  [/^data\/metrics\/bing\/bing-(\d{4}-\d{2}-\d{2})\.json$/, "data/bing/snapshots/$1.json"],
  [/^data\/metrics\/psi\/psi-batch-([0-9T-]+)\.json$/, "data/psi/batch/$1.json"],
  [/^data\/metrics\/psi\/psi-single-([0-9T-]+)\.json$/, "data/psi/single/$1.json"],
  ["data/metrics/psi/latest-report.md", "data/analysis/psi-report.md"],
  [/^data\/metrics\/rum\/web-vitals-(\d{4}-\d{2}-\d{2})\.json$/, "data/rum/web-vitals/$1.json"],
  [/^data\/metrics\/cloudflare\/cf-zone-(\d{4}-\d{2}-\d{2})\.json$/, "data/cloudflare/zone/$1.json"],
  [/^data\/metrics\/instagram\/ig-insights-(\d{4}-\d{2}-\d{2})\.json$/, "data/instagram/insights/$1.json"],
  ["data/metrics/seo-meta/seo-meta-latest.json", "data/analysis/seo-meta.json"],
  // GSC・GA4 の一括でない取得（2026-10-02）
  ["data/metrics/gsc/sitemaps-latest.json", "data/gsc/sitemaps.json"],
  ["data/metrics/gsc/index-coverage-history.json", "data/gsc/index-coverage.json"],
  [/^data\/metrics\/url-inspection\/inspection-batch-([0-9T-]+Z?)\.json$/, "data/gsc/url-inspection/$1.json"],
  [/^data\/metrics\/url-inspection\/inspection-single-([0-9T-]+Z?)\.json$/, "data/gsc/url-inspection-single/$1.json"],
  ["data/metrics/gsc-indexing/history.json", "data/gsc/indexing-history.json"],
  ["data/metrics/gsc-indexing/priority-latest.json", "data/gsc/indexing-priority.json"],
  ["data/metrics/gsc-indexing/priority-latest.txt", "data/gsc/indexing-priority.txt"],
  ["data/metrics/gsc-indexing/requests-latest.json", "data/gsc/indexing-requests.json"],
  ["data/metrics/gsc-ui/last-run.json", "data/gsc/ui-last-run.json"],
  ["data/metrics/gsc-ui/ssot/history.json", "data/gsc/ui-history.json"],
  [/^data\/metrics\/gsc-ui\/ssot\/diff\/([0-9T-]+Z?)\.json$/, "data/gsc/ui-diff/$1.json"],
  ["data/metrics/gsc-ui/ssot/urls", "data/gsc/ui-urls.json"],
  ["data/metrics/gsc-ui", "data/gsc/ui"],
  ["data/metrics/ga4-admin/history.json", "data/ga4/admin-history.json"],
  ["data/metrics/ga4-admin/inventory-latest.json", "data/ga4/admin-inventory.json"],
  ["data/metrics/ga4-admin/last-run.json", "data/ga4/admin-last-run.json"],
  ["data/metrics/ga4-ui/last-run.json", "data/ga4/ui-last-run.json"],
  ["data/metrics/ga4-ui", "data/ga4/ui"],
  [/^data\/metrics\/gsc\/coverage-diagnosis-([0-9T-]+Z?)\.json$/, "data/analysis/gsc-coverage-diagnosis/$1.json"],
  // GA4・GSC の週次取得を日ごとの 1 ファイルへ（取得時刻の JST の日。中の枠は scripts/lib/metric-reports.mjs の readReportRef が読む）
  [/^data\/metrics\/(ga4|gsc)\/(?:(?:ga4|gsc)-[A-Za-z-]+|bot-audit)-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})Z?\.json$/,
    (_, source, y, mo, d, h, mi, s) => `data/${source}/reports/${new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) + 9 * 3600_000).toISOString().slice(0, 10)}.json`],
  ["data/metrics/ga4/quiz-premium-funnel-latest.json", "data/analysis/quiz-premium-funnel.json"],
  // 順位の見張り: 1 件 1 ファイル → 月ごとの追記ファイル（行は recordId で引く）
  // 事業の台帳・週次・月次と分析（2026-10-02）。台帳はファイル名を保ったままフォルダごと
  ["data/metrics/business", "data/business/records"],
  ["data/experiments.json", "data/business/experiments.json"],
  ["data/weekly-metrics", "data/business/weekly"],
  ["data/metrics/monthly-snapshot.json", "data/business/monthly-snapshot.json"],
  ["data/metrics/crosswalk", "data/analysis/crosswalk"],
  ["data/metrics/monetization", "data/analysis/monetization"],
  ["data/metrics/growth", "data/analysis/growth"],
  // 2026-10-02 段階 4: 設定の統合（複数ファイル→1 ファイルの枠）と、設定でない計画・記録の移設
  ["config/note-competitors.json", "config/competitors.json"],
  ["config/x-competitors.json", "config/competitors.json"],
  ["config/ig-competitors.json", "config/competitors.json"],
  ["config/coconala-competitors.json", "config/competitors.json"],
  ["config/youtube-competitors.json", "config/competitors.json"],
  ["config/ogp/rules.json", "config/ogp/settings.json"],
  ["config/ogp/templates.json", "config/ogp/settings.json"],
  ["config/ogp/text.json", "config/ogp/settings.json"],
  ["config/note-intro-standard-civil2.json", "config/note-intro-standard.json"],
  ["config/note-intro-standard-civil-cross.json", "config/note-intro-standard.json"],
  ["config/note-character-covers.json", "config/note-covers.json"],
  ["config/note-cover-categories.json", "config/note-covers.json"],
  ["config/note-cover-magazine-v4.json", "config/note-covers.json"],
  ["config/x-review.json", "content/sns/x/review.json"],
  ["config/x-campaigns", "content/sns/x/campaigns"],
  ["config/coconala-thumb-approved.json", "data/coconala/thumb-approved.json"],
  // 2026-10-02 段階 4 の続き: 設定でない作業の台帳・計画を config/ から出す（旧パスは check-information-architecture が MOVED/RESTRUCTURED から自動で止める）
  ["config/r2-delete-list.txt", "data/r2/delete-list.txt"],
  ["config/past-exam-inventory.json", "data/pastexams/inventory.json"],
  ["config/instagram-campaign.json", "content/sns/instagram/campaign.json"],
  ["config/pe-first-stage-historical-sources.json", "data/pastexams/inventory.json"],
  [/^data\/metrics\/gsc\/rank-watch\/((?:watch|run)-(\d{4}-\d{2})-[0-9T-]+Z-[0-9a-f]{8})\.json$/, "data/gsc/rank-watch/$2.jsonl#$1"],
];

const PATH_MOVES = [...MOVED_PATHS, ...RESTRUCTURED_PATHS];

function moveOnce(p) {
  for (const [from, to] of PATH_MOVES) {
    if (from instanceof RegExp) {
      if (from.test(p)) return p.replace(from, to);
    } else if (p === from || p.startsWith(`${from}/`)) return to + p.slice(from.length);
  }
  return p;
}

/** 記録に書かれたリポジトリ相対パスを、移動後の位置へ読み替える（移していないパスはそのまま・何段の移動でもたどる） */
export function resolveMovedPath(p) {
  if (typeof p !== 'string') return p;
  for (let i = 0; i < 8; i++) {
    const next = moveOnce(p);
    if (next === p) return p;
    p = next;
  }
  throw new Error(`移動表が循環している: ${p}`);
}
