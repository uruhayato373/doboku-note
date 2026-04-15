// scripts/lib/experiments-state.mjs
//
// NSM 実験ライフサイクルの state JSON を読み書きするユーティリティ。
//
// 対象ファイル:
//   - .claude/state/experiments.json        : 実験リスト + 状態遷移履歴
//
// 状態遷移:
//   proposed → running → measuring → done / abandoned
//
// 参照: docs/project/17_data-storage-strategy.md (state 管理方針)
//       .claude/skills/management/nsm-experiment/SKILL.md (利用側)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const EXPERIMENTS_PATH = '.claude/state/experiments.json';

export const PATHS = {
  EXPERIMENTS: EXPERIMENTS_PATH,
};

export const VALID_STATUSES = ['proposed', 'running', 'measuring', 'done', 'abandoned'];

function ensureDir(filepath) {
  const d = dirname(filepath);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
}

function readJson(filepath, fallback) {
  if (!existsSync(filepath)) return fallback;
  try {
    return JSON.parse(readFileSync(filepath, 'utf-8'));
  } catch (e) {
    console.error(`[experiments-state] Failed to parse ${filepath}: ${e.message}`);
    return fallback;
  }
}

function writeJson(filepath, data) {
  ensureDir(filepath);
  writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// ── 読み取り ─────────────────────────────────────────────────

export function readExperiments() {
  return readJson(EXPERIMENTS_PATH, {
    version: 1,
    updated_at: null,
    experiments: [],
  });
}

export function writeExperiments(data) {
  data.updated_at = new Date().toISOString();
  writeJson(EXPERIMENTS_PATH, data);
}

export function getExperiment(id) {
  const data = readExperiments();
  return data.experiments.find((e) => e.id === id) || null;
}

export function listByStatus(status) {
  const data = readExperiments();
  if (!status) return data.experiments;
  return data.experiments.filter((e) => e.status === status);
}

export function listActive() {
  // active = proposed 以外で完了していないもの（running + measuring）
  const data = readExperiments();
  return data.experiments.filter((e) => e.status === 'running' || e.status === 'measuring');
}

// ── 書き込み ─────────────────────────────────────────────────

function nextId(data) {
  const maxNum = data.experiments.reduce((acc, e) => {
    const m = e.id?.match(/^EXP-(\d+)$/);
    if (!m) return acc;
    return Math.max(acc, parseInt(m[1], 10));
  }, 0);
  return `EXP-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * 新規実験を追加。id 未指定なら自動採番。
 *
 * @param {object} exp - { title, hypothesis, target_metric, target_delta, baseline?, actions?, ... }
 * @returns 追加された実験（id 込み）
 */
export function addExperiment(exp) {
  const data = readExperiments();
  const id = exp.id || nextId(data);
  const now = new Date().toISOString();
  const entry = {
    id,
    title: exp.title,
    hypothesis: exp.hypothesis,
    target_metric: exp.target_metric,
    target_delta: exp.target_delta,
    baseline: exp.baseline || null,
    status: 'proposed',
    created_at: exp.created_at || now,
    started_at: null,
    result: null,
    learnings: null,
    closed_at: null,
    actions: exp.actions || [],
    history: [
      { date: now, action: 'proposed' },
    ],
    ...exp,
    id, // guarantee id stays
    status: 'proposed', // guarantee initial status
  };
  data.experiments.push(entry);
  writeExperiments(data);
  return entry;
}

/**
 * 実験の部分更新。
 */
export function updateExperiment(id, patch) {
  const data = readExperiments();
  const idx = data.experiments.findIndex((e) => e.id === id);
  if (idx === -1) throw new Error(`Experiment not found: ${id}`);
  data.experiments[idx] = { ...data.experiments[idx], ...patch };
  writeExperiments(data);
  return data.experiments[idx];
}

/**
 * 状態遷移。history に記録。
 *
 * 許可される遷移:
 *   proposed → running | abandoned
 *   running → measuring | abandoned
 *   measuring → done | running (re-measure)
 *   done → (終了)
 *   abandoned → (終了)
 *
 * @param {string} id
 * @param {string} newStatus
 * @param {object} extra - history entry に追加するフィールド
 */
export function transitionStatus(id, newStatus, extra = {}) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }
  const data = readExperiments();
  const exp = data.experiments.find((e) => e.id === id);
  if (!exp) throw new Error(`Experiment not found: ${id}`);

  const allowed = {
    proposed: ['running', 'abandoned'],
    running: ['measuring', 'abandoned'],
    measuring: ['done', 'running'],
    done: [],
    abandoned: [],
  };
  if (!allowed[exp.status]?.includes(newStatus)) {
    throw new Error(`Invalid transition: ${exp.status} → ${newStatus}`);
  }

  const now = new Date().toISOString();
  exp.status = newStatus;
  exp.history = exp.history || [];
  exp.history.push({ date: now, action: newStatus, ...extra });

  // 特定の遷移でタイムスタンプフィールドを更新
  if (newStatus === 'running' && !exp.started_at) exp.started_at = now;
  if (newStatus === 'done' || newStatus === 'abandoned') exp.closed_at = now;

  writeExperiments(data);
  return exp;
}
