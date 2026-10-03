#!/usr/bin/env node
/**
 * note-sync-routine.mjs — Mac の launchd（com.doboku-note.note-sync）が毎週回す note の記事単位の同期
 * ---------------------------------------------------------------------------
 * note の記事は、本文・カバー・タグを別々に直すたびにエディタを開いて「更新する」を押すことになる。この週次は、
 * 1 週間にたまった変更を記事ごとにまとめ、**1 記事につき 1 回の更新**で note へ反映する。
 * なぜ Mac か: note への書き込みはログインしたブラウザでしかできず、CI は読み取りだけに限っている
 * （playwright-auth-profile は CI の投稿系スクリプトにプロファイルを渡さない）。判定は CI の check-note-sync と共通。
 *
 * 1 回の実行でやること（scripts/scheduled/note-sync.sh が専用 worktree＝最新の develop で呼ぶ）:
 *   1. 反映計画（scripts/lib/note-sync-plan.mjs）＋ note 上の今のカバー → 記事ごとの未反映の部品（本文・カバー・タグ）
 *   2. 本文を上げ直す記事のうち、配布 PDF が手元に無いものは Drive vault から取り寄せる（添付を貼り直すため）
 *   3. note-update-body --sync で記事ごとに 1 回だけ更新（カバー → 本文 → タグ → 更新する → API で確認 → 台帳へ記録）
 *   4. マガジンのカバー（記事とは別の設定画面）も同じ判定で登録する
 *   5. 記事カバーは private R2、マガジンカバーは Drive vault へ保存し、台帳と実行記録を develop へ push する
 *   止まっている記事（中断・会員特典の公開範囲未指定など）は触らず、管理画面の /content/note-sync に理由と直し方が出る。
 *
 * CLI（専用 worktree のルートで実行する。ブランチに乗った HEAD では --dry-run 以外を拒否する）:
 *   node scripts/note-sync-routine.mjs                 # 本番（更新・commit・push）
 *   node scripts/note-sync-routine.mjs --dry-run       # 計画だけ（note に触らない）。どの checkout でも可
 *   node scripts/note-sync-routine.mjs --max 100       # 1 回に更新する記事の上限（既定 200・マガジンは全件）
 *   node scripts/note-sync-routine.mjs --no-push       # commit まで
 *   node scripts/note-sync-routine.mjs --only 'content/note/1級・2級土木/1級土木/'
 *       # 記事をパスの先頭で絞る（試験直前にその資格だけ先に流す）。マガジンのカバーは触らない
 * exit: 0 = 全部できた（更新するものが無かったも含む）/ 1 = どこかで失敗・要ログイン
 * ---------------------------------------------------------------------------
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadNoteCoverInventory } from './lib/note-cover-inventory.mjs';
import { renderNoteCharacterCover } from './lib/note-character-cover.mjs';
import { fetchCreatorMagazines } from './lib/note-api.mjs';
import {
  designVersions, fetchLiveArticles, fetchLiveMagazines, planCoverWork, readLedger, recordCover, sameImage, writeLedger,
} from './lib/note-cover-live.mjs';
import { buildSyncPlan, countPlan, orderForRun, withLiveCovers } from './lib/note-sync-plan.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { NOTE_CREATOR } from './lib/site-identity.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const TAG = '[note-sync]';
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const NO_PUSH = args.includes('--no-push');
const MAX = Number(args[args.indexOf('--max') + 1]) || 200;
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
if (args.includes('--only') && !ONLY) { console.error('--only にはパスの先頭（例: content/note/1級・2級土木/1級土木/）が要る'); process.exit(2); }
const CHUNK = 25;
const WORK = join(ROOT, '.tmp/note-sync-routine');
const SYNC_LOG = datasetPath('note.sync-log');
const STATE_PATHS = [
  '.claude/state/note-republish-hashes.json', '.claude/state/note-update-aborted.json', '.claude/state/note-attach-done.json',
  '.claude/state/note-attachment-loss.json', SYNC_LOG, '.claude/state/assets/manifest.json', '.claude/state/assets/drive-manifest.json',
];

const problems = [];
const git = (a) => spawnSync('git', a, { cwd: ROOT, encoding: 'utf8' });
const node = (a, log) => {
  const r = spawnSync(process.execPath, a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: process.env });
  const out = (r.stdout || '') + (r.stderr || '');
  if (log) { mkdirSync(dirname(log), { recursive: true }); writeFileSync(log, out); }
  return { status: r.status ?? 1, out };
};
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
function notify(message) {
  if (process.platform !== 'darwin') return;
  spawnSync('osascript', ['-e', `display notification "${message}" with title "doboku-note note 同期"`]);
}

// 人の checkout で本番を走らせると、今いるブランチへ台帳を commit してしまう
if (!DRY && git(['symbolic-ref', '-q', 'HEAD']).status === 0) {
  console.error(`${TAG} ブランチに乗った HEAD では本番を実行しない（専用 worktree で動かす: npm run note-sync:install -- --run-now）。--dry-run は可`);
  process.exit(1);
}

/** note-update-body の出力から記事ごとの結果を読む。[article] nKEY … の後の [OK] / [FAIL] / [skip] / ABORT。 */
function parseRun(text) {
  const result = {};
  let cur = null;
  for (const line of text.split('\n')) {
    const m = line.match(/^\[(article|skip)\] (n[0-9a-f]+)/);
    if (m) { cur = m[2]; result[cur] = m[1] === 'skip' ? `skip: ${line.slice(0, 160)}` : null; continue; }
    if (!cur || result[cur]?.startsWith?.('skip')) continue;
    if (/^\[OK\]/.test(line)) result[cur] = 'ok';
    else if (/^\[(FAIL|ABORT|ERROR)\]|ABORT:/.test(line) && result[cur] !== 'ok') result[cur] ||= line.slice(0, 160);
  }
  return result;
}

async function syncArticles(items) {
  const updated = []; const failed = [];
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    // 本文を上げ直す記事の配布 PDF を Drive から取り寄せる（無ければ note-update-body が本文を触らず止める）
    for (const item of chunk.filter((x) => x.needsPdfPull)) {
      const r = node(['scripts/drive-vault-sync.mjs', '--pull', '--path', `${dirname(item.path)}/`]);
      if (r.status !== 0) problems.push(`PDF を Drive から取り寄せられない: ${item.path}`);
    }
    mkdirSync(WORK, { recursive: true });
    const list = join(WORK, `list-${stamp()}.txt`);
    writeFileSync(list, chunk.map((x) => x.path).join('\n') + '\n');
    const run = node(['scripts/note-update-body.mjs', '--sync', '--list', list, '--commit', '--max-consecutive-fail', '5'], list.replace(/\.txt$/, '.log'));
    if (run.status === 2) { // account gate（dobokunote 未ログイン）
      problems.push('note にログインできていない（account gate で停止）');
      notify('note のログインが切れています。同期を止めました');
      return { updated, failed, stopped: true };
    }
    const results = parseRun(run.out);
    for (const item of chunk) {
      const r = results[item.noteId];
      if (r === 'ok') updated.push({ path: item.path, parts: item.parts });
      else failed.push({ path: item.path, parts: item.parts, reason: r || '結果なし（連続失敗で中断された可能性）' });
    }
    console.log(`${TAG} 記事 ${Math.min(i + CHUNK, items.length)}/${items.length}（更新 ${updated.length}・失敗 ${failed.length}）`);
    if (/\[ABORT\] \d+ 本連続で失敗/.test(run.out)) { problems.push('記事の更新が連続で失敗したので残りを止めた（note 側の変更・レート制限を疑う）'); return { updated, failed, stopped: true }; }
  }
  return { updated, failed, stopped: false };
}

async function syncMagazines(items, byKey, design) {
  const updated = []; const failed = [];
  const ledger = readLedger();
  for (const item of items) {
    const target = byKey.get(item.key);
    const dir = target.imagePath.replace(/\/_cover\.png$/, '');
    try {
      const { buffer } = await renderNoteCharacterCover(ROOT, target.input);
      const dest = join(ROOT, target.imagePath);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest + '.tmp', buffer); renameSync(dest + '.tmp', dest);
    } catch (error) { failed.push({ key: item.key, reason: `生成失敗: ${error.message}` }); continue; }
    const run = node(['scripts/note-magazine-cover.mjs', '--key', item.noteKey, '--dir', dir, '--commit'], join(WORK, `mag-${item.noteKey}-${stamp()}.log`));
    if (run.status === 2) { problems.push('note にログインできていない（account gate で停止）'); notify('note のログインが切れています。同期を止めました'); break; }
    if (run.status !== 0) { failed.push({ key: item.key, reason: `登録失敗（exit ${run.status}）` }); continue; }
    const live = (await fetchCreatorMagazines(NOTE_CREATOR)).find((m) => m.key === item.noteKey);
    if (!live?.cover || sameImage(live.cover, item.liveUrl)) { failed.push({ key: item.key, reason: '登録後も画像 URL が変わらない' }); continue; }
    recordCover(ledger, target, { design: design.magazine, noteKey: item.noteKey, liveUrl: live.cover, sha256: createHash('sha256').update(readFileSync(join(ROOT, target.imagePath))).digest('hex') });
    writeLedger(ROOT, ledger);
    updated.push({ key: item.key });
  }
  return { updated, failed };
}

function appendSyncLog(entry) {
  const p = join(ROOT, SYNC_LOG);
  const log = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : { runs: [] };
  log.runs = [entry, ...(log.runs || [])].slice(0, 12); // 直近 12 回（週次レビューと管理画面が読む）
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(log, null, 2) + '\n');
}

function commitAndPush() {
  git(['add', '--', ...STATE_PATHS.filter((p) => existsSync(join(ROOT, p)))]);
  if (git(['diff', '--cached', '--quiet']).status === 0) return;
  const c = git(['commit', '-q', '-m', 'chore(note-sync): 週次の記事単位の同期を台帳へ記録 [skip ci]']);
  if (c.status !== 0) { problems.push(`commit 失敗: ${c.stderr || c.stdout}`); return; }
  if (NO_PUSH) return;
  for (let i = 0; i < 3; i++) {
    git(['fetch', '-q', 'origin', 'develop']);
    if (git(['rebase', '-q', 'origin/develop']).status !== 0) { git(['rebase', '--abort']); problems.push('develop への rebase が衝突した'); return; }
    if (git(['push', '-q', 'origin', 'HEAD:develop']).status === 0) return;
  }
  problems.push('develop へ push できなかった');
}

// ---- 1. 計画
const startedAt = new Date().toISOString();
const plan = await buildSyncPlan(ROOT);
const { targets } = await loadNoteCoverInventory(ROOT);
const byKey = new Map(targets.map((t) => [t.key, t]));
const design = designVersions(ROOT);
const liveArticles = await fetchLiveArticles(targets);
withLiveCovers(plan, liveArticles);
const counts = countPlan(plan.items);
const articles = orderForRun(plan.items).filter((i) => !ONLY || i.path.startsWith(ONLY)).slice(0, MAX);
const ledger = readLedger();
const liveMagazines = await fetchLiveMagazines(ROOT, targets, ledger);
const magPlan = planCoverWork({ targets: ONLY ? [] : targets.filter((t) => t.kind === 'magazine'), ledger, design, liveArticles: {}, liveMagazines });
console.log(`${TAG} 記事: 反映済み ${counts.synced} / 反映待ち ${counts.ready}（今回 ${articles.length}${ONLY ? `・${ONLY} のみ` : ''}）/ 止まっている ${counts.blocked} ${JSON.stringify(counts.blockers)}`);
console.log(`${TAG} 部品: ${JSON.stringify(counts.parts)} / PDF 取り寄せ ${counts.pdfPull} / マガジン 要登録 ${magPlan.pending.length}・保留 ${magPlan.hold.length}`);

if (DRY) {
  for (const x of articles.slice(0, 30)) console.log(`  - ${x.path}（${x.parts.join('・')}${x.needsPdfPull ? '・PDF 取り寄せ' : ''}）`);
  process.exit(0);
}

// ---- 2〜4. 更新
const art = articles.length ? await syncArticles(articles) : { updated: [], failed: [], stopped: false };
const mag = art.stopped || !magPlan.pending.length ? { updated: [], failed: [] } : await syncMagazines(magPlan.pending, byKey, design);

// ---- 5. 保存・記録
if (art.updated.some((x) => x.parts.includes('cover'))) {
  const r = node(['scripts/asset-offload.mjs', '--group', 'note-cover-png', '--include-untracked', '--skip-existing', '--commit']);
  if (r.status !== 0) problems.push('記事カバーを R2 へ保存できなかった（asset-offload）');
}
if (mag.updated.length) {
  const r = node(['scripts/drive-vault-sync.mjs', '--group', 'note-magazine-cover-png', '--commit']);
  if (r.status !== 0) problems.push('マガジンカバーを Drive へ保存できなかった（drive-vault-sync）');
}
appendSyncLog({
  startedAt, finishedAt: new Date().toISOString(),
  plan: { synced: counts.synced, ready: counts.ready, blocked: counts.blocked, blockers: counts.blockers },
  articles: { attempted: articles.length, updated: art.updated, failed: art.failed },
  magazines: { attempted: magPlan.pending.length, updated: mag.updated, failed: mag.failed },
  problems,
});
commitAndPush();

console.log(`${TAG} 更新 記事 ${art.updated.length}/${articles.length}・マガジン ${mag.updated.length}/${magPlan.pending.length}`);
if (art.failed.length || mag.failed.length || problems.length) {
  for (const f of [...art.failed, ...mag.failed].slice(0, 20)) console.error(`${TAG} ✗ ${f.path || f.key}: ${f.reason}`);
  for (const p of problems) console.error(`${TAG} ✗ ${p}`);
  if (!problems.some((p) => p.includes('ログイン'))) notify(`note 同期で ${art.failed.length + mag.failed.length + problems.length} 件の問題（管理画面 /content/note-sync）`);
  process.exit(1);
}
