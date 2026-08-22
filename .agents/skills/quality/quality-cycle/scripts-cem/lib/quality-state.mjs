// .claude/skills/quality/quality-cycle/scripts/lib/quality-state.mjs
//
// Quality Cycle の state JSON を読み書きするユーティリティ。
//
// 対象ファイル:
//   - .claude/state/mechanical-screen.json  : Tier 1 機械的指標
//   - .claude/state/quality-scores.json     : Tier 2 質的評価結果
//   - .claude/state/quality-cycle-state.json: 各ページの状態遷移履歴
//   - .claude/state/flagship-100.json       : 上位 100 件のリスト
//
// 全ファイル LF 改行で書き込む（gitattributes 不要・git diff ノイズ最小）。

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DATA_DIR = '.claude/state';
const SCREEN_PATH = `${DATA_DIR}/mechanical-screen.json`;
const SCORES_PATH = `${DATA_DIR}/quality-scores.json`;
const STATE_PATH = `${DATA_DIR}/quality-cycle-state.json`;
const FLAGSHIP_PATH = `${DATA_DIR}/flagship-100.json`;
const REVIEW_QUEUE_PATH = `${DATA_DIR}/review-queue.md`;

export const PATHS = {
  SCREEN: SCREEN_PATH,
  SCORES: SCORES_PATH,
  STATE: STATE_PATH,
  FLAGSHIP: FLAGSHIP_PATH,
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
    console.error(`[quality-state] Failed to parse ${filepath}: ${e.message}`);
    return fallback;
  }
}

function writeJson(filepath, data) {
  ensureDir(filepath);
  writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// ── mechanical-screen.json ──────────────────────────────────────

export function readScreen() {
  return readJson(SCREEN_PATH, { version: 1, screened_at: null, pages: {} });
}

export function writeScreen(data) {
  data.screened_at = new Date().toISOString();
  writeJson(SCREEN_PATH, data);
}

// ── quality-scores.json ─────────────────────────────────────────

export function readScores() {
  return readJson(SCORES_PATH, { version: 1, scored_at: null, pages: {} });
}

export function writeScores(data) {
  data.scored_at = new Date().toISOString();
  writeJson(SCORES_PATH, data);
}

// ── quality-cycle-state.json ────────────────────────────────────

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

// ── flagship-100.json ───────────────────────────────────────────

export function readFlagship() {
  return readJson(FLAGSHIP_PATH, { version: 1, generated_at: null, slugs: [] });
}

export function writeFlagship(slugs) {
  writeJson(FLAGSHIP_PATH, {
    version: 1,
    generated_at: new Date().toISOString(),
    slugs,
  });
}

// ── review-queue.md ─────────────────────────────────────────────

export function writeReviewQueue(markdown) {
  ensureDir(REVIEW_QUEUE_PATH);
  writeFileSync(REVIEW_QUEUE_PATH, markdown, 'utf-8');
}
