#!/usr/bin/env node
/**
 * shorts-factory.mjs — ショートの標準工程の入口。手順の正本は .claude/knowledge/reference/video-factory.md。
 *   npm run shorts-factory -- status [--exam <資格>] [--json]                全本の工程の位置
 *   npm run shorts-factory -- record-script-qa --pack … --key … --verdict pass|fail --by <担当> --reason "…"  画像の前に通す
 *   npm run shorts-factory -- plan|generate|audit-queue|adopt|render|audio-check|stock|restore --pack <資格>/<作品> --key <ショートの key>
 *   npm run shorts-factory -- plan --pack … --key … --retry <項目 id,…|all>   台本を変えずに、上限に達した項目をやり直す
 *   npm run shorts-factory -- record-audit --pack … --key … --file <判定の JSON> --by ai-image-fidelity-auditor
 *   npm run shorts-factory -- record-review --pack … --key … --verdict pass|fail --by <担当> --reason "…"
 * 投稿の入口は既存の youtube-shorts:stage と publish-video-pack。承認と公開はここに無い。
 *
 * npm run shorts-factory -- status|record-script-qa|plan|generate|audit-queue|record-audit|adopt|render|record-review|audio-check|stock|restore --pack <exam>/<work> --key <key> — ショートの標準工程（台本QA・全面画像・Drive 在庫）
 */
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { auditQueue, generatePlan, recordAudit, retryItems } from './lib/video-factory.mjs';
import { adoptShort, buildShortPlan, checkShortAudio, inspectShortImage, recordScreenReview, recordScriptQa, renderShort, restoreShort, shortsPlanPath, shortsStatus, stockShort } from './lib/shorts-factory.mjs';
import { ensureVoicevox } from './lib/voicevox-engine.mjs';

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: { exam: { type: 'string' }, json: { type: 'boolean' }, pack: { type: 'string' }, key: { type: 'string' }, file: { type: 'string' }, by: { type: 'string' }, verdict: { type: 'string' }, reason: { type: 'string' }, retry: { type: 'string' } },
});
const [command] = positionals;
const { pack, key } = args;
if (command === 'status') {
  const rows = shortsStatus(ROOT, { exam: args.exam });
  if (!rows.length) { console.error('検査不成立: 対象のショートが 0 件'); process.exit(2); }
  if (args.json) { console.log(JSON.stringify(rows, null, 2)); process.exit(0); }
  const counts = {};
  for (const row of rows) { counts[row.stage] ??= 0; counts[row.stage] += 1; }
  console.log(`ショート ${rows.length} 本を判定`);
  for (const [stage, n] of Object.entries(counts).sort()) console.log(`  ${stage}: ${n}`);
  for (const row of rows.filter((r) => !['no-design', 'stocked'].includes(r.stage))) console.log(`${row.stage}\t${row.pack}\t${row.key}`);
  process.exit(0);
}
if (!command || !pack || !key) {
  console.error('使い方: npm run shorts-factory -- <status|record-script-qa|plan|generate|audit-queue|record-audit|adopt|render|record-review|audio-check|stock|restore> --pack <資格>/<作品> --key <key>');
  process.exit(2);
}
const path = shortsPlanPath(pack, key);
const now = new Date().toISOString();
const print = (value) => console.log(JSON.stringify(value, null, 2));

const commands = {
  plan: () => {
    // --retry は台本を変えずに、上限に達した項目・画像が出ずに止まった項目をやり直す（all で止まった項目すべて）
    if (args.retry) { print(retryItems(ROOT, pack, args.retry.split(','), { path })); return; }
    const plan = buildShortPlan(ROOT, pack, key, { date: todayJst().replaceAll('-', '') });
    print({ revision: plan.revision, items: plan.items.map((i) => i.id) });
  },
  generate: async () => print(await generatePlan(ROOT, pack, { path, inspect: inspectShortImage, aspect: 9 / 16, log: console.log })),
  'audit-queue': () => print(auditQueue(ROOT, pack, { path, label: (i) => `${pack} のショート ${key} の${{ cover: '表紙', cta: '締め' }[i.kind] ?? `本文 ${i.id}`}。語りは「${i.narration}」` })),
  'record-audit': () => print(recordAudit(ROOT, pack, JSON.parse(readFileSync(args.file, 'utf8')), { by: args.by, path })),
  adopt: async () => print(await adoptShort(ROOT, pack, key, { now })),
  render: async () => {
    const engine = await ensureVoicevox();
    try { print(await renderShort(ROOT, pack, key, { log: console.log })); } finally { engine?.kill(); }
  },
  'record-review': () => print(recordScreenReview(ROOT, pack, key, { verdict: args.verdict, by: args.by, reason: args.reason, now })),
  'record-script-qa': () => print(recordScriptQa(ROOT, pack, key, { verdict: args.verdict, by: args.by, reason: args.reason, now })),
  'audio-check': async () => {
    const result = await checkShortAudio(ROOT, pack, key);
    print(result);
    if (result.problems.length) process.exit(1);
  },
  stock: async () => print(await stockShort(ROOT, pack, key, { now, log: console.log })),
  restore: () => print(restoreShort(ROOT, pack, key)),
};
if (!commands[command]) { console.error(`不明な工程: ${command}`); process.exit(2); }
await commands[command]();
