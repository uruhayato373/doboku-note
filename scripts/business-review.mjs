#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildReport, reviewPeriod, saveRecord, snapshot } from './lib/business-direction.mjs';
const args = process.argv.slice(2), get = key => args[args.indexOf(key) + 1];
try {
  const root = resolve(args.includes('--repo') ? get('--repo') : process.cwd());
  const cadence = args.includes('--monthly') ? 'monthly' : 'weekly';
  const period = args.includes('--start') ? { startDate: get('--start'), endDate: get('--end') } : reviewPeriod(cadence);
  const command = args[0] ?? 'report';
  if (command === 'record') {
    if (!args.includes('--input')) throw new Error('record --input <JSON> [--commit]');
    const input = JSON.parse(readFileSync(get('--input'), 'utf8'));
    if (!args.includes('--commit')) console.log('dry-run: 記録しません。--commit で検証後に追記します');
    else console.log(JSON.stringify({ file: saveRecord(root, input).file }));
  } else if (command === 'snapshot') {
    if (!args.includes('--commit')) throw new Error('snapshot は --commit が必要です');
    console.log(JSON.stringify({ file: snapshot(root, period).file }));
  } else if (command === 'report') {
    const r = buildReport(root, period);
    if (args.includes('--json')) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`${r.strategy.positioning}\n対象期間 ${period.startDate}〜${period.endDate}`);
      console.log(`計測: ${r.cells.filter(c => c.value != null).length}/${r.cells.length}（欠測は0ではありません）`);
      for (const d of r.due) console.log(`${d.cadence}: ${d.period.startDate}〜${d.period.endDate} / ${d.due ? '要レビュー' : '次回待ち'} / ${d.status}`);
      for (const review of r.followups) console.log(`暫定レビュー再確認: ${review.period.startDate}〜${review.period.endDate} / ${review.file}`);
      for (const target of r.targetsDue) console.log(`目標の見直し: ${target.qualification} / ${target.metric}`);
      for (const e of r.experiments) console.log(`${e.id}: ${e.nextReviewDate ?? '期日未設定'} ${e.overdue ? '期限到来' : ''}`);
    }
  } else throw new Error('report | snapshot --commit | record --input <JSON> --commit');
} catch (e) { console.error(`[business-review] ${e.message}`); process.exitCode = 1; }
