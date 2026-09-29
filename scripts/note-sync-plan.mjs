#!/usr/bin/env node
/**
 * note-sync-plan.mjs — 公開済み note 記事ごとの反映計画（未反映の部品と、止まっている理由・直し方）を出す。
 * ---------------------------------------------------------------------------
 * 判定は scripts/lib/note-sync-plan.mjs（Mac の週次 note-sync-routine・CI の check-note-sync・管理画面と共通）。
 * オフライン（note の公開 API は見ない）。note 上のカバーが消えた等の実物の確認は check-note-sync が行う。
 *
 * 使い方:
 *   node scripts/note-sync-plan.mjs                        # 件数と止まっている記事
 *   node scripts/note-sync-plan.mjs --json                 # 管理画面用（items / counts）
 *   node scripts/note-sync-plan.mjs --out list.txt [--limit 50]
 *       反映待ちを週次と同じ順（本文なし → 画像なしの本文 → 画像ありの本文）で書き出す。
 *       手で流すなら: node scripts/note-update-body.mjs --sync --list list.txt --commit
 * exit: 0 常に（レポート。反映の要否は check-note-sync が exit で返す）
 * ---------------------------------------------------------------------------
 */
import { writeFileSync } from 'node:fs';
import { BLOCKERS, buildSyncPlan, orderForRun } from './lib/note-sync-plan.mjs';

const argv = process.argv.slice(2);
const arg = (n, d = null) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const OUT = arg('--out');
const LIMIT = Number(arg('--limit', '200')) || 200;

const plan = await buildSyncPlan(process.cwd());
if (argv.includes('--json')) {
  process.stdout.write(JSON.stringify({ counts: plan.counts, design: plan.design, blockers: BLOCKERS, items: plan.items.filter((i) => i.status !== 'synced') }, null, 2) + '\n');
} else {
  const c = plan.counts;
  console.log(`[note-sync-plan] 公開記事 ${plan.items.length}: 反映済み ${c.synced} / 反映待ち ${c.ready} / 止まっている ${c.blocked}`);
  console.log(`  反映待ちの部品: 本文 ${c.parts.body}・カバー ${c.parts.cover}・タグ ${c.parts.tags}（配布 PDF の取り寄せが要る ${c.pdfPull}）`);
  for (const [k, n] of Object.entries(c.blockers)) {
    console.log(`  止まっている: ${BLOCKERS[k].label} ${n} 件 → ${BLOCKERS[k].action}`);
    for (const i of plan.items.filter((x) => x.blocker === k)) console.log(`    ${i.noteId}  ${i.path}${i.abort ? `（${i.abort.at}: ${i.abort.reason}）` : ''}`);
  }
}
if (OUT) {
  const list = orderForRun(plan.items).slice(0, LIMIT);
  writeFileSync(OUT, list.map((i) => i.path).join('\n') + '\n', 'utf8');
  console.error(`[note-sync-plan] 反映待ち ${list.length} 件（上限 ${LIMIT}）→ ${OUT}`);
}
