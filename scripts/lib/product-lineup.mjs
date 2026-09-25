/**
 * product-lineup.mjs — 商品を「資格 × 試験区分 × チャネル」のマスへ写す（純粋関数＋config 読み込み）
 * ---------------------------------------------------------------------------
 * 分類ルールの SSOT は `.claude/config/product-lineup.json`。各チャネルの商品台帳は
 * 呼び出し側（admin `lib/lineup.ts`）が既存ローダーで読み、ここへ正規化済みの item を渡す。
 * どのルールにも当たらない商品は `unclassified` に残し、黙って落とさない（CLAUDE.md §9）。
 * ---------------------------------------------------------------------------
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const LINEUP_CONFIG_PATH = join(ROOT, '.claude/config/product-lineup.json');

export function loadLineupConfig() {
  return JSON.parse(readFileSync(LINEUP_CONFIG_PATH, 'utf8'));
}

/** config 内の全マスのキー（`資格id:区分id`）。 */
export function cellKeys(config) {
  return config.qualifications.flatMap((q) => q.stages.map((s) => `${q.id}:${s.id}`));
}

/**
 * config の自己整合を検査する。
 * @returns {string[]} 違反メッセージ（空なら整合）
 */
export function validateLineupConfig(config) {
  const errors = [];
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
  for (const app of config.apps ?? []) checkCells(`apps.${app.id}`, app.cells);
  return errors;
}

/**
 * 商品 id をマスへ写す。最初に一致したルールの cells を返し、一致しなければ null。
 * @returns {string[] | null}
 */
export function classifyProduct(rules, id) {
  for (const r of rules ?? []) {
    if (new RegExp(r.match).test(id)) return r.cells;
  }
  return null;
}

/**
 * 正規化済み item 群をマトリクスへ組み立てる。
 * item: { channel, id, title, cells?, ... }。cells を持つ item（apps）はルールを通さない。
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
