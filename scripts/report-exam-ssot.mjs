#!/usr/bin/env node
/**
 * report-exam-ssot.mjs — 資格の正本（日程・受験者数）の照合状態レポート（月次レビューが読む）
 *
 * 入力: .claude/config/qualification-registry.json・exam-calendar.json・exam-stats.json
 * 判定: scripts/lib/qualification-registry.mjs の summarizeSsotStatus（管理画面「資格一覧」と同じ実装）
 *
 *   npm run exam-ssot-status             # 要対応と記録（発表待ち・非公表）を Markdown で出す
 *   npm run exam-ssot-status -- --json   # JSON
 *   npm run exam-ssot-status -- --check  # 完走だけ確かめる（quality-audit ci）
 *
 * 壁時計（今日の日付）に依存するため CI のゲートにはしない。要対応があっても exit 0。
 * 資格を 1 件も読めないときだけ exit 1（検査不成立）。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { summarizeSsotStatus } from './lib/qualification-registry.mjs';
import { todayJst } from './lib/jst-date.mjs';

const ROOT = process.cwd();
const read = (name) => JSON.parse(readFileSync(join(ROOT, '.claude/config', name), 'utf8'));
const args = new Set(process.argv.slice(2));

const summary = summarizeSsotStatus({
  registry: read('qualification-registry.json'),
  calendar: read('exam-calendar.json'),
  examStats: read('exam-stats.json'),
  today: todayJst(),
});

if (summary.total === 0) {
  console.error('[exam-ssot-status] 資格を 1 件も読めなかった（検査不成立）');
  process.exit(1);
}

const withActions = summary.rows.filter((r) => r.actions.length > 0);
if (args.has('--check')) {
  console.log(`[exam-ssot-status] OK: ${summary.total} 資格を集計・要対応 ${summary.actionCount} 件（${withActions.length} 資格）`);
} else if (args.has('--json')) {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} else {
  const order = { active: 0, candidate: 1, declined: 2 };
  const rows = [...summary.rows].sort((a, b) => order[a.portfolio] - order[b.portfolio]);
  const lines = [`# 資格の正本 照合状態（${summary.today}）`, '', `対象 ${summary.total} 資格・要対応 ${summary.actionCount} 件（${withActions.length} 資格）。最終照合から ${summary.staleDays} 日を超えたら再照合する。`, '', '## 要対応', ''];
  for (const r of rows.filter((x) => x.actions.length)) {
    lines.push(`- **${r.label}**（${r.id}・${r.portfolio}）`);
    for (const a of r.actions) lines.push(`  - ${a}`);
  }
  if (withActions.length === 0) lines.push('なし');
  lines.push('', '## 記録（発表待ち・公式が公表していない）', '');
  for (const r of rows) {
    const items = [
      ...(r.calendar?.pending ?? []).map((x) => `日程 発表待ち: ${x}`),
      ...(r.stats?.pending ?? []).map((x) => `統計 発表待ち: ${x}`),
      ...(r.calendar?.notPublished ?? []).map((x) => `日程 非公表: ${x}`),
      ...(r.stats?.notPublished ?? []).map((x) => `統計 非公表: ${x}`),
    ];
    if (items.length) lines.push(`- ${r.label}: ${items.join(' / ')}`);
  }
  console.log(lines.join('\n'));
}
