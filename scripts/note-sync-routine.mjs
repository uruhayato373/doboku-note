#!/usr/bin/env node
/**
 * note-sync-routine.mjs — 土曜の Mac の収集（weekly-collect の note-sync 段）が回す note の記事単位の同期
 * ---------------------------------------------------------------------------
 * note の記事は、本文・カバー・タグを別々に直すたびにエディタを開いて「更新する」を押すことになる。この週次は、
 * 1 週間にたまった変更を記事ごとにまとめ、**1 記事につき 1 回の更新**で note へ反映する。
 * なぜ Mac か: note への書き込みはログインしたブラウザでしかできず、CI は読み取りだけに限っている
 * （playwright-auth-profile は CI の投稿系スクリプトにプロファイルを渡さない）。判定は CI の check-note-sync と共通。
 *
 * 1 回の実行でやること（scripts/weekly-collect.mjs が収集用 worktree＝最新の develop で呼ぶ）:
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
 *       # 記事をパスの先頭で絞る（試験直前にその資格だけ先に流す）。マガジンのカバーは触らない。note から読むのも対象の記事だけ
 *   node scripts/note-sync-routine.mjs --magazines-only
 *       # マガジンのカバーだけ登録する（記事は読まない・触らない）
 * exit: 0 = 正常終了（対象なし・日次上限待ちは件数を別記）/ 1 = どこかで失敗・要ログイン
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
import { classifyNoteSyncRun } from './lib/note-sync-results.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { NOTE_CREATOR } from './lib/site-identity.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { lastLines, runAccountGated, runWithRetry } from './lib/note-sync-save.mjs';

const TAG = '[note-sync]';
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const NO_PUSH = args.includes('--no-push');
const MAX = Number(args[args.indexOf('--max') + 1]) || 200;
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
if (args.includes('--only') && !ONLY) { console.error('--only にはパスの先頭（例: content/note/1級・2級土木/1級土木/）が要る'); process.exit(2); }
const MAGAZINES_ONLY = args.includes('--magazines-only');
if (ONLY && MAGAZINES_ONLY) { console.error('--only と --magazines-only は同時に使えない'); process.exit(2); }
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
  console.error(`${TAG} ブランチに乗った HEAD では本番を実行しない（収集用 worktree で動かす: node scripts/weekly-collect.mjs --only note-sync）。--dry-run は可`);
  process.exit(1);
}

// Drive 本体が止まっていると、マウントの読み出しが全部 ETIMEDOUT になる（2026-10-04 の週次・DN-0567）。
// 最初の取り寄せの前に 1 回だけ確かめ、止まっていれば起動して待つ。
let driveChecked = false;
function ensureDriveRunning() {
  if (driveChecked || process.platform !== 'darwin') return;
  driveChecked = true;
  if (spawnSync('pgrep', ['-f', 'Google Drive.app/Contents/MacOS/Google Drive']).status === 0) return;
  console.log(TAG + ' Google Drive の本体が止まっていたので起動して 60 秒待つ');
  spawnSync('open', ['-a', 'Google Drive']);
  spawnSync('sleep', ['60']);
}

async function syncArticles(items) {
  const updated = []; const failed = []; const deferred = []; let attempted = 0;
  for (let i = 0; i < items.length; i += CHUNK) {
    // 本文を上げ直す記事の配布 PDF を Drive から取り寄せる。取り寄せられなかった記事は note へ送らない
    // （送ると note-update-body が「添付がローカルに無い」で 1 本ずつ失敗し、5 本続くと残り全部が止まる。
    //   2026-10-04 の週次は BK-01 道路の 7 本でこれに当たり、以降の記事とマガジンが反映されなかった）
    const pulled = [];
    for (const item of items.slice(i, i + CHUNK)) {
      if (item.needsPdfPull) {
        ensureDriveRunning();
        const r = node(['scripts/drive-vault-sync.mjs', '--pull', '--path', `${dirname(item.path)}/`, '--commit']);
        if (r.status !== 0) {
          const why = r.out.split('\n').filter((l) => /FAIL|vault に無い|コピー失敗|台帳と違う|マウント/.test(l)).slice(0, 2).join(' / ').trim().slice(0, 300);
          problems.push(`PDF を Drive から取り寄せられない: ${item.path}${why ? `（${why}）` : ''}`);
          failed.push({ path: item.path, parts: item.parts, reason: `配布 PDF を取り寄せられない${why ? `: ${why}` : ''}` });
          continue;
        }
      }
      pulled.push(item);
    }
    const chunk = pulled;
    if (!chunk.length) continue;
    mkdirSync(WORK, { recursive: true });
    const list = join(WORK, `list-${stamp()}.txt`);
    writeFileSync(list, chunk.map((x) => x.path).join('\n') + '\n');
    const run = node(['scripts/note-update-body.mjs', '--sync', '--list', list, '--commit', '--max-consecutive-fail', '5'], list.replace(/\.txt$/, '.log'));
    if (run.status === 2) { // account gate（dobokunote 未ログイン）
      problems.push('note にログインできていない（account gate で停止）');
      notify('note のログインが切れています。同期を止めました');
      return { updated, failed, deferred, attempted, stopped: true, loggedOut: true };
    }
    const results = classifyNoteSyncRun(chunk, run.out);
    updated.push(...results.updated); failed.push(...results.failed); deferred.push(...results.deferred);
    attempted += results.attempted;
    if (results.dailyLimit) {
      deferred.push(...items.slice(i + CHUNK).map((item) => ({ path: item.path, parts: item.parts, reason: 'attachment-daily-limit' })));
      console.log(`${TAG} 添付の日次上限で停止（更新 ${updated.length}・失敗 ${failed.length}・翌日以降 ${deferred.length}）。残りは次回の反映計画に残す`);
      return { updated, failed, deferred, attempted, stopped: true };
    }
    console.log(`${TAG} 記事 ${Math.min(i + CHUNK, items.length)}/${items.length}（更新 ${updated.length}・失敗 ${failed.length}）`);
    if (/\[ABORT\] \d+ 本連続で失敗/.test(run.out)) { problems.push('記事の更新が連続で失敗したので残りを止めた（note 側の変更・レート制限を疑う）'); return { updated, failed, deferred, attempted, stopped: true }; }
  }
  return { updated, failed, deferred, attempted, stopped: false };
}

async function liveMagazine(noteKey) {
  try {
    return (await fetchCreatorMagazines(NOTE_CREATOR)).find((m) => m.key === noteKey);
  } catch {
    await new Promise((r) => setTimeout(r, 5000));
    return (await fetchCreatorMagazines(NOTE_CREATOR)).find((m) => m.key === noteKey);
  }
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
    // account ゲートの exit 2 は同じ誌を 1 回だけやり直し、2 回続けて 2 のときだけログイン切れとして止める（DN-0568）
    const run = runAccountGated(() => node(['scripts/note-magazine-cover.mjs', '--key', item.noteKey, '--dir', dir, '--commit'], join(WORK, `mag-${item.noteKey}-${stamp()}.log`)));
    if (run.loggedOut) { problems.push(`note にログインできていない（account gate で 2 回続けて停止: ${item.key}）`); notify('note のログインが切れています。同期を止めました'); break; }
    if (run.attempts > 1 && run.status === 0) console.log(`${TAG} マガジン ${item.key}: account gate の一時的な失敗をやり直しで通過`);
    if (run.status !== 0) { failed.push({ key: item.key, reason: `登録失敗（exit ${run.status}）` }); continue; }
    // 登録後の確認で一覧を読む。会社 PC のプロキシは一時的に 407 を返すので 1 回だけ読み直し、それでも読めなければ
    // その誌だけ失敗にして次へ進む（例外で全体が落ちると台帳が push されない。2026-10-07 に 40 誌目で落ちた）
    let live;
    try {
      live = await liveMagazine(item.noteKey);
    } catch (error) {
      failed.push({ key: item.key, reason: `登録後の確認で一覧を読めない: ${String(error.message).slice(0, 120)}` });
      continue;
    }
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
const plan = MAGAZINES_ONLY ? { items: [] } : await buildSyncPlan(ROOT);
const { targets } = await loadNoteCoverInventory(ROOT);
const byKey = new Map(targets.map((t) => [t.key, t]));
const design = designVersions(ROOT);
// --only のときは対象の記事だけを note から読む（全件の読み込みは週次の全件同期だけでよい）。
// 全件だと約 900 件 × 250ms 待ち＋会社 PC のプロキシで 10 分超かかり、40 本の反映が始まらなかった（2026-10-07）。
// 集計（counts）と実行記録の plan も対象の範囲だけになる（記録には only を残す）。
if (ONLY) plan.items = plan.items.filter((i) => i.path.startsWith(ONLY));
const liveArticles = MAGAZINES_ONLY ? {} : await fetchLiveArticles(ONLY ? targets.filter((t) => t.key.startsWith(ONLY)) : targets);
withLiveCovers(plan, liveArticles);
const counts = countPlan(plan.items);
const articles = orderForRun(plan.items).slice(0, MAX);
const ledger = readLedger();
// --only はマガジンのカバーを触らないので、マガジンの一覧も読まない
const liveMagazines = ONLY ? {} : await fetchLiveMagazines(ROOT, targets, ledger);
const magPlan = planCoverWork({ targets: ONLY ? [] : targets.filter((t) => t.kind === 'magazine'), ledger, design, liveArticles: {}, liveMagazines });
console.log(`${TAG} 記事${ONLY ? `（${ONLY} の範囲）` : ''}: 反映済み ${counts.synced} / 反映待ち ${counts.ready}（今回 ${articles.length}${ONLY ? `・${ONLY} のみ` : ''}）/ 止まっている ${counts.blocked} ${JSON.stringify(counts.blockers)}`);
console.log(`${TAG} 部品: ${JSON.stringify(counts.parts)} / PDF 取り寄せ ${counts.pdfPull} / マガジン 要登録 ${magPlan.pending.length}・保留 ${magPlan.hold.length}`);

if (DRY) {
  for (const x of articles.slice(0, 30)) console.log(`  - ${x.path}（${x.parts.join('・')}${x.needsPdfPull ? '・PDF 取り寄せ' : ''}）`);
  process.exit(0);
}

// ---- 2〜4. 更新
const art = articles.length ? await syncArticles(articles) : { updated: [], failed: [], deferred: [], attempted: 0, stopped: false };
// マガジンは記事と別の設定画面なので、記事の連続失敗（PDF 欠落など）では止めない。止めるのはログイン切れだけ。
// 以前は art.stopped で飛ばしており、BK-01 道路の PDF 欠落が毎週マガジン 38 誌の登録を止めていた（2026-10-07）。
const mag = art.loggedOut || !magPlan.pending.length ? { updated: [], failed: [] } : await syncMagazines(magPlan.pending, byKey, design);

// ---- 5. 保存・記録
// 保存は冪等なので 1 回だけ再試行し、落ちたら理由（出力の末尾）を problems とログへ残す（DN-0763）
const save = (args, label) => {
  const r = runWithRetry(() => node(args));
  if (r.status === 0) return;
  console.error(`${TAG} ${label}の出力（末尾・${r.attempts} 回試行）:`);
  for (const l of lastLines(r.out)) console.error(`  ${l}`);
  problems.push(`${label}（${r.reason}）`);
};
if (art.updated.some((x) => x.parts.includes('cover'))) {
  save(['scripts/asset-offload.mjs', '--group', 'note-cover-png', '--include-untracked', '--skip-existing', '--commit'], '記事カバーを R2 へ保存できなかった（asset-offload）');
}
if (mag.updated.length) {
  save(['scripts/drive-vault-sync.mjs', '--group', 'note-magazine-cover-png', '--commit'], 'マガジンカバーを Drive へ保存できなかった（drive-vault-sync）');
}
appendSyncLog({
  startedAt, finishedAt: new Date().toISOString(),
  plan: { synced: counts.synced, ready: counts.ready, blocked: counts.blocked, blockers: counts.blockers, ...(ONLY ? { only: ONLY } : {}), ...(MAGAZINES_ONLY ? { magazinesOnly: true } : {}) },
  articles: { selected: articles.length, attempted: art.attempted, updated: art.updated, failed: art.failed, deferred: art.deferred },
  magazines: { attempted: magPlan.pending.length, updated: mag.updated, failed: mag.failed },
  problems,
});
commitAndPush();

console.log(`${TAG} 更新 記事 ${art.updated.length}/${articles.length}・マガジン ${mag.updated.length}/${magPlan.pending.length}`);
if (art.deferred.length) console.log(`${TAG} 未反映 ${art.deferred.length} 記事は日次上限待ち。次回実行で継続する`);
if (art.failed.length || mag.failed.length || problems.length) {
  for (const f of [...art.failed, ...mag.failed].slice(0, 20)) console.error(`${TAG} ✗ ${f.path || f.key}: ${f.reason}`);
  for (const p of problems) console.error(`${TAG} ✗ ${p}`);
  if (!problems.some((p) => p.includes('ログイン'))) notify(`note 同期で ${art.failed.length + mag.failed.length + problems.length} 件の問題（管理画面 /content/note-sync）`);
  process.exit(1);
}
