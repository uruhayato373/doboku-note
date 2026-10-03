/**
 * dataset-validate.mjs — 台帳（scripts/lib/datasets.mjs）の型の検査。型（zod）は scripts/lib/dataset-schemas.mjs にあり、
 * 台帳の各行は型を名前（`schema: 'NoteSalesLog'`）で指す。
 *
 * なぜ分けるか: 台帳は 200 近いスクリプトがパスを引くためだけに読む。台帳が zod を読み込むと、npm ci をしない
 * ワークフロー（indexnow-submit.yml・ops-audit.yml など）が ERR_MODULE_NOT_FOUND で落ちる（2026-10-02 に実際に起きた）。
 * 台帳は依存ゼロに保ち、型が要る検査（check-datasets・ci-data add・管理画面）だけがここを読む。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import * as SCHEMAS from './dataset-schemas.mjs';

/** 台帳の行が指す型（無ければ null。名前が dataset-schemas.mjs に無ければ投げる） */
export function schemaOf(dataset) {
  if (!dataset.schema) return null;
  const schema = SCHEMAS[dataset.schema];
  if (!(schema instanceof z.ZodType)) throw new Error(`${dataset.id}: 型 ${dataset.schema} が scripts/lib/dataset-schemas.mjs に無い`);
  return schema;
}

/** 型の JSON Schema（zod から生成。エディタ・管理画面・Codex 向け） */
export const jsonSchemaOf = (dataset) => {
  const schema = schemaOf(dataset);
  return schema ? z.toJSONSchema(schema) : null;
};

/** ファイルの中身（JSON・JSON Lines は行の配列）を読む。JSON Lines の壊れた行は行番号を付けて投げる */
function readValue(root, file) {
  const text = readFileSync(join(root, file), 'utf8').replace(/^\uFEFF/, '');
  if (!file.endsWith('.jsonl')) return JSON.parse(text);
  return text.split(/\r?\n/).flatMap((l, i) => {
    if (!l.trim()) return [];
    try {
      return [JSON.parse(l)];
    } catch (e) {
      throw new Error(`${i + 1} 行目: ${e.message}`);
    }
  });
}

/** 1 ファイルあたりに出す違反の上限（総数は別に出す） */
const MAX_ISSUES_PER_FILE = 5;

/**
 * 型のあるデータセットのファイルを検査する。型が無ければ何もしない（checked 0）。
 * @returns {{ checked: number, errors: { file: string, message: string }[] }}
 */
export function validateFiles(root, dataset, files) {
  const errors = [];
  const schema = schemaOf(dataset);
  if (!schema) return { checked: 0, errors };
  for (const file of files) {
    let value;
    try {
      value = readValue(root, file);
    } catch (e) {
      errors.push({ file, message: `読めない: ${e.message}` });
      continue;
    }
    const r = schema.safeParse(value);
    if (r.success) continue;
    const { issues } = r.error;
    for (const i of issues.slice(0, MAX_ISSUES_PER_FILE)) errors.push({ file, message: `${i.path.join('.') || '(全体)'}: ${i.message}` });
    if (issues.length > MAX_ISSUES_PER_FILE) errors.push({ file, message: `ほか ${issues.length - MAX_ISSUES_PER_FILE} 件（全 ${issues.length} 件）` });
  }
  return { checked: files.length, errors };
}
