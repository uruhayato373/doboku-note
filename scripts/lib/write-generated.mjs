/**
 * write-generated.mjs — ビルド時に作り直す生成物（src/config/*.json など）の書き込み。
 *
 * 生成時刻（generated_at 等）だけが変わる再生成で差分を出さない。中身が同じなら書かず、
 * 前回の生成時刻を残す（2026-09-26: ビルドのたびに時刻だけの差分が6ファイル出て、
 * 他人の変更と取り違えた）。中身が変わったときだけ新しい時刻で書く。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const strip = (obj, keys) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = { ...obj };
  for (const k of keys) delete out[k];
  return out;
};

/**
 * @param {string} path
 * @param {object} data
 * @param {{ volatileKeys?: string[], trailingNewline?: boolean }} [opts]
 * @returns {boolean} 書いたら true（中身が同じで書かなかったら false）
 */
export function writeJsonIfChanged(path, data, { volatileKeys = ['generated_at'], trailingNewline = true } = {}) {
  if (jsonMatches(path, data, { volatileKeys })) return false;
  writeFileSync(path, JSON.stringify(data, null, 2) + (trailingNewline ? '\n' : ''), 'utf8');
  return true;
}

/**
 * 既存ファイルの中身が data と同じか（生成時刻などの volatileKeys は比べない）。
 * 生成物の `--check`（書かずに古さだけ見る）で使う。ファイルが無い・壊れているときは false。
 * @param {string} path
 * @param {object} data
 * @param {{ volatileKeys?: string[] }} [opts]
 */
export function jsonMatches(path, data, { volatileKeys = ['generated_at'] } = {}) {
  if (!existsSync(path)) return false;
  try {
    const prev = JSON.parse(readFileSync(path, 'utf8'));
    return JSON.stringify(strip(prev, volatileKeys)) === JSON.stringify(strip(data, volatileKeys));
  } catch {
    return false;
  }
}
