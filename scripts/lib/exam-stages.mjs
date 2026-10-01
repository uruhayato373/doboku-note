/**
 * exam-stages.mjs — 資格ごとの試験区分（第一次検定・第二次 筆記 など）を読む唯一の実装。
 *
 * 正本は config/exam-formats.json の exams[資格].stages。商品ラインナップ（product-lineup.mjs）と
 * 制作物のテーマ（content-theme.mjs）はここから区分を読み、区分の一覧を別のファイルに写さない。
 * 表示名は shortLabel（画面の短い名前）があればそれ、無ければ label。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** exam-formats.json（読み込み済み）から 資格 id → [{ id, label }] を作る */
export function stagesFromFormats(formats) {
  const out = new Map();
  for (const [id, f] of Object.entries(formats?.exams ?? {})) {
    out.set(id, (f.stages ?? []).map((s) => ({ id: s.key, label: s.shortLabel || s.label })));
  }
  return out;
}

export function loadExamStages(root) {
  return stagesFromFormats(JSON.parse(readFileSync(join(root, 'config/exam-formats.json'), 'utf8')));
}
