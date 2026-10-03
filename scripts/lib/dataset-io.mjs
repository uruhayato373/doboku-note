/**
 * dataset-io.mjs — 台帳（datasets.mjs）の id で設定・記録を読む（依存ゼロ）。
 *
 * パスを直書きせず id から引き、拡張子で読み方を決める（.json＝値・.jsonl＝行の配列・それ以外＝文字列）。
 * 壊れていたら場所（リポジトリ相対のパス・JSON Lines は行番号）つきで投げる。
 * 以前は `JSON.parse(readFileSync(join(root, datasetPath(id)), 'utf8'))` を各スクリプトが書き、壊れたときに場所が出なかった。
 *
 * 書き込みは dataset-write.mjs（型の検査があるので zod を読む）。依存ゼロのワークフローが読むのはこちら（読み）だけ。
 * `readDataset` と `readDatasetIf` の違いは「ファイルが無いとき」だけ（無ければ投げる／null）。壊れていればどちらも投げる。
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { datasetFiles, datasetPath } from './datasets.mjs';
import { parseJson } from './json-io.mjs';

/** ファイルの中身を読む（file はリポジトリ相対。エラーの場所表示に使う） */
function parseFile(root, file) {
  const text = readFileSync(join(root, file), 'utf8');
  if (file.endsWith('.json')) return parseJson(text, file);
  if (!file.endsWith('.jsonl')) return text;
  return text.split(/\r?\n/).flatMap((line, i) => {
    if (!line.trim()) return [];
    try {
      return [JSON.parse(line.replace(/^\uFEFF/, ''))];
    } catch (e) {
      throw new Error(`${file}: ${i + 1} 行目を読めない（${e.message}）`, { cause: e });
    }
  });
}

/**
 * データセットを読む。ファイルが無いときは投げる。
 * @param {string} root リポジトリのルート
 * @param {string} id 台帳の id
 * @param {{ values?: Record<string, string> }} [opts] パスの可変部分（{date} など。datasetPath と同じ）
 */
export function readDataset(root, id, { values } = {}) {
  return parseFile(root, datasetPath(id, values));
}

/** `readDataset` のファイルが無いときだけ null を返す版 */
export function readDatasetIf(root, id, { values } = {}) {
  const file = datasetPath(id, values);
  return existsSync(join(root, file)) ? parseFile(root, file) : null;
}

/**
 * 時系列のデータセットの最新（名前の降順の先頭）を読む。1 件も無ければ null。
 * @returns {{ file: string, data: any } | null} file はリポジトリ相対
 */
export function readLatest(root, id) {
  const file = datasetFiles(root, id)[0];
  return file ? { file, data: parseFile(root, file) } : null;
}
