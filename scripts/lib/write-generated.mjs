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
  if (existsSync(path)) {
    try {
      const prev = JSON.parse(readFileSync(path, 'utf8'));
      if (JSON.stringify(strip(prev, volatileKeys)) === JSON.stringify(strip(data, volatileKeys))) return false;
    } catch {
      // 壊れた既存ファイルは上書きする
    }
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + (trailingNewline ? '\n' : ''), 'utf8');
  return true;
}
