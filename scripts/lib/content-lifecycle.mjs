/**
 * content-lifecycle.mjs — 全チャネル共通の「コンテンツ ライフサイクル ステージ」語彙と写像。
 *
 * 目的: チャネルごとに別々の状態語彙（video の statusEnum 11 値、coconala の listed/paused、
 *   kindle の live/in_review、X の queued/scheduled/posted …）を、**企画 → 下書き → 公開**の
 *   共通の物差しへ写像して横断で数えられるようにする。
 *
 * 設計の芯（.claude/knowledge/reference/content-lifecycle.md が人間向け真実源）:
 *   1. **各チャネルのネイティブ状態が真実源**。ここは写像するだけで、状態を書き換えない・
 *      第2の状態台帳を作らない。
 *   2. 写像は**データだけで決まる純関数**として repo 共有の ESM に置く。admin（React）へ
 *      判定ロジックを再実装しない（video-content-policy §10 の一般化）。
 *   3. **未知の値を黙って published 側へ寄せない**。写像できない値は `null` を返し、
 *      呼び手が「不明」として可視化する（CLAUDE.md §9「検査ゼロを PASS と呼ばない」の同型）。
 */

/** 共通ステージ（順序＝ライフサイクルの進行順。UI の列順もこれに従う） */
export const STAGES = ['planned', 'draft', 'review', 'scheduled', 'published', 'retired'];

/** 表示ラベル（admin・CLI 共通） */
export const STAGE_LABELS = {
  planned: '企画',
  draft: '下書き',
  review: 'レビュー',
  scheduled: '予約',
  published: '公開',
  retired: '停止',
};

export const STAGE_DESCRIPTIONS = {
  planned: '企画のみ（本文の実体がまだ無い）',
  draft: '実体はあるが非公開',
  review: 'QA・承認・審査の待ち',
  scheduled: '公開日時が決まっていて公開待ち',
  published: '公開中',
  retired: '停止・アーカイブ・休止',
};

/**
 * 空のカウンタ（全ステージ 0）。`unknown` は写像不能の受け皿で STAGES には含めない。
 * @returns {Record<string, number>}
 */
export function emptyCounts() {
  /** @type {Record<string, number>} */
  const c = {};
  for (const s of STAGES) c[s] = 0;
  c.unknown = 0;
  return c;
}

/**
 * counts へ 1 件加算する（stage が null なら unknown へ）
 * @param {Record<string, number>} counts
 * @param {string|null} stage
 */
export function tally(counts, stage) {
  const key = stage && STAGES.includes(stage) ? stage : 'unknown';
  counts[key] += 1;
  return counts;
}

// ─── チャネル別 写像 ───────────────────────────────────────
// 各関数は「そのチャネルのネイティブ状態 → 共通ステージ」。未知は null。

/**
 * 動画パック（DN-0110）。真実源 .claude/state/video-content-status.json の statusEnum。
 * @param status ネイティブ status
 * @param hasBody script.md / storyboard.json の実体があるか（draft を planned と区別する）
 */
export function videoStatusToStage(status, hasBody = true) {
  switch (status) {
    case 'draft':
      // 企画だけ（manifest のみ）と、台本を書き始めた下書きを分ける。
      return hasBody ? 'draft' : 'planned';
    case 'qa_blocked':
      return 'draft';
    case 'qa_passed':
    case 'approved':
      return 'review';
    case 'rendered':
    case 'uploaded_private':
    case 'scheduled':
      return 'scheduled';
    case 'published':
    case 'measured':
    case 'refresh_due':
      return 'published';
    case 'failed':
      return 'draft';
    case 'stopped':
      return 'retired';
    default:
      return null;
  }
}

/**
 * サイト記事（content/site の frontmatter published）。統合済み 301 は retired。
 * @param {{ published: boolean, redirected?: boolean }} doc
 * @returns {string}
 */
export function siteDocToStage({ published, redirected = false }) {
  if (redirected) return 'retired';
  return published ? 'published' : 'draft';
}

/**
 * note 記事・マガジン（note-magazines.ts の published / repo にあるだけの原稿）
 * @param {{ published: boolean, hasLiveUrl?: boolean|null }} item
 * @returns {string}
 */
export function noteToStage({ published, hasLiveUrl = null }) {
  if (published) return 'published';
  // 未公開でも noteUrl が入っているものは公開手前（下書き作成済み）と読む
  return hasLiveUrl ? 'review' : 'draft';
}

/**
 * ココナラ出品（src/lib/coconala-services.ts）。paused は pauseReason で意味が分かれる。
 * @param {string} status
 * @param {string|null} [pauseReason]
 * @returns {string|null}
 */
export function coconalaStatusToStage(status, pauseReason = null) {
  switch (status) {
    case 'draft':
      return 'draft';
    case 'listed':
      return 'published';
    case 'paused':
      // absence（不在で一時休止）は戻す前提＝予約待ちに近い。retired（恒久廃止）は停止。
      return pauseReason === 'absence' ? 'scheduled' : 'retired';
    case 'archived':
      return 'retired';
    default:
      return null;
  }
}

/** Brain 商品（src/lib/brain-products.ts） */
export function brainStatusToStage(status) {
  switch (status) {
    case 'draft':
      return 'draft';
    case 'submitted':
      return 'review';
    case 'listed':
      return 'published';
    case 'rejected':
      return 'draft';
    default:
      return null;
  }
}

/** Kindle（scripts/kindle-published/catalog.json） */
export function kindleStatusToStage(status) {
  switch (status) {
    case 'draft':
      return 'draft';
    case 'in_review':
      return 'review';
    case 'live':
      return 'published';
    case 'unpublished':
      return 'retired';
    default:
      return null;
  }
}

/** X 投稿（content/sns/x/draft 配下 status.json の tweets[].status） */
export function xTweetStatusToStage(status) {
  switch (status) {
    case 'queued':
      return 'draft';
    case 'scheduled':
      return 'scheduled';
    case 'posted':
      return 'published';
    case 'replaced':
    case 'cancelled':
      return 'retired';
    default:
      return null;
  }
}

/** YouTube Shorts 台帳（.claude/state/youtube-schedule.json の items[].status） */
export function youtubeScheduleStatusToStage(status) {
  switch (status) {
    case 'pending':
      return 'scheduled';
    case 'uploaded':
      return 'published';
    case 'retired':
    case 'skipped':
      return 'retired';
    case 'failed':
      return 'draft';
    default:
      return null;
  }
}

/**
 * Instagram パック。公開の実体は posted.json の有無（ネイティブな status 文字列は無い）。
 * 呼び手は「投稿済みを示す何か（オブジェクトでも畳んだ文字列でも）」を posted に渡す。
 * @param {{ posted?: unknown, scheduled?: boolean }} pack
 * @returns {string}
 */
export function igPackToStage({ posted, scheduled = false }) {
  if (posted) return 'published';
  if (scheduled) return 'scheduled';
  return 'draft';
}
