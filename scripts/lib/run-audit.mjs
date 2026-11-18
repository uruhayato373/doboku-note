/**
 * run-audit.mjs — 収集物の検査スクリプト（check-gsc-ui-run・check-a8-ui-run など）が共有する小さな部品。
 *
 * 所見は FAIL / WARN / INFO の 3 段で集める。終了コードの規約は quality-audit と同じ:
 *   0 = 検査して違反なし / 1 = FAIL あり / 2 = 検査不成立（実検査 0 件。0 件を緑と呼ばない・CLAUDE.md §9）。
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function createFindings() {
  const f = { fail: [], warn: [], info: [] };
  return { ...f, add: (level, message) => f[level].push(message) };
}

/** 実検査数と FAIL から終了コードを決める（pure）。 */
export function exitCodeOf({ checked, fail }) {
  if (fail.length > 0) return 1;
  if (checked === 0) return 2;
  return 0;
}

export const sha256Of = (buf) => createHash('sha256').update(buf).digest('hex');

export function readJsonOrNull(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/** run ディレクトリ名（2026-11-01T04-40-26Z 形）を古い順に返す。_adhoc などは除く。 */
export function listRunIds(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}T/.test(e.name))
    .map((e) => e.name)
    .sort();
}

/** 所見を表示用の行へ（pure）。 */
export function renderLines(tag, { fail, warn, info }) {
  return [
    ...info.map((m) => `${tag} INFO ${m}`),
    ...warn.map((m) => `${tag} WARN ${m}`),
    ...fail.map((m) => `${tag} FAIL ${m}`),
  ];
}
