#!/usr/bin/env node
/**
 * check-registry-due.mjs — 予約（scheduled）のまま公開の予定を猶予より過ぎた公開を出す（content-registry.md「状態」）。
 * 壁時計に依存するので quality-audit では ops（運用アラート）に置き、CI のゲートにはしない。
 * 猶予は config/content-registry.json の reconcileGraceDays（チャネルごと）。照合（registry-reconcile）が公開を
 * 確かめて published へ進めるまでの遅れを見張る。
 *
 *   npm run check-registry-due [-- --json]
 *
 * exit: 0 期日超過なし / 1 期日超過あり / 2 検査不成立（台帳が 0 件）
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { loadRegistry, loadRegistryConfig } from './lib/content-registry.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { values: args } = parseArgs({ options: { json: { type: 'boolean' } } });
const cfg = loadRegistryConfig(ROOT);
const reg = loadRegistry(ROOT);
const now = Date.now();
const scheduled = reg.publications.filter((p) => p.status === 'scheduled' && p.publishAt);
const overdue = scheduled.filter((p) => Date.parse(p.publishAt) + (cfg.reconcileGraceDays[p.channel] ?? 1) * 86400000 < now)
  .map((p) => ({ id: p.id, publishAt: p.publishAt, graceDays: cfg.reconcileGraceDays[p.channel] ?? 1 }));
if (args.json) process.stdout.write(JSON.stringify({ checked: scheduled.length, overdue }, null, 2) + '\n');
else {
  console.log(`check-registry-due: 公開 ${reg.publications.length} 件のうち予約 ${scheduled.length} 件を実検査 / 期日超過 ${overdue.length} 件`);
  for (const o of overdue) console.log(`  [超過] ${o.id}: publishAt ${o.publishAt}（猶予 ${o.graceDays} 日）`);
}
process.exitCode = reg.publications.length === 0 ? 2 : overdue.length ? 1 : 0;
