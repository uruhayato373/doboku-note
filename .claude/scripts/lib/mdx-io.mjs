// .claude/scripts/lib/mdx-io.mjs
//
// MDX ファイルの読み書き共通ユーティリティ。
//
// 目的: 元ファイルの改行コード（CRLF or LF）を保持したまま書き戻すこと。
// 99.9% の content/site/ 配下の MDX は CRLF だが、gray-matter の
// matter.stringify は LF のみを出力し、文字列連結 `raw + '\n' + ...` も
// LF を混入させる。MDX を書き込むスクリプトは必ずこのユーティリティを
// 経由することで「混在改行コード」を構造的に防止する。
//
// pre-commit hook (scripts/pre-commit-mdx.mjs) は混在を検出して reject するが、
// 100ファイル単位で reject されると修復作業が大変なので、書き込み時点で
// 正しい改行に揃えるのが本ユーティリティの責務。
//
// 使用例:
//   import { transformMdxFile } from './lib/mdx-io.mjs';
//   transformMdxFile(filePath, (raw) => raw.replace('foo', 'bar'));
//
//   // または read/write を分けて使う場合:
//   import { readMdxFile, writeMdxFile } from './lib/mdx-io.mjs';
//   const { raw, eol } = readMdxFile(filePath);
//   const newRaw = doSomething(raw);
//   writeMdxFile(filePath, newRaw, eol);

import { readFileSync, writeFileSync } from 'node:fs';

/**
 * MDX ファイルを読み込み、改行コード情報も返す。
 *
 * @param {string} path
 * @returns {{ raw: string, eol: '\r\n' | '\n', hadCRLF: boolean }}
 */
export function readMdxFile(path) {
  const raw = readFileSync(path, 'utf-8');
  const hadCRLF = raw.includes('\r\n');
  return {
    raw,
    eol: hadCRLF ? '\r\n' : '\n',
    hadCRLF,
  };
}

/**
 * MDX ファイルを書き込む。指定された改行コードに正規化する。
 * eol を渡さない場合はデフォルトで LF とする（混在は必ず排除する）。
 *
 * @param {string} path
 * @param {string} content
 * @param {'\r\n' | '\n'} [eol='\n']
 */
export function writeMdxFile(path, content, eol = '\n') {
  // 既存の改行をすべて LF に正規化してから、目的の eol へ統一
  // これにより matter.stringify の LF 出力や文字列連結の LF 混入が解消される
  const lfNormalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const finalContent = eol === '\r\n'
    ? lfNormalized.replace(/\n/g, '\r\n')
    : lfNormalized;
  writeFileSync(path, finalContent, 'utf-8');
}

/**
 * 「読み込んで加工して書き戻す」ヘルパー。最も推奨される使い方。
 * 元の改行コードを自動的に保持する。
 *
 * @param {string} path
 * @param {(raw: string) => string | null} transform
 *   transform 関数は新しい raw を返す。null を返すと書き込みをスキップ。
 * @returns {boolean} 書き込みが行われたか
 */
export function transformMdxFile(path, transform) {
  const { raw, eol } = readMdxFile(path);
  const newRaw = transform(raw);
  if (newRaw === null || newRaw === raw) return false;
  writeMdxFile(path, newRaw, eol);
  return true;
}
