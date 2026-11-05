#!/usr/bin/env node
/**
 * shorts-factory.mjs — ショートの標準工程の入口。手順の正本は .claude/knowledge/reference/video-factory.md。
 *   npm run shorts-factory -- plan|generate|audit-queue|adopt|render --pack <資格>/<作品> --key <ショートの key>
 *   npm run shorts-factory -- record-audit --pack … --key … --file <判定の JSON> --by ai-image-fidelity-auditor
 *   npm run shorts-factory -- record-review --pack … --key … --verdict pass|fail --by <担当> --reason "…"
 * 投稿の入口は既存の youtube-shorts:stage と publish-video-pack。承認と公開はここに無い。
 */
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { todayJst } from './lib/jst-date.mjs';
import { auditQueue, generatePlan, recordAudit } from './lib/video-factory.mjs';
import { adoptShort, buildShortPlan, inspectShortImage, recordScreenReview, renderShort, shortsPlanPath } from './lib/shorts-factory.mjs';
import { ensureVoicevox } from './lib/voicevox-engine.mjs';

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: { pack: { type: 'string' }, key: { type: 'string' }, file: { type: 'string' }, by: { type: 'string' }, verdict: { type: 'string' }, reason: { type: 'string' } },
});
const [command] = positionals;
const { pack, key } = args;
if (!command || !pack || !key) {
  console.error('使い方: npm run shorts-factory -- <plan|generate|audit-queue|record-audit|adopt|render|record-review> --pack <資格>/<作品> --key <key>');
  process.exit(2);
}
const path = shortsPlanPath(pack, key);
const now = new Date().toISOString();
const print = (value) => console.log(JSON.stringify(value, null, 2));

const commands = {
  plan: () => {
    const plan = buildShortPlan(ROOT, pack, key, { date: todayJst().replaceAll('-', '') });
    print({ revision: plan.revision, items: plan.items.map((i) => i.id) });
  },
  generate: async () => print(await generatePlan(ROOT, pack, { path, inspect: inspectShortImage, log: console.log })),
  'audit-queue': () => print(auditQueue(ROOT, pack, { path, label: (i) => `${pack} のショート ${key} の${{ cover: '表紙', cta: '締め' }[i.kind] ?? `本文 ${i.id}`}。語りは「${i.narration}」` })),
  'record-audit': () => print(recordAudit(ROOT, pack, JSON.parse(readFileSync(args.file, 'utf8')), { by: args.by, path })),
  adopt: async () => print(await adoptShort(ROOT, pack, key, { now })),
  render: async () => {
    const engine = await ensureVoicevox();
    try { print(await renderShort(ROOT, pack, key, { log: console.log })); } finally { engine?.kill(); }
  },
  'record-review': () => print(recordScreenReview(ROOT, pack, key, { verdict: args.verdict, by: args.by, reason: args.reason, now })),
};
if (!commands[command]) { console.error(`不明な工程: ${command}`); process.exit(2); }
await commands[command]();
