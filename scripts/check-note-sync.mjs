#!/usr/bin/env node
/**
 * check-note-sync.mjs — note の公開記事が原稿どおりに反映済みかを記事単位で判定する（読み取りだけ）。
 * ---------------------------------------------------------------------------
 * CI の note-sync-live.yml が週次で回す。反映は Mac の週次（scripts/note-sync-routine.mjs）の担当で、
 * どちらも scripts/lib/note-sync-plan.mjs（記事ごとの反映計画）と scripts/lib/note-cover-live.mjs（カバー）の同じ判定を使う。
 *
 * 見るもの:
 *   記事 … 本文・画像/PDF・タグ・設定（再公開台帳との差）＋ カバー（台帳の記録×デザイン版×描画入力×note 上の今の画像）
 *   マガジン … カバー（同上。マガジンは記事と別の設定画面で登録する）
 *
 * 使い方:
 *   node scripts/check-note-sync.mjs            # 人向けサマリ
 *   node scripts/check-note-sync.mjs --json     # { counts, magazines, ready, blocked }
 *
 * exit 0 = 全部反映済み / 1 = 反映待ちか止まっている記事がある（止まっている分は管理画面 /content/note-sync に理由と直し方）
 *      2 = 検査不成立（記事が下限未満・API 取得失敗が 20% 超・マガジン一覧が取れない＝CLAUDE.md §9）
 * ---------------------------------------------------------------------------
 */
import { loadNoteCoverInventory } from './lib/note-cover-inventory.mjs';
import { designVersions, fetchLiveArticles, fetchLiveMagazines, planCoverWork, readLedger, summarize } from './lib/note-cover-live.mjs';
import { BLOCKERS, buildSyncPlan, countPlan, withLiveCovers } from './lib/note-sync-plan.mjs';
import { fetchFailDominant } from './lib/inconclusive-gate.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const TAG = '[check-note-sync]';
const MIN_ARTICLES = 500;
const json = process.argv.includes('--json');

const plan = await buildSyncPlan(ROOT);
const { targets } = await loadNoteCoverInventory(ROOT);
const withId = targets.filter((t) => t.kind === 'article' && t.noteId);
const liveArticles = await fetchLiveArticles(targets, { onProgress: json ? null : (i, n) => console.log(`${TAG} 記事 ${i}/${n}`) });
withLiveCovers(plan, liveArticles);
const counts = countPlan(plan.items);
let magPlan;
try {
  const liveMagazines = await fetchLiveMagazines(ROOT, targets, readLedger());
  magPlan = planCoverWork({ targets: targets.filter((t) => t.kind === 'magazine'), ledger: readLedger(), design: designVersions(ROOT), liveArticles: {}, liveMagazines });
} catch (error) {
  console.error(`${TAG} ✗ 検査不成立: ${error.message}`);
  process.exit(2);
}
const failed = Object.values(liveArticles).filter((x) => x.error).length;
const ready = plan.items.filter((i) => i.status === 'ready');
const blocked = plan.items.filter((i) => i.status === 'blocked');

if (json) {
  console.log(JSON.stringify({
    counts, apiFailed: failed, magazines: summarize(magPlan),
    ready: ready.map((i) => ({ path: i.path, parts: i.parts, reasons: i.reasons })),
    blocked: blocked.map((i) => ({ path: i.path, blocker: i.blocker, parts: i.parts })),
    magazinePending: magPlan.pending.map((x) => ({ key: x.key, reason: x.reason })),
  }, null, 2));
} else {
  console.log(`${TAG} 公開記事 ${plan.items.length}（API 失敗 ${failed}）/ マガジン ${magPlan.ok.length + magPlan.pending.length + magPlan.hold.length} を実検査`);
  console.log(`${TAG} 記事: 反映済み ${counts.synced} / 反映待ち ${counts.ready} / 止まっている ${counts.blocked}`);
  console.log(`  反映待ちの部品: 本文 ${counts.parts.body}・カバー ${counts.parts.cover}・タグ ${counts.parts.tags}（配布 PDF の取り寄せが要る ${counts.pdfPull}）`);
  for (const [k, n] of Object.entries(counts.blockers)) console.log(`  止まっている: ${BLOCKERS[k]?.label || k} ${n} 件`);
  for (const i of blocked.slice(0, 10)) console.log(`    - ${i.path}（${i.blocker}）`);
  console.log(`${TAG} マガジン: 最新 ${magPlan.ok.length} / 要登録 ${magPlan.pending.length} / 保留 ${magPlan.hold.length}`);
}

if (plan.items.length < MIN_ARTICLES || fetchFailDominant(failed, withId.length)) {
  console.error(`${TAG} ✗ 検査不成立: 公開記事 ${plan.items.length}（下限 ${MIN_ARTICLES}）/ API 失敗 ${failed}/${withId.length}`);
  process.exit(2);
}
if (ready.length || blocked.length || magPlan.pending.length) {
  console.error(`${TAG} ✗ 未反映 記事 ${ready.length + blocked.length}（止まっている ${blocked.length}）・マガジン ${magPlan.pending.length}。Mac の週次（npm run note-sync:install -- --status）が反映し、止まっている分は管理画面 /content/note-sync`);
  process.exit(1);
}
if (!json) console.log(`${TAG} ✓ 公開中の記事・マガジンはすべて原稿どおりに反映済み`);
