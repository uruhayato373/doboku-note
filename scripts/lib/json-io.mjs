/**
 * json-io.mjs — JSON ファイルの読み書きの共通部品（依存ゼロ）。
 *
 * なぜ要るか: `readJson` を各スクリプトが個別に定義し（壊れたときに場所が出ない・try/catch で握りつぶす・握りつぶさないが
 * 混在していた）、書き込みも `writeFileSync(JSON.stringify(x, null, 2))` が数百か所に散って、字下げ・末尾改行・改行コードが
 * 揃っていなかった。ここに集める。台帳の id で引く読み書きは dataset-io.mjs（読み）と dataset-write.mjs（書き・型の検査つき）。
 *
 * 依存ゼロに保つ: npm ci をしないワークフローが（間接にも）読む（tests/workflow-zero-dependency.test.mjs が import をたどる）。
 * 新しい `readJson` を各ファイルで定義しない（tests/read-json-ratchet.test.mjs が数を数える）。ここから import する。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** JSON の文字列を読む。壊れていたら where（ファイルの場所など）つきで投げる。先頭の BOM は無視する */
export function parseJson(text, where = '(JSON)') {
  try {
    return JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch (e) {
    throw new Error(`${where}: JSON を読めない（${e.message}）`, { cause: e });
  }
}

/** root からの相対パスの JSON を読む。ファイルが無い・壊れているときは投げる（壊れていたら場所つき） */
export function readJson(root, file) {
  return parseJson(readFileSync(join(root, file), 'utf8'), file);
}

/** `readJson` のファイルが無いときだけ null を返す版。壊れているときは投げる（「無い」と「壊れた」を混ぜない） */
export function readJsonIf(root, file) {
  return existsSync(join(root, file)) ? readJson(root, file) : null;
}

/** 記録の書式: 字下げ 2・LF・末尾改行。JSON にできない値（undefined など）は投げる */
export function formatJson(value) {
  const text = JSON.stringify(value, null, 2);
  if (text === undefined) throw new TypeError('JSON にできない値（undefined・関数）は書けない');
  return `${text}\n`;
}

/** JSON Lines の 1 行（改行なしの 1 件＋LF）。JSON にできない値は投げる */
export function formatJsonlRow(row) {
  const line = JSON.stringify(row);
  if (line === undefined) throw new TypeError('JSON にできない値（undefined・関数）は書けない');
  return `${line}\n`;
}

/**
 * JSON を書く（親ディレクトリは作る）。ファイルの中身が同じなら書かない（mtime と git の差分を動かさない）。
 * @returns {{ changed: boolean }}
 */
export function writeJson(root, file, value) {
  const abs = join(root, file);
  const text = formatJson(value);
  if (existsSync(abs) && readFileSync(abs, 'utf8') === text) return { changed: false };
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text);
  return { changed: true };
}
