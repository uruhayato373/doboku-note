/**
 * product-lineup.mjs — 商品を「資格 × 試験区分 × チャネル」のマスへ写す（純粋関数＋config 読み込み）
 * ---------------------------------------------------------------------------
 * 分類ルールの SSOT は `config/product-lineup.json`。試験区分はそこに書かず、
 * `config/exam-formats.json`（lib/exam-stages.mjs）から読んで qualifications[].stages に付ける。各チャネルの商品台帳は
 * 呼び出し側（admin `lib/lineup.ts`）が既存ローダーで読み、ここへ正規化済みの item を渡す。
 * どのルールにも当たらない商品は `unclassified` に残し、黙って落とさない（CLAUDE.md §9）。
 * ---------------------------------------------------------------------------
 */
import { join } from 'node:path';

import { loadExamStages } from './exam-stages.mjs';
import { loadRegistry, orderedQualifications } from './qualification-registry.mjs';
import { datasetPath } from './datasets.mjs';
import { readDataset } from './dataset-io.mjs';
import { classifyProduct } from '../../src/lib/product-classification.mjs';
import { REPO_ROOT as ROOT } from './repository-paths.mjs';
export { classifyProduct } from '../../src/lib/product-classification.mjs';

export const LINEUP_CONFIG_PATH = join(ROOT, datasetPath('config.product-lineup'));

/**
 * product-lineup.json を読み、マスの資格（registry の展開中の資格・名前と並び順も registry）と
 * 各資格の試験区分（exam-formats.json の stages）を付けて返す
 */
export function loadLineupConfig(root = ROOT) {
  const config = readDataset(root, 'config.product-lineup');
  return withStages(withQualifications(config, loadRegistry(root)), loadExamStages(root));
}

/** マスの資格を registry の展開中（portfolio: active）から付ける。product-lineup.json には資格を書かない */
export function withQualifications(config, registry) {
  return { ...config, qualifications: orderedQualifications(registry, 'active').map((q) => ({ id: q.id, label: q.label })) };
}

/** config の各資格に区分を付ける（区分の無い資格は stages: [] になり validateLineupConfig が止める） */
export function withStages(config, stagesById) {
  return { ...config, qualifications: config.qualifications.map((q) => ({ ...q, stages: stagesById.get(q.id) ?? [] })) };
}

/** config 内の全マスのキー（`資格id:区分id`）。 */
export function cellKeys(config) {
  return config.qualifications.flatMap((q) => q.stages.map((s) => `${q.id}:${s.id}`));
}

/**
 * config の自己整合を検査する。
 * @param {any} config
 * @returns {string[]} 違反メッセージ（空なら整合）
 */
export function validateLineupConfig(config) {
  const errors = [];
  for (const q of config.qualifications) if (!q.stages?.length) errors.push(`${q.id}: 試験区分が無い（exam-formats.json の stages）`);
  const keys = cellKeys(config);
  const known = new Set(keys);
  if (known.size !== keys.length) errors.push('qualifications に重複したマスがある');
  const channels = new Set(config.channels.map((c) => c.id));
  const checkCells = (where, cells) => {
    if (!Array.isArray(cells) || cells.length === 0) errors.push(`${where}: cells が空`);
    for (const cell of cells ?? []) if (!known.has(cell)) errors.push(`${where}: 未定義のマス ${cell}`);
  };
  for (const [channel, rules] of Object.entries(config.rules ?? {})) {
    if (!channels.has(channel)) errors.push(`rules.${channel}: channels に無いチャネル`);
    rules.forEach((r, i) => {
      try {
        new RegExp(r.match);
      } catch {
        errors.push(`rules.${channel}[${i}]: 正規表現が不正 ${r.match}`);
      }
      checkCells(`rules.${channel}[${i}]`, r.cells);
    });
  }
  (config.salesRules ?? []).forEach((r, i) => {
    try {
      new RegExp(r.match);
    } catch {
      errors.push(`salesRules[${i}]: 正規表現が不正 ${r.match}`);
    }
    checkCells(`salesRules[${i}]`, r.cells);
  });
  for (const app of config.apps ?? []) checkCells(`apps.${app.id}`, app.cells);
  return errors;
}

/**
 * 売上記録（data/note/sales.json）の productId をマスへ写す。売上の id は sales-recorder 独自の系統
 * （bk-*・article:<slug>・membership:<plan>）なので、接頭辞を外して salesRules → rules.note の順に当てる。
 * @returns {string[] | null}
 */
export function classifySale(config, productId) {
  const id = String(productId).replace(/^(article|membership):/, '');
  return classifyProduct(config.salesRules, id) ?? classifyProduct(config.rules?.note, id);
}

/**
 * 正規化済み item 群をマトリクスへ組み立てる。
 * item: { channel, id, title, cells?, ... }。cells を持つ item（apps）はルールを通さない。
 * @param {any} config
 * @param {any[]} items
 * @returns {{ rows: Array<{ key, qualificationId, qualificationLabel, stageId, stageLabel, isFirstStage, stageCount, byChannel: Record<string, object[]> }>, unclassified: object[] }}
 */
export function buildLineup(config, items) {
  const rows = config.qualifications.flatMap((q) =>
    q.stages.map((s, i) => ({
      key: `${q.id}:${s.id}`,
      qualificationId: q.id,
      qualificationLabel: q.label,
      stageId: s.id,
      stageLabel: s.label,
      isFirstStage: i === 0,
      stageCount: q.stages.length,
      byChannel: Object.fromEntries(config.channels.map((c) => [c.id, []])),
    })),
  );
  const rowByKey = new Map(rows.map((r) => [r.key, r]));
  const unclassified = [];
  for (const item of items) {
    const cells = item.cells ?? classifyProduct(config.rules?.[item.channel], item.id);
    const targets = (cells ?? []).map((c) => rowByKey.get(c)).filter(Boolean);
    if (targets.length === 0 || !(item.channel in targets[0].byChannel)) {
      unclassified.push(item);
      continue;
    }
    for (const row of targets) row.byChannel[item.channel].push(item);
  }
  return { rows, unclassified };
}
