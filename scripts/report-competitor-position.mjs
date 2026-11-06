#!/usr/bin/env node
/**
 * 資格または年間の枠の競合の立ち位置を、最新の数字つきで表示する。企画と分析の前に読む。
 *   npm run competitor-position -- --exam rccm
 *   npm run competitor-position -- --slot cc-2027
 */
import { parseCliArgs } from './lib/cli-args.mjs';
import { examPresence, loadCompetitorPositions, positionLabel, prominentRivals, rivalFacts, runProbe, slotMaterials } from './lib/competitor-positions.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const args = parseCliArgs({ exam: { type: 'string' }, slot: { type: 'string' } });
const { ledger, market, scan, snapshots, plan, registry } = loadCompetitorPositions(REPO_ROOT);
const slots = [...plan.slots, ...plan.channels.x.slots, ...plan.channels.instagram.slots];
const slot = args.slot ? slots.find((s) => s.id === args.slot) : null;
if (args.slot && !slot) {
  console.error(`枠 ${args.slot} が無い`);
  process.exit(1);
}
const exam = slot?.exam ?? args.exam;
const positions = exam ? ledger.positions.filter((p) => p.exams.includes(exam)) : ledger.positions;
if (positions.length === 0) {
  console.error(`立ち位置が無い: ${exam}`);
  process.exit(1);
}
if (slot) {
  const m = slotMaterials(slot, plan);
  console.log(`枠 ${slot.id}: ${slot.title}（立ち位置 ${slot.stance}・材料は ${m.status === 'accepted' ? '採用' : '提案'}）`);
  for (const e of m.planned) console.log(`- 割り当て済み ${e.title ?? e.pack ?? e.id}（${e.action}）`);
  for (const pack of m.candidates) console.log(`- 候補の動画パック ${pack}`);
  for (const target of m.targets) console.log(`- 送り先 ${target}`);
  for (const product of m.products) console.log(`- 使う商品 ${product}`);
  if (m.make) console.log(`- 作るもの ${m.make}`);
  if (m.angles.length) console.log(`- 切り口 ${m.angles.join('・')}（content-angle-policy）`);
  console.log('');
}
const snapshotDates = Object.entries(snapshots).map(([ch, s]) => `${ch} ${s.date}`).join('・');
console.log(`取得日: ${snapshotDates}`);
for (const p of positions) {
  console.log(`\n# ${positionLabel(p, registry)}（分析 ${p.reviewedOn}）\n${p.summary}`);
  console.log('\n競合');
  for (const r of p.rivals) {
    const facts = rivalFacts(r, snapshots);
    const presence = examPresence(r, p.exams, market, scan);
    console.log(`- ${r.channel} ${r.handle}: ${r.holds}（${[presence, facts.text].filter(Boolean).join('／')}）`);
  }
  console.log('\n勝負しない所');
  for (const a of p.avoid) console.log(`- ${a.text}: ${a.why}`);
  console.log('\n取る立ち位置');
  for (const a of p.stances) {
    if (slot?.stance && a.id !== slot.stance) continue;
    console.log(`- [${a.state}] ${a.id}（${a.stage}・${a.channels.join('/')}）: ${a.text}。${a.why}`);
    for (const probe of a.probes) {
      const r = runProbe(probe, market, scan, ledger.self);
      console.log(`    確認: ${probe.claim}（${probe.channel} ${r.checked} 件中 ${r.hits} 件）`);
    }
  }
  console.log('\n調査の限界');
  for (const l of p.limits) console.log(`- ${l}`);
  const tail = prominentRivals(p.exams, market, scan, ledger.self).length;
  console.log(`\n市場の検索で目立つ相手: ${tail}（全件 ${p.rivals.length + p.dismissed.length} を分析済み）`);
}
