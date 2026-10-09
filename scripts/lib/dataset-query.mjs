/**
 * dataset-query.mjs — 台帳（scripts/lib/datasets.mjs）の id でデータを一覧・取得・絞り込む共通の入口（DN-0585・段階 2）。
 *
 * DB は置かない（data-storage-decision.md「台帳を 1 本にして DB のように扱う」）。置き場（config/・data/・.claude/state/・
 * Drive vault の写し）がどこでも、id だけで SELECT 相当を返す。読み手は CLI（npm run data）と管理画面（/ops/store の詳細）。
 *
 *   listDataset   — ファイルの一覧（新しい順）と、ファイルごとの行数
 *   getDataset    — 中身（既定は最新のファイル）
 *   queryDataset  — 行（配列の要素・対応表の各項目）を「欄=値」で絞る
 *
 * 書き込みはしない（書き手は各スクリプトと dataset-write.mjs）。
 */

import { statSync } from 'node:fs';
import { join } from 'node:path';
import { datasetFiles, resolveDataset } from './datasets.mjs';
import { readDatasetFile } from './dataset-io.mjs';

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function mustGet(id) {
  const x = resolveDataset(id);
  if (!x) throw new Error(`台帳に無いデータセット: ${id}（npm run data -- list で id を確かめる）`);
  return x;
}

/** Drive vault に実体のあるデータセットが手元に無いときの案内 */
const pullHint = (x) => (x.drive ? `手元に写しが無い。npm run drive-vault-sync -- --pull --group ${x.drive} --commit で取り戻す` : null);

/**
 * 行の取り出し方。配列ならそのまま、オブジェクトなら
 *   - rowsPath（例 "books"・"entries"）を指定すればその場所
 *   - 指定が無ければ、オブジェクトの配列を持つ欄のうち最も長いもの、無ければオブジェクトを値に持つ対応表（2 項目以上）
 * 対応表の項目は { _key: キー, ...値 } にする。
 * @returns {{ rows: object[], rowsPath: string|null }}
 */
export function rowsOf(data, rowsPath = null) {
  if (rowsPath) {
    const v = rowsPath.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);
    if (Array.isArray(v)) return { rows: v, rowsPath };
    if (isPlainObject(v)) return { rows: Object.entries(v).map(([k, val]) => (isPlainObject(val) ? { _key: k, ...val } : { _key: k, value: val })), rowsPath };
    throw new Error(`行の場所 ${rowsPath} に配列も対応表も無い`);
  }
  if (Array.isArray(data)) return { rows: data, rowsPath: null };
  if (!isPlainObject(data)) return { rows: [], rowsPath: null };
  const arrays = Object.entries(data).filter(([, v]) => Array.isArray(v) && v.some(isPlainObject)).sort((a, b) => b[1].length - a[1].length);
  if (arrays.length) return { rows: arrays[0][1], rowsPath: arrays[0][0] };
  const maps = Object.entries(data).filter(([, v]) => isPlainObject(v) && Object.keys(v).length >= 2 && Object.values(v).every(isPlainObject))
    .sort((a, b) => Object.keys(b[1]).length - Object.keys(a[1]).length);
  if (maps.length) return rowsOf(data, maps[0][0]);
  return { rows: [], rowsPath: null };
}

/**
 * 「欄=値」「欄!=値」「欄~値」（含む）を解く。欄は「.」で入れ子（例 verdict.gap=0）。値は文字列として比べ、
 * true/false/null と数値は JSON の値としても比べる。
 */
export function parseWhere(expr) {
  const m = /^([^=!~]+?)(!=|~|=)(.*)$/.exec(String(expr));
  if (!m) throw new Error(`絞り込みの書き方が違う: ${expr}（欄=値・欄!=値・欄~値）`);
  return { path: m[1].trim(), op: m[2], value: m[3] };
}

function matches(row, { path, op, value }) {
  const v = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), row);
  const values = Array.isArray(v) ? v : [v];
  const eq = (x) => {
    if (x === undefined) return false;
    if (String(x) === value) return true;
    try { return JSON.stringify(x) === JSON.stringify(JSON.parse(value)); } catch { return false; }
  };
  if (op === '=') return values.some(eq);
  if (op === '!=') return !values.some(eq);
  return values.some((x) => x !== undefined && (typeof x === 'string' ? x : JSON.stringify(x)).includes(value));
}

/** ファイルの一覧と行数（読めないファイルは error を付けて返す） */
export function listDataset(root, id) {
  const x = mustGet(id);
  const files = datasetFiles(root, x.id).map((file) => {
    const { size } = statSync(join(root, file));
    try {
      const data = readDatasetFile(root, file);
      return { file, bytes: size, rows: typeof data === 'string' ? null : rowsOf(data).rows.length };
    } catch (e) {
      return { file, bytes: size, rows: null, error: e.message };
    }
  });
  return { id: x.id, path: x.path, doc: x.doc ?? '', drive: x.drive ?? null, files, hint: files.length ? null : pullHint(x) };
}

/** 中身。file を省くと最新（名前の降順の先頭） */
export function getDataset(root, id, { file = null } = {}) {
  const x = mustGet(id);
  const files = datasetFiles(root, x.id);
  const target = file ?? files[0];
  if (!target) throw new Error(`${x.id}: ファイルが 1 つも無い${pullHint(x) ? `（${pullHint(x)}）` : ''}`);
  if (!files.includes(target)) throw new Error(`${x.id}: ${target} はこのデータセットのファイルではない`);
  return { id: x.id, file: target, data: readDatasetFile(root, target) };
}

/**
 * 行を絞る。where は「欄=値」の配列（すべてを満たす行）。file を省くと最新のファイル、all: true なら全ファイルの行を新しい順に。
 * @param {string} root
 * @param {string} id
 * @param {{ where?: (string | { path: string, op: string, value: string })[], file?: string | null, all?: boolean, rowsPath?: string | null, limit?: number }} [opts]
 * @returns {{ id: string, files: string[], rowsPath: string | null, total: number, rows: object[] }} rows は limit 件まで（total は絞った後の件数）
 */
export function queryDataset(root, id, { where = [], file = null, all = false, rowsPath = null, limit = 50 } = {}) {
  const x = mustGet(id);
  const conds = where.map((w) => (typeof w === 'string' ? parseWhere(w) : w));
  const files = all ? datasetFiles(root, x.id) : [getDataset(root, x.id, { file }).file];
  let usedPath = rowsPath;
  const hits = [];
  for (const f of files) {
    const data = readDatasetFile(root, f);
    if (typeof data === 'string') throw new Error(`${f}: JSON ではないので行で絞れない（get で中身を読む）`);
    const r = rowsOf(data, rowsPath);
    usedPath ??= r.rowsPath;
    for (const row of r.rows) if (conds.every((c) => matches(row, c))) hits.push(all ? { _file: f, ...row } : row);
  }
  return { id: x.id, files, rowsPath: usedPath, total: hits.length, rows: hits.slice(0, limit) };
}
