#!/usr/bin/env node
/**
 * 指標が今計測できているかを実データから出す（外部通信なし）。「計測できない」と書く前にこれを見る。
 * 取得元を持つ指標と、年間計画の成功指標を並べる。--json で結果をそのまま出す。
 * exit: 0 表示できた / 2 検査不成立（取得元を持つ指標が 0 件）
 */
import { parseCliArgs } from './lib/cli-args.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { loadMetricStatuses, metricStateLabel } from './lib/metric-status.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const args = parseCliArgs({ json: { type: 'boolean' } });
const statuses = loadMetricStatuses(REPO_ROOT);
const plan = readDataset(REPO_ROOT, 'config.channel-annual-plan');
const planned = new Set([...plan.metrics.primary, ...plan.channels.x.metrics.primary, ...plan.channels.instagram.metrics.primary]);
const { metrics } = readDataset(REPO_ROOT, 'config.business-direction');
const rows = metrics.filter((m) => m.dataSource || planned.has(m.id)).map((m) => statuses.get(m.id));

if (args.json) console.log(JSON.stringify(rows, null, 2));
else {
  console.log(`metric-status: 取得元を持つ指標 ${metrics.filter((m) => m.dataSource).length} 件 / 年間計画の成功指標 ${planned.size} 件`);
  for (const r of rows) console.log(`  ${metricStateLabel(r.state)}\t${r.id}\t${r.label}\t${r.day ?? '—'}\t${r.rows} 行\t${r.value ?? '—'}`);
}
if (!metrics.some((m) => m.dataSource)) process.exitCode = 2;
