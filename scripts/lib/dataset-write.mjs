/**
 * dataset-write.mjs — 台帳（datasets.mjs）の id で設定・記録を書く。
 *
 * 書く前に台帳の決まりを守らせる:
 *   - 型（schema）のあるデータセットは、書く中身（ファイルに入る JSON そのもの）を型で検査してから書く。合わなければ何も書かず投げる
 *   - immutable（中身を変えない台帳）の既存ファイルは上書きしない（同じ中身なら何もしない）。新規は排他的に作る（'wx'）
 *   - 書式は字下げ 2・LF・末尾改行（json-io.mjs の formatJson）。ファイルの中身が同じなら書かない
 *
 * 型の検査に zod を使う（dataset-validate.mjs）ので**依存ゼロではない**。npm ci をしないワークフローが（間接にも）読む
 * ファイルから import しない（tests/workflow-zero-dependency.test.mjs が止める）。そうした経路の書き込みは json-io.mjs の
 * `writeJson`（書式と「同じなら書かない」だけ）を使い、読みは dataset-io.mjs。
 */
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { datasetPath, resolveDataset } from './datasets.mjs';
import { schemaOf } from './dataset-validate.mjs';
import { formatJson, formatJsonlRow } from './json-io.mjs';

/** 型に合わない箇所を何件まで出すか（check-datasets の validateFiles と同じ） */
const MAX_ISSUES = 5;

/** 型のあるデータセットなら value を検査し、合わなければ場所つきで投げる（型が無ければ何もしない） */
function assertMatchesSchema(dataset, value, what) {
  const schema = schemaOf(dataset);
  if (!schema) return;
  const r = schema.safeParse(value);
  if (r.success) return;
  const { issues } = r.error;
  const shown = issues.slice(0, MAX_ISSUES).map((i) => `${i.path.join('.') || '(全体)'}: ${i.message}`);
  if (issues.length > MAX_ISSUES) shown.push(`ほか ${issues.length - MAX_ISSUES} 件（全 ${issues.length} 件）`);
  throw new Error(`${dataset.id}: ${what}が型（${dataset.schema}）に合わないので書かない — ${shown.join(' / ')}`);
}

/**
 * データセットを書く（.json＝値・.jsonl＝行の配列・それ以外＝文字列）。
 * @param {string} root リポジトリのルート
 * @param {string} id 台帳の id
 * @param {unknown} value 書く値
 * @param {{ values?: Record<string, string> }} [opts] パスの可変部分（{date} など。datasetPath と同じ）
 * @returns {{ file: string, changed: boolean }} file はリポジトリ相対。changed=false は中身が同じで書かなかった
 */
export function writeDataset(root, id, value, { values } = {}) {
  const file = datasetPath(id, values);
  const dataset = resolveDataset(id);
  let text;
  if (file.endsWith('.json')) text = formatJson(value);
  else if (file.endsWith('.jsonl')) {
    if (!Array.isArray(value)) throw new TypeError(`${id}: JSON Lines（${file}）は行の配列で渡す`);
    text = value.map(formatJsonlRow).join('');
  } else {
    if (typeof value !== 'string') throw new TypeError(`${id}: テキスト（${file}）は文字列で渡す`);
    text = value;
  }
  // 検査するのはファイルに入る中身（undefined の欄は落ちる・Date は文字列になる）。入力そのものではない
  if (file.endsWith('.json')) assertMatchesSchema(dataset, JSON.parse(text), '書く中身');
  else if (file.endsWith('.jsonl')) assertMatchesSchema(dataset, text.split('\n').filter(Boolean).map((l) => JSON.parse(l)), '書く中身');

  const abs = join(root, file);
  if (existsSync(abs)) {
    if (readFileSync(abs, 'utf8') === text) return { file, changed: false };
    if (dataset.immutable) throw new Error(`${id}: ${file} は中身を変えない記録（immutable）なので、既存のファイルは上書きしない（訂正は新しい記録で supersedes する）`);
  }
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text, { flag: dataset.immutable ? 'wx' : 'w' });
  return { file, changed: true };
}

/** ファイルの最後が改行で終わっていないか（空・無いファイルは false）。追記が前の行に繋がるのを防ぐ */
function lacksFinalNewline(abs) {
  if (!existsSync(abs) || statSync(abs).size === 0) return false;
  const fd = openSync(abs, 'r');
  try {
    const last = Buffer.alloc(1);
    readSync(fd, last, 0, 1, statSync(abs).size - 1);
    return last[0] !== 0x0a;
  } finally {
    closeSync(fd);
  }
}

/**
 * JSON Lines のデータセットへ 1 行を追記する（追記だけの台帳 immutable でもよい）。型があれば 1 行を検査してから書く。
 * @returns {{ file: string }} file はリポジトリ相対
 */
export function appendDataset(root, id, row, { values } = {}) {
  const file = datasetPath(id, values);
  if (!file.endsWith('.jsonl')) throw new Error(`${id}: appendDataset は JSON Lines（.jsonl）だけ（${file}）`);
  const line = formatJsonlRow(row);
  assertMatchesSchema(resolveDataset(id), [JSON.parse(line)], '追記する 1 行');
  const abs = join(root, file);
  mkdirSync(dirname(abs), { recursive: true });
  appendFileSync(abs, `${lacksFinalNewline(abs) ? '\n' : ''}${line}`);
  return { file };
}
