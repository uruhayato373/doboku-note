#!/usr/bin/env node
// deploy-main — develop の検査済み commit を main へ昇格し、本番の確認までを 1 回で行う。
//
//   npm run deploy:main             # 検査の完了を待って昇格し、本番を確かめる
//   npm run deploy:main -- --dry-run # 昇格先と差分だけ出す
//
// 途中の失敗で必ず止まり、exit 0 は「本番の確認まで通った」ときだけ。手で連結したコマンドは、
// push の失敗の後も本番確認が旧版に対して緑を出す（2026-11-05 の事故。経緯は feedback_shell_fail_fast）。
// exit: 0 成功 / 1 検査・push・デプロイ・本番の失敗 / 2 検査不成立（本番に届かないなど）
//
// checkout しないので、作業ツリーと並行セッションに触らない。

import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { findDeployRun, pickGateTarget, pushRejectedAsStale } from './lib/deploy-main.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';

const GATE = 'Pre-merge check (quality audit + build)';
const DEPLOY = 'cloudflare-deploy.yml';
const REPO_URL = 'https://github.com/uruhayato373/doboku-note.git';
const dryRun = process.argv.includes('--dry-run');

function run(cmd, args, { allowFail = false } = {}) {
  const res = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (res.status !== 0 && !allowFail) stop(1, `${cmd} ${args.join(' ')} が失敗: ${(res.stderr || res.stdout || '').trim().slice(-600)}`);
  return res;
}
const out = (cmd, args) => run(cmd, args).stdout.trim();
const json = (cmd, args) => JSON.parse(out(cmd, args));
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function stop(code, message) {
  console.error(`[deploy-main] 停止（exit ${code}）: ${message}`);
  process.exit(code);
}

function waitForGate() {
  for (;;) {
    run('git', ['fetch', '-q', 'origin']);
    const commits = out('git', ['rev-list', '--max-count=40', 'origin/develop']).split('\n');
    const runs = json('gh', ['run', 'list', '--branch', 'develop', '--workflow', GATE, '--limit', '30', '--json', 'databaseId,headSha,status,conclusion']);
    const pick = pickGateTarget(commits, runs);
    if (pick.kind === 'ok') return pick.sha;
    if (pick.kind === 'none') stop(2, `develop の直近 40 commit に検査の結果が無い`);
    if (pick.kind === 'fail') stop(1, `develop の検査が ${pick.conclusion}（${pick.sha.slice(0, 9)}・run ${pick.runId}）。直してから昇格する`);
    console.log(`[deploy-main] 検査の完了を待つ（${pick.sha.slice(0, 9)}）`);
    if (run('gh', ['run', 'watch', String(pick.runId), '--exit-status'], { allowFail: true }).status !== 0) sleep(5000);
  }
}

function buildMerge(target) {
  run('git', ['fetch', '-q', 'origin']);
  const merged = run('git', ['merge-tree', '--write-tree', 'origin/main', target], { allowFail: true });
  if (merged.status !== 0) stop(1, `main と develop が競合する: ${merged.stdout.trim().slice(0, 400)}`);
  const message = 'Merge develop into main\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>';
  return out('git', ['commit-tree', merged.stdout.trim().split('\n')[0], '-p', 'origin/main', '-p', target, '-m', message]);
}

function remoteMain() {
  return out('git', ['ls-remote', REPO_URL, 'refs/heads/main']).split(/\s/)[0];
}

function push(target) {
  let lastError = '';
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const commit = buildMerge(target);
    const refspec = `${commit}:refs/heads/main`;
    const res = run('git', ['-c', 'credential.helper=!gh auth git-credential', '-c', 'http.postBuffer=524288000', 'push', REPO_URL, refspec], { allowFail: true });
    // 終了コードではなく、リモートの main の実体で成否を決める
    if (remoteMain() === commit) return commit;
    lastError = res.stderr.trim().slice(-400);
    console.error(`[deploy-main] push ${attempt} 回目が未達: ${lastError}`);
    if (!pushRejectedAsStale(lastError)) sleep(5000);
  }
  return stop(1, `main へ push できなかった: ${lastError}`);
}

function waitForDeploy(commit) {
  let started = null;
  for (let i = 0; i < 16 && !started; i += 1) {
    sleep(15000);
    started = findDeployRun(json('gh', ['run', 'list', '--workflow', DEPLOY, '--limit', '10', '--json', 'databaseId,headSha']), commit);
  }
  if (!started) stop(1, `デプロイが起動していない（${commit.slice(0, 9)}）。先頭の [skip ci] などを確かめる`);
  console.log(`[deploy-main] デプロイを待つ（run ${started.databaseId}）`);
  if (run('gh', ['run', 'watch', String(started.databaseId), '--exit-status'], { allowFail: true }).status !== 0) {
    const log = run('gh', ['run', 'view', String(started.databaseId), '--log-failed'], { allowFail: true }).stdout;
    console.error(log.split('\n').slice(-30).join('\n'));
    stop(1, `デプロイが失敗（run ${started.databaseId}）`);
  }
}

const target = waitForGate();
console.log(`[deploy-main] 昇格先 ${target.slice(0, 9)}: ${out('git', ['log', '-1', '--format=%s', target]).slice(0, 70)}`);
if (dryRun) {
  console.log(out('git', ['log', '--oneline', '--max-count=30', `origin/main..${target}`]) || '（差分なし）');
  process.exit(0);
}
const commit = push(target);
console.log(`[deploy-main] main を ${commit.slice(0, 9)} へ進めた`);
waitForDeploy(commit);
const ssr = spawnSync(process.execPath, ['scripts/check-production-ssr.mjs'], { cwd: ROOT, stdio: 'inherit' });
if (ssr.status !== 0) stop(ssr.status === 2 ? 2 : 1, '本番の確認が通らない');
console.log(`[deploy-main] 完了: ${commit.slice(0, 9)} が本番に出て、確認も通った`);
