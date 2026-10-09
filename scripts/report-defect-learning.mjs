#!/usr/bin/env node
/**
 * report-defect-learning.mjs — 期間内に起票・完了した不具合と、完了時に残した再発防止の内訳を出す。
 *
 * 読み手は週次レビュー（/weekly-review の「backlog 消化サマリ」の 5 行目）。直した不具合が検査・memory・正典の
 * どれかに変わったか、「残すものが無い」で閉じたものは何かを数える。完了時の記録は todo-complete --prevention が書く
 * （check-dispatch-log が不具合の完了に prevention を必須にしている）。
 *
 * Usage:
 *   npm run report-defect-learning -- --since 2026-10-05   # 既定は 7 日前（JST）
 *   npm run report-defect-learning -- --json
 * exit: 0 / 2 検査不成立（backlog・dispatch-log を読めない）
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFECT_KIND, parseBacklog } from './lib/backlog-lib.mjs';
import { todayJst } from './lib/jst-date.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BACKLOG = '.claude/todo/backlog.md';
const DISPATCH_LOG = '.claude/state/dispatch/dispatch-log.json';

/** 純関数（テスト用）。@returns 集計 */
export function summarizeDefectLearning(cards, entries, since) {
  const filed = cards.filter((c) => c.kind === DEFECT_KIND && (c.filed ?? '') >= since);
  const open = cards.filter((c) => c.kind === DEFECT_KIND);
  const closed = entries.filter((e) => e.kind === DEFECT_KIND && e.outcome === 'done' && (e.at ?? '') >= since);
  const byType = { gate: 0, memory: 0, doc: 0, none: 0 };
  for (const e of closed) if (e.prevention?.type in byType) byType[e.prevention.type] += 1;
  return {
    since,
    filed: filed.map((c) => ({ id: c.id, title: c.title })),
    closed: closed.map((e) => ({ id: e.id, task: e.task, prevention: e.prevention ?? null })),
    byType,
    openDefects: open.length,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--since');
  const since = i >= 0 ? argv[i + 1] : todayJst(Date.now() - 7 * 86400_000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(since ?? '')) {
    console.error('[report-defect-learning] --since は YYYY-MM-DD');
    process.exit(2);
  }
  let cards;
  let entries;
  try {
    cards = parseBacklog(readFileSync(join(ROOT, BACKLOG), 'utf8'));
    entries = JSON.parse(readFileSync(join(ROOT, DISPATCH_LOG), 'utf8')).entries;
  } catch (error) {
    console.error(`[report-defect-learning] 検査不成立: ${error.message}`);
    process.exit(2);
  }
  if (!cards.length || !Array.isArray(entries)) {
    console.error('[report-defect-learning] 検査不成立: カード 0 件か dispatch-log に entries が無い');
    process.exit(2);
  }
  const r = summarizeDefectLearning(cards, entries, since);
  if (argv.includes('--json')) {
    process.stdout.write(JSON.stringify(r, null, 2) + '\n');
    return;
  }
  console.log(`[report-defect-learning] ${since} 以降 / カード ${cards.length} 件・完了記録 ${entries.length} 件を読んだ`);
  console.log(`  起票した不具合 ${r.filed.length} 件 / 閉じた不具合 ${r.closed.length} 件（検査 ${r.byType.gate}・memory ${r.byType.memory}・正典 ${r.byType.doc}・残すもの無し ${r.byType.none}）/ 未完了の不具合 ${r.openDefects} 件`);
  for (const f of r.filed) console.log(`  + ${f.id} ${f.title}`);
  for (const c of r.closed) console.log(`  ✓ ${c.id} ${c.task}（${c.prevention ? `${c.prevention.type}:${c.prevention.ref}` : '再発防止の記録なし'}）`);
}

const isMain = process.argv[1] && process.argv[1].endsWith('report-defect-learning.mjs');
if (isMain) main();
