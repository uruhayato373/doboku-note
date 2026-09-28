#!/usr/bin/env node
/**
 * check-note-cover-live.mjs — note 上のカバー（記事 eyecatch・マガジン cover）が最新デザインで登録済みかを判定する。
 * ---------------------------------------------------------------------------
 * 判定だけで、生成も登録もしない（ログイン不要・公開 API の読み取りのみ）。CI の note-live-audit.yml が週次で回す。
 * 直すのは Mac の週次 launchd（scripts/note-cover-routine.mjs）で、同じ判定（scripts/lib/note-cover-live.mjs の
 * planCoverWork）で対象を選んで生成→登録→台帳更新する。
 *
 * 見るもの: 対象一覧（note-cover-inventory）× 台帳（.claude/state/note/cover-ledger.json）× note の公開 API。
 * 手元の PNG の有無は見ない。
 *
 * 使い方:
 *   node scripts/check-note-cover-live.mjs            # 人向けサマリ
 *   node scripts/check-note-cover-live.mjs --json     # { summary, pending, hold, checked }
 *
 * exit 0 = 全件最新 / 1 = 要登録あり（Mac の週次が次回拾う。止まっていれば npm run note-cover:install -- --status）
 *      2 = 検査不成立（記事が下限未満・API 取得失敗が 20% 超・マガジン一覧が取れない＝CLAUDE.md §9）
 * ---------------------------------------------------------------------------
 */
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNoteCoverInventory } from './lib/note-cover-inventory.mjs';
import { designVersions, fetchLiveArticles, fetchLiveMagazines, planCoverWork, readLedger, summarize } from './lib/note-cover-live.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[check-note-cover-live]';
const MIN_ARTICLES = 500;
const MAX_FETCH_FAIL_RATE = 0.2;
const json = process.argv.includes('--json');

const { targets } = await loadNoteCoverInventory(ROOT);
const ledger = readLedger(ROOT);
const design = designVersions(ROOT);
const withId = targets.filter((t) => t.kind === 'article' && t.noteId);
const liveArticles = await fetchLiveArticles(targets, { onProgress: json ? null : (i, n) => console.log(`${TAG} 記事 ${i}/${n}`) });
let liveMagazines;
try {
  liveMagazines = await fetchLiveMagazines(ROOT, targets, ledger);
} catch (error) {
  console.error(`${TAG} ✗ 検査不成立: ${error.message}`);
  process.exit(2);
}
const plan = planCoverWork({ targets, ledger, design, liveArticles, liveMagazines });
const failed = Object.values(liveArticles).filter((x) => x.error).length;
const checked = { articles: targets.filter((t) => t.kind === 'article').length, articlesWithNoteId: withId.length, apiFailed: failed, magazines: targets.filter((t) => t.kind === 'magazine').length };
const summary = summarize(plan);

if (json) console.log(JSON.stringify({ checked, design, summary, pending: plan.pending, hold: plan.hold }, null, 2));
else {
  console.log(`${TAG} 記事 ${checked.articles}（noteId あり ${checked.articlesWithNoteId}・API 失敗 ${failed}）/ マガジン ${checked.magazines} を実検査`);
  console.log(`${TAG} 最新 ${plan.ok.length} / 要登録 ${plan.pending.length} / 保留 ${plan.hold.length}`);
  for (const [k, n] of Object.entries(summary.pending)) console.log(`  要登録 ${k}: ${n}`);
  for (const x of plan.pending.slice(0, 10)) console.log(`    - ${x.key}（${x.reason}）`);
  if (plan.pending.length > 10) console.log(`    … 他 ${plan.pending.length - 10} 件`);
  const holdReasons = plan.hold.reduce((m, x) => ({ ...m, [x.reason.replace(/（.*$/, '')]: (m[x.reason.replace(/（.*$/, '')] || 0) + 1 }), {});
  for (const [r, n] of Object.entries(holdReasons)) console.log(`  保留 ${r}: ${n}`);
}

if (checked.articles < MIN_ARTICLES || (withId.length && failed / withId.length > MAX_FETCH_FAIL_RATE)) {
  console.error(`${TAG} ✗ 検査不成立: 記事 ${checked.articles}（下限 ${MIN_ARTICLES}）/ API 失敗 ${failed}/${withId.length}`);
  process.exit(2);
}
if (plan.pending.length) {
  console.error(`${TAG} ✗ note 上のカバーが最新でない ${plan.pending.length} 件。Mac の週次（npm run note-cover:install -- --status）が次回登録する`);
  process.exit(1);
}
if (!json) console.log(`${TAG} ✓ 公開中の記事・マガジンのカバーはすべて最新デザインで登録済み`);
