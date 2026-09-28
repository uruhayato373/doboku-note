#!/usr/bin/env node
/**
 * note-cover-routine.mjs — Mac の launchd（com.doboku-note.note-cover）が毎週回す note カバーの生成・登録
 * ---------------------------------------------------------------------------
 * なぜ Mac か: note へのカバー登録はログインしたブラウザでしか行えず、CI は読み取りだけに限っている
 * （playwright-auth-profile は CI の投稿系スクリプトにプロファイルを渡さない）。判定は CI の
 * check-note-cover-live が同じ lib（scripts/lib/note-cover-live.mjs）で行い、本スクリプトはその「要登録」を直す。
 *
 * 1 回の実行でやること（scripts/scheduled/note-cover.sh が専用 worktree＝最新の develop で呼ぶ）:
 *   1. 対象一覧 × 台帳 × note の公開 API から要登録（カバー無し・台帳に無い・デザイン版が古い・文言が変わった・
 *      note 側で画像が変わった）を決める
 *   2. 記事: カバーを生成して img/cover*.png へ書き、note-update-cover で 25 件ずつ登録。登録できた記事は
 *      公開 API で画像 URL を読み直して台帳へ記録（読めなければ記録しない＝次回また対象）
 *   3. マガジン: _cover.png を生成して note-magazine-cover で登録し、同様に記録
 *   4. 保管: 記事カバーは private R2（asset-offload）、マガジンは Drive vault（drive-vault-sync）
 *   5. 台帳・保管台帳・再公開ハッシュを commit して develop へ push
 *   ログインが切れていれば macOS の通知で知らせる。見張りは CI（note-live-audit の check-note-cover-live）。
 *
 * CLI（専用 worktree のルートで実行する。ブランチに乗った HEAD では --dry-run 以外を拒否する）:
 *   node scripts/note-cover-routine.mjs                 # 本番（登録・commit・push）
 *   node scripts/note-cover-routine.mjs --dry-run       # 要登録の一覧だけ（生成・登録しない）
 *   node scripts/note-cover-routine.mjs --max 100       # 1 回に登録する記事の上限（既定 300・マガジンは全件）
 *   node scripts/note-cover-routine.mjs --no-push       # commit まで
 * exit: 0 = 全部できた（登録するものが無かったも含む）/ 1 = どこかで失敗・要ログイン
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadNoteCoverInventory } from './lib/note-cover-inventory.mjs';
import { renderNoteCharacterCover } from './lib/note-character-cover.mjs';
import { fetchNoteDetails, fetchCreatorMagazines } from './lib/note-api.mjs';
import {
  CREATOR, designVersions, fetchLiveArticles, fetchLiveMagazines, planCoverWork, readLedger, recordCover, sameImage, summarize, writeLedger, LEDGER_PATH,
} from './lib/note-cover-live.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[note-cover]';
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const NO_PUSH = args.includes('--no-push');
const MAX = Number(args[args.indexOf('--max') + 1]) || 300;
const CHUNK = 25;
const WORK = join(ROOT, '.tmp/note-cover-routine');
const STATE_PATHS = [LEDGER_PATH, '.claude/state/assets/manifest.json', '.claude/state/assets/drive-manifest.json', '.claude/state/note-republish-hashes.json'];

const problems = [];
const git = (a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' });
const node = (a, log) => {
  const r = spawnSync(process.execPath, a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: process.env });
  if (log) { mkdirSync(dirname(log), { recursive: true }); writeFileSync(log, (r.stdout || '') + (r.stderr || '')); }
  return { status: r.status ?? 1, out: (r.stdout || '') + (r.stderr || '') };
};
const sha256 = (p) => createHash('sha256').update(readFileSync(join(ROOT, p))).digest('hex');
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
function notify(message) {
  if (process.platform !== 'darwin') return;
  spawnSync('osascript', ['-e', `display notification "${message}" with title "doboku-note note カバー"`]);
}

// 人の checkout で本番を走らせると、今いるブランチへ台帳を commit してしまう
if (!DRY && git(['symbolic-ref', '-q', 'HEAD']).status === 0) {
  console.error(`${TAG} ブランチに乗った HEAD では本番を実行しない（専用 worktree で動かす: npm run note-cover:install -- --run-now）。--dry-run は可`);
  process.exit(1);
}

async function writeCover(target) {
  const { buffer } = await renderNoteCharacterCover(ROOT, target.input);
  const dest = join(ROOT, target.imagePath);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest + '.tmp', buffer);
  renameSync(dest + '.tmp', dest);
}

/** note-update-cover の出力から「[article] nKEY …」ごとの成否を読む。 */
function parseUpdateLog(text) {
  const result = {};
  let cur = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^\[article\] (n[0-9a-f]+) /);
    if (m) { cur = m[1]; result[cur] = null; continue; }
    if (!cur) continue;
    if (/^\[OK\]/.test(line)) result[cur] = 'ok';
    else if (/^\[(FAIL|ABORT|skip|ERR)\]/.test(line)) result[cur] ||= line.slice(0, 120);
  }
  return result;
}

async function registerArticles(items, byKey, ledger, design) {
  let ok = 0;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    const ready = [];
    for (const item of chunk) {
      try { await writeCover(byKey.get(item.key)); ready.push(item); }
      catch (error) { problems.push(`生成失敗 ${item.key}: ${error.message}`); }
    }
    if (!ready.length) continue;
    const list = join(WORK, `list-${stamp()}.txt`);
    mkdirSync(WORK, { recursive: true });
    writeFileSync(list, ready.map((x) => byKey.get(x.key).source).join('\n') + '\n');
    const run = node(['scripts/note-update-cover.mjs', '--list', list, '--commit'], list.replace(/\.txt$/, '.log'));
    const results = parseUpdateLog(run.out);
    if (run.status === 2) { // note-update-cover の account gate（dobokunote 未ログイン）
      problems.push('note にログインできていない（account gate で停止）');
      notify('note のログインが切れています。カバー登録を止めました');
      return ok;
    }
    for (const item of ready) {
      if (results[item.noteKey] !== 'ok') { problems.push(`登録失敗 ${item.key}: ${results[item.noteKey] || '結果なし'}`); continue; }
      const live = await fetchNoteDetails(item.noteKey, { retries: 2 });
      const url = live.data?.eyecatch;
      if (!url || sameImage(url, item.liveUrl)) { problems.push(`登録後も画像 URL が変わらない ${item.key}`); continue; }
      recordCover(ledger, byKey.get(item.key), { design: design.article, noteKey: item.noteKey, liveUrl: url, sha256: sha256(byKey.get(item.key).imagePath) });
      ok++;
    }
    writeLedger(ROOT, ledger); // chunk ごとに保存（途中で止まっても登録済みは記録に残る）
    console.log(`${TAG} 記事 ${Math.min(i + CHUNK, items.length)}/${items.length}（記録 ${ok}）`);
  }
  return ok;
}

async function registerMagazines(items, byKey, ledger, design) {
  let ok = 0;
  for (const item of items) {
    const target = byKey.get(item.key);
    const dir = target.imagePath.replace(/\/_cover\.png$/, '');
    try { await writeCover(target); } catch (error) { problems.push(`生成失敗 ${item.key}: ${error.message}`); continue; }
    const run = node(['scripts/note-magazine-cover.mjs', '--key', item.noteKey, '--dir', dir, '--commit'], join(WORK, `mag-${item.noteKey}-${stamp()}.log`));
    if (run.status === 2) { problems.push('note にログインできていない（account gate で停止）'); notify('note のログインが切れています。カバー登録を止めました'); return ok; }
    if (run.status !== 0) { problems.push(`マガジン登録失敗 ${item.key}（exit ${run.status}）`); continue; }
    const live = (await fetchCreatorMagazines(CREATOR)).find((m) => m.key === item.noteKey);
    if (!live?.cover || sameImage(live.cover, item.liveUrl)) { problems.push(`登録後も画像 URL が変わらない ${item.key}`); continue; }
    recordCover(ledger, target, { design: design.magazine, noteKey: item.noteKey, liveUrl: live.cover, sha256: sha256(target.imagePath) });
    writeLedger(ROOT, ledger);
    ok++;
  }
  return ok;
}

function commitAndPush() {
  git(['add', '--', ...STATE_PATHS]);
  if (git(['diff', '--cached', '--quiet']).status === 0) return;
  const c = git(['commit', '-q', '-m', 'chore(note-cover): 週次のカバー登録を台帳へ記録 [skip ci]']);
  if (c.status !== 0) { problems.push(`commit 失敗: ${c.stderr || c.stdout}`); return; }
  if (NO_PUSH) return;
  for (let i = 0; i < 3; i++) {
    git(['fetch', '-q', 'origin', 'develop']);
    if (git(['rebase', '-q', 'origin/develop']).status !== 0) { git(['rebase', '--abort']); problems.push('develop への rebase が衝突した'); return; }
    if (git(['push', '-q', 'origin', 'HEAD:develop']).status === 0) return;
  }
  problems.push('develop へ push できなかった');
}

const { targets } = await loadNoteCoverInventory(ROOT);
const byKey = new Map(targets.map((t) => [t.key, t]));
const ledger = readLedger(ROOT);
const design = designVersions(ROOT);
const liveArticles = await fetchLiveArticles(targets);
const liveMagazines = await fetchLiveMagazines(ROOT, targets, ledger);
const plan = planCoverWork({ targets, ledger, design, liveArticles, liveMagazines });
const articles = plan.pending.filter((x) => x.kind === 'article').slice(0, MAX);
const magazines = plan.pending.filter((x) => x.kind === 'magazine');
console.log(`${TAG} 最新 ${plan.ok.length} / 要登録 ${plan.pending.length}（今回 記事 ${articles.length}・マガジン ${magazines.length}）/ 保留 ${plan.hold.length}`);
console.log(`${TAG} ${JSON.stringify(summarize(plan).pending)}`);

if (DRY) {
  for (const x of plan.pending.slice(0, 30)) console.log(`  - ${x.key}（${x.reason}）`);
  process.exit(0);
}

const okArticles = articles.length ? await registerArticles(articles, byKey, ledger, design) : 0;
const okMagazines = problems.some((p) => p.includes('ログイン')) || !magazines.length ? 0 : await registerMagazines(magazines, byKey, ledger, design);
if (okArticles) {
  const r = node(['scripts/asset-offload.mjs', '--group', 'note-cover-png', '--include-untracked', '--skip-existing', '--commit']);
  if (r.status !== 0) problems.push('記事カバーを R2 へ保存できなかった（asset-offload）');
}
if (okMagazines) {
  const r = node(['scripts/drive-vault-sync.mjs', '--group', 'note-magazine-cover-png', '--commit']);
  if (r.status !== 0) problems.push('マガジンカバーを Drive へ保存できなかった（drive-vault-sync）');
}
commitAndPush();

console.log(`${TAG} 登録 記事 ${okArticles}/${articles.length}・マガジン ${okMagazines}/${magazines.length}`);
if (problems.length) {
  for (const p of problems.slice(0, 30)) console.error(`${TAG} ✗ ${p}`);
  if (!problems.some((p) => p.includes('ログイン'))) notify(`カバー登録で ${problems.length} 件の問題（ログ: ~/Library/Logs/doboku-note/note-cover.log）`);
  process.exit(1);
}
