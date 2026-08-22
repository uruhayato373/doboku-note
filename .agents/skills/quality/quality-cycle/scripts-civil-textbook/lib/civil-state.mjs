// .claude/skills/quality/quality-cycle/scripts/lib/civil-state.mjs
//
// Civil Textbook Cycle の state JSON を読み書きするユーティリティ。
//
// 対象ファイル:
//   - .claude/state/civil-quality-scores.json     : civil-construction-review 評価結果
//   - .claude/state/civil-quality-cycle-state.json: 各ページの状態遷移履歴
//   - .claude/state/civil-review-queue.md         : 人間レビュー待ちリスト
//
// CEM 版 (.claude/skills/quality/quality-cycle/scripts/lib/quality-state.mjs) の civil 版。
// 全ファイル LF 改行で書き込む（gitattributes 不要・git diff ノイズ最小）。

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DATA_DIR = '.claude/state';
const SCORES_PATH = `${DATA_DIR}/civil-quality-scores.json`;
const STATE_PATH = `${DATA_DIR}/civil-quality-cycle-state.json`;
const REVIEW_QUEUE_PATH = `${DATA_DIR}/civil-review-queue.md`;

export const PATHS = {
  SCORES: SCORES_PATH,
  STATE: STATE_PATH,
  REVIEW_QUEUE: REVIEW_QUEUE_PATH,
};

function ensureDir(filepath) {
  const d = dirname(filepath);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function readJson(filepath, fallback) {
  if (!existsSync(filepath)) return fallback;
  try {
    return JSON.parse(readFileSync(filepath, 'utf-8'));
  } catch (e) {
    console.error(`[civil-state] Failed to parse ${filepath}: ${e.message}`);
    return fallback;
  }
}

function writeJson(filepath, data) {
  ensureDir(filepath);
  writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// ── civil-quality-scores.json ───────────────────────────────────

export function readScores() {
  return readJson(SCORES_PATH, { version: 1, scored_at: null, pages: {} });
}

export function writeScores(data) {
  data.scored_at = new Date().toISOString();
  writeJson(SCORES_PATH, data);
}

// ── civil-quality-cycle-state.json ──────────────────────────────

export function readState() {
  return readJson(STATE_PATH, {
    version: 1,
    cycle: 0,
    started_at: null,
    pages: {},
  });
}

export function writeState(data) {
  writeJson(STATE_PATH, data);
}

/**
 * 1ページの状態を更新し、history に append する。
 *
 * @param {object} state - readState() の返り値
 * @param {string} slug
 * @param {string} status - new status
 * @param {object} extra - history entry に追加するフィールド
 */
export function updatePageState(state, slug, status, extra = {}) {
  if (!state.pages[slug]) {
    state.pages[slug] = { status: 'unscored', history: [] };
  }
  state.pages[slug].status = status;
  state.pages[slug].history.push({
    date: new Date().toISOString(),
    action: status,
    ...extra,
  });
}

// ── civil-review-queue.md ───────────────────────────────────────

export function writeReviewQueue(markdown) {
  ensureDir(REVIEW_QUEUE_PATH);
  writeFileSync(REVIEW_QUEUE_PATH, markdown, 'utf-8');
}

// ── 加重スコア計算（civil-construction-review の重みに準拠）─────

export const WEIGHTS = {
  structure: 0.20,
  principle: 0.20,
  mobile: 0.30,
  figures: 0.15,
  reference: 0.15,
};

export function computeWeighted(scores) {
  const hasZero = Object.values(scores).some((v) => v === 0);
  const raw = Object.entries(WEIGHTS).reduce(
    (acc, [k, w]) => acc + (scores[k] || 0) * w,
    0,
  );
  if (hasZero) return Math.min(raw, 1.0);
  return parseFloat(raw.toFixed(2));
}
