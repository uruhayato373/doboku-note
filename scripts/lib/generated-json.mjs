/**
 * generated-json.mjs — 記事から作り直す生成物の JSON（演習データなど）を、中身が変わったときだけ書く（DN-0647・DN-0552）。
 *
 * 生成のたびに generatedAt が変わると、refresh-indexes を回すだけで差分が出る。中身（generatedAt 以外）が前と同じなら書かず、
 * 変わったときだけ新しい generatedAt で書く。
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const withoutStamp = (v) => JSON.stringify({ ...v, generatedAt: null });

/**
 * @param {string} file 書き出し先の絶対パス
 * @param {object} value generatedAt を持つ生成物
 * @param {{ indent?: number, newline?: boolean }} [opts] 既存ファイルの書式（字下げ・末尾改行）に合わせる
 * @returns {boolean} 書いたら true
 */
export function writeGeneratedJson(file, value, { indent = 2, newline = true } = {}) {
  if (existsSync(file)) {
    try {
      const prev = JSON.parse(readFileSync(file, 'utf8'));
      if (withoutStamp(prev) === withoutStamp(value)) return false;
    } catch { /* 壊れていれば書き直す */ }
  }
  writeFileSync(file, JSON.stringify(value, null, indent) + (newline ? '\n' : ''), 'utf8');
  return true;
}
