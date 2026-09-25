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
 * config の自己整合を検査する。calendar（exam-calendar.json）を渡すと試験日の参照も検査する。
 * @param {any} config
 * @param {any} [calendar]
 * @returns {string[]} 違反メッセージ（空なら整合）
 */
export function validateLineupConfig(config, calendar = null) {
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
  if (calendar) {
    for (const q of config.qualifications) {
      const exam = calendar.exams?.[q.calendarId];
      if (!exam) {
        errors.push(`qualifications.${q.id}: exam-calendar に ${q.calendarId} が無い`);
        continue;
      }
      for (const st of q.stages) {
        if (!st.events?.length && !st.periods?.length) errors.push(`${q.id}:${st.id}: events も periods も無い`);
        for (const ev of st.events ?? []) {
          if (!exam.events?.[ev]) errors.push(`${q.id}:${st.id}: exam-calendar の ${q.calendarId}.events に ${ev} が無い`);
        }
        for (const pd of st.periods ?? []) {
          if (!exam.periods?.[pd]) errors.push(`${q.id}:${st.id}: exam-calendar の ${q.calendarId}.periods に ${pd} が無い`);
        }
      }
    }
  }
  return errors;
}

/** 'YYYY-MM-DD' 同士の日数差（to − from）。 */
function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/**
 * 区分の試験日程を exam-calendar から引く。確定日は events、日付未発表の期間は periods。
 * today は JST の 'YYYY-MM-DD'。
 * @returns {{ events: Array<{ label: string, date: string, daysLeft: number }>, periods: Array<{ label: string, window: string }> }}
 */
export function stageSchedule(calendar, qualification, stage, today) {
  const exam = calendar?.exams?.[qualification.calendarId];
  const events = (stage.events ?? [])
    .map((id) => exam?.events?.[id])
    .filter(Boolean)
    .map((e) => ({ label: e.label, date: e.date, daysLeft: daysBetween(today, e.date) }));
  const periods = (stage.periods ?? [])
    .map((id) => exam?.periods?.[id])
    .filter(Boolean)
    .map((p) => ({ label: p.label, window: p.window }));
  return { events, periods };
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
 * calendar と today（JST の 'YYYY-MM-DD'）を渡すと各行に試験日程（schedule）を付ける。
 * @param {any} config
 * @param {any[]} items
 * @param {{ calendar?: any, today?: string | null }} [options]
 * @returns {{ rows: Array<{ schedule, key, qualificationId, qualificationLabel, stageId, stageLabel, isFirstStage, stageCount, byChannel: Record<string, object[]> }>, unclassified: object[] }}
 */
export function buildLineup(config, items, { calendar = null, today = null } = {}) {
  const rows = config.qualifications.flatMap((q) =>
    q.stages.map((s, i) => ({
      schedule: calendar && today ? stageSchedule(calendar, q, s, today) : null,
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
