/**
 * review-wiring.mjs — 週次・月次レビューの配線（入力 → 判断 → 出力）の唯一の実装。
 * ---------------------------------------------------------------------------
 * 正本 .claude/config/review-wiring.json の inputs と、スキル本文が実行するコマンドの一致を検査し、
 * 管理画面 戦略 ＞ レビュー に出す実行状況（レビュー記録）と出力（起票カード・実験・週次計画）を組み立てる。
 * 読み手: npm run check-review-wiring（CI）・tools/admin-app の /metrics/business。
 * ---------------------------------------------------------------------------
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const CONFIG = '.claude/config/review-wiring.json';

/** スキル本文が実行するコマンド（npm run X → X、node scripts/X.mjs → node:X）。重複なし・並びは出現順。 */
export function extractCommands(skillText) {
  const out = [];
  for (const m of String(skillText).matchAll(/npm run ([a-z0-9:_-]+)|node scripts\/([A-Za-z0-9_./-]+)\.mjs/g)) {
    const cmd = m[1] ?? `node:${m[2]}`;
    if (!out.includes(cmd)) out.push(cmd);
  }
  return out;
}

/** 正本とスキル本文の食い違い（純関数）。missing＝スキルにあるが正本に無い、extra＝正本にあるがスキルに無い。 */
export function diffWiring(inputs, skillText) {
  const inSkill = extractCommands(skillText);
  const inConfig = inputs.map((i) => i.command);
  return { missing: inSkill.filter((c) => !inConfig.includes(c)), extra: inConfig.filter((c) => !inSkill.includes(c)) };
}

/** 正本の形の検査（stage・role の語彙と重複）。 */
export function validateWiring(config) {
  const errors = [];
  for (const [cadence, c] of Object.entries(config.cadences ?? {})) {
    const seen = new Set();
    for (const i of c.inputs ?? []) {
      if (!config.stages.includes(i.stage)) errors.push(`${cadence}: ${i.command} の stage「${i.stage}」は stages に無い`);
      if (!['判断', '点検'].includes(i.role)) errors.push(`${cadence}: ${i.command} の role は 判断 か 点検`);
      if (seen.has(i.command)) errors.push(`${cadence}: ${i.command} が重複`);
      seen.add(i.command);
    }
  }
  return errors;
}

/** バックログのうち、起点にそのレビュー（「週次レビュー（開始〜終了）」等）を書いたカード。 */
export function cardsFromReview(backlogText, cadenceLabel, period) {
  const key = `${cadenceLabel}レビュー（${period.startDate}〜${period.endDate}）`;
  const cards = [];
  let current = null;
  for (const line of String(backlogText).split('\n')) {
    const m = /^### \[(DN-\d{4})\] (.+)$/.exec(line);
    if (m) current = { id: m[1], title: m[2] };
    else if (current && line.includes(key) && !cards.some((c) => c.id === current.id)) cards.push(current);
  }
  return cards;
}

/** 管理画面のレビュー画面の表示モデル。reviews は business-direction の review 記録（新しい順でなくてよい）。 */
export function buildReviewView(root, { reviews = [], due = [] } = {}) {
  const config = JSON.parse(readFileSync(join(root, CONFIG), 'utf8'));
  const backlogPath = join(root, '.claude/todo/backlog.md');
  const backlog = existsSync(backlogPath) ? readFileSync(backlogPath, 'utf8') : '';
  const weeklyPath = join(root, '.claude/todo/weekly.md');
  const weeklyHead = existsSync(weeklyPath) ? readFileSync(weeklyPath, 'utf8').split('\n').find((l) => l.startsWith('# ')) ?? null : null;

  return Object.entries(config.cadences).map(([id, c]) => {
    const skillPath = join(root, c.skill);
    const drift = existsSync(skillPath) ? diffWiring(c.inputs, readFileSync(skillPath, 'utf8')) : { missing: [], extra: [] };
    const mine = reviews.filter((r) => r.cadence === id).sort((a, b) => String(b.period.endDate).localeCompare(a.period.endDate));
    const latest = mine[0] ?? null;
    const byStage = config.stages.map((stage) => ({
      stage,
      judge: c.inputs.filter((i) => i.stage === stage && i.role === '判断'),
      check: c.inputs.filter((i) => i.stage === stage && i.role === '点検'),
    })).filter((s) => s.judge.length || s.check.length);
    return {
      id,
      label: c.label,
      outputs: c.outputs,
      byStage,
      counts: { judge: c.inputs.filter((i) => i.role === '判断').length, check: c.inputs.filter((i) => i.role === '点検').length },
      drift,
      due: due.find((d) => d.cadence === id) ?? null,
      latest,
      cards: latest ? cardsFromReview(backlog, c.label, latest.period) : [],
      weeklyPlan: id === 'weekly' ? weeklyHead : null,
      history: mine.slice(1, 6),
    };
  });
}
