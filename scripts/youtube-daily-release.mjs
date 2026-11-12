#!/usr/bin/env node
/**
 * youtube-daily-release.mjs — 在庫の通常動画とショートを、毎日の割当の範囲で予約へ進める（2026-11-12・運営者の決定）。
 * 順番の判定は scripts/lib/youtube-daily-release.mjs。書き込みは既存の CLI（video-factory・registry・shorts-factory）だけで行う。
 * 手順と罠: .claude/knowledge/reference/video-factory.md「毎日の予約」
 *
 *   npm run youtube-daily -- queue          # 今日の作業の一覧（書かない）
 *   npm run youtube-daily -- run            # 関連動画の済んだショートの予約 → 通常動画 → ショートの投稿（非公開）
 *
 * Studio の関連動画は API で設定できないので、queue の needRelated をブラウザで設定し、
 * `npm run registry -- record-related` で記録してから run を流す（毎晩、親の 20:30 の公開の後）。
 * run は他のセッションと作業ツリーを共有しない専用の worktree で回す（develop へ commit・push する）。
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { loadRegistry } from './lib/content-registry.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { shortsStatus } from './lib/shorts-factory.mjs';
import { nextSlot, readPolicy, uploadsLeft } from './lib/video-publish-gate.mjs';
import { releaseQueue } from './lib/youtube-daily-release.mjs';
import { datasetPath } from './lib/datasets.mjs';

const command = process.argv[2] ?? 'queue';

function queue({ longformPerDay } = {}) {
  const policy = readPolicy(ROOT);
  const reg = loadRegistry(ROOT);
  const stocked = shortsStatus(ROOT).filter((s) => s.stage === 'stocked');
  return releaseQueue({
    publications: reg.publications, stocked, plan: readDataset(ROOT, 'config.channel-annual-plan'),
    uploadsLeft: uploadsLeft(reg.publications, policy), longformPerDay: longformPerDay ?? policy.slot.maxPerDay,
  });
}

const node = (script, ...rest) => {
  const r = spawnSync(process.execPath, [join(ROOT, script), ...rest], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`${script} ${rest.slice(0, 3).join(' ')}: ${(r.stderr || r.stdout).trim().split('\n').slice(-4).join(' / ')}`);
  return r.stdout;
};
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });
const lastJson = (text) => JSON.parse(text.slice(text.lastIndexOf('\n{') + 1));

/** 台帳の書き込みを develop へ出す。専用の worktree なので、書いた置き場だけを明示して commit する */
function pushRegistry(message) {
  const paths = ['content/registry', 'content/sns/video-packs', datasetPath('state.ai-image-review-ledger')];
  if (!git('status', '--porcelain', '--', ...paths).trim()) return;
  git('add', '-u', '--', ...paths);
  git('commit', '-m', message, '--', ...paths);
  git('pull', '--rebase', 'origin', 'develop');
  git('push', 'origin', 'HEAD:develop');
}

/** youtube-single-publish の publish を 1 本流して完了を待つ（同時実行のグループは待機を 1 本しか持たない） */
function runPublishWorkflow(pub, digest) {
  execFileSync('gh', ['workflow', 'run', 'youtube-single-publish.yml', '--ref', 'develop', '-f', 'mode=publish', '-f', `publication=${pub}`, '-f', `expect=${digest}`], { cwd: ROOT, stdio: 'inherit' });
  spawnSync('sleep', ['8']);
  const run = execFileSync('gh', ['run', 'list', '--workflow', 'youtube-single-publish.yml', '--limit', '1', '--json', 'databaseId', '--jq', '.[0].databaseId'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const watched = spawnSync('gh', ['run', 'watch', run, '--exit-status', '--interval', '15'], { cwd: ROOT, stdio: 'ignore' });
  git('pull', '--rebase', 'origin', 'develop');
  if (watched.status !== 0) throw new Error(`${pub}: 投稿のワークフローが失敗（run ${run}）`);
}

/** 在庫のショート 1 本を、準備 → 方針の承認 → 完成の検査 → R2 → 非公開の投稿まで進める */
function releaseShort(item, policy) {
  const reg = loadRegistry(ROOT);
  let row = reg.publications.find((p) => p.id === item.pub);
  if (!row) {
    node('scripts/registry.mjs', 'import-video-pack', '--pack-dir', `content/sns/video-packs/${item.pack}`, '--only-new', '--commit');
    row = loadRegistry(ROOT).publications.find((p) => p.id === item.pub);
    if (!row) throw new Error(`${item.pub}: 公開行を作れなかった`);
  }
  if (row.status === 'draft' || (row.status === 'qa_passed' && !row.publishAt)) {
    const future = reg.publications.filter((p) => p.channel === 'youtube' && p.publishAt && p.status !== 'stopped' && p.id !== row.id && Date.parse(p.publishAt) > Date.now());
    const publishAt = nextSlot(future.filter((p) => p.format === 'short').map((p) => p.publishAt), policy.shorts, Date.now(), {
      notBefore: item.notBefore, leadHours: policy.minLeadHours, allTaken: future.map((p) => p.publishAt), dayTotal: policy.maxPublishPerDay,
    });
    node('scripts/registry.mjs', 'prepare-short', '--pub', row.id, '--publish-at', publishAt, '--commit');
  }
  row = loadRegistry(ROOT).publications.find((p) => p.id === item.pub);
  if (row.status === 'qa_passed') node('scripts/registry.mjs', 'auto-approve-short', '--pub', row.id);
  row = loadRegistry(ROOT).publications.find((p) => p.id === item.pub);
  if (row.status === 'approved') node('scripts/registry.mjs', 'mark-rendered', '--pub', row.id, '--commit');
  node('scripts/shorts-factory.mjs', 'restore', '--pack', item.pack, '--key', item.key);
  node('scripts/registry.mjs', 'stage-youtube', '--pub', item.pub, '--commit');
  const { digest, blockers } = lastJson(node('scripts/registry.mjs', 'publish-youtube', '--pub', item.pub, '--phase', 'upload'));
  if (blockers.length) throw new Error(`${item.pub}: ${blockers.join(', ')}`);
  pushRegistry(`content(video): ショート ${item.pub} を方針で承認し、非公開で投稿する`);
  runPublishWorkflow(item.pub, digest);
}

/** 関連動画を記録したショートを予約する（投稿済みなので割当を使わない） */
function scheduleShort(pub) {
  const { digest, blockers } = lastJson(node('scripts/registry.mjs', 'publish-youtube', '--pub', pub, '--phase', 'upload'));
  if (blockers.length) throw new Error(`${pub}: ${blockers.join(', ')}`);
  pushRegistry(`content(video): ショート ${pub} の関連動画を記録する`);
  runPublishWorkflow(pub, digest);
}

function run() {
  if (git('status', '--porcelain', '--untracked-files=no').trim()) throw new Error('作業ツリーに未コミットの変更がある。専用の worktree で回す');
  git('pull', '--rebase', 'origin', 'develop');
  const policy = readPolicy(ROOT);
  const q = queue();
  const done = [], failed = [];
  const attempt = (kind, id, fn) => { try { fn(); done.push(`${kind} ${id}`); } catch (e) { failed.push({ kind, id, error: e.message.slice(0, 800) }); } };
  for (const pub of q.toSchedule) attempt('schedule-short', pub, () => scheduleShort(pub));
  if (q.longforms.length) {
    const packs = q.longforms.map((l) => l.pack).join(',');
    attempt('longform', packs, () => {
      const rows = JSON.parse(node('scripts/video-factory.mjs', 'schedule', '--packs', packs));
      for (const r of rows.filter((x) => !x.ok)) failed.push({ kind: 'longform-gate', id: r.pack, error: r.failed });
      const ok = rows.filter((x) => x.ok).map((x) => x.pack);
      if (ok.length) node('scripts/video-factory.mjs', 'publish', '--packs', ok.join(','));
    });
  }
  // 通常動画の予約で親が増えたので、ショートの候補を数え直す
  // 通常動画は済んだので、割当の残りを全部ショートに回す
  for (const item of queue({ longformPerDay: 0 }).shorts) attempt('short', item.pub, () => releaseShort(item, policy));
  const after = queue();
  console.log(JSON.stringify({ done, failed, needRelated: after.needRelated, expired: after.expired, remaining: after.remaining }, null, 2));
  if (failed.length) process.exit(1);
}

const commands = { queue: () => console.log(JSON.stringify(queue(), null, 2)), run };
if (!commands[command]) { console.error('Usage: npm run youtube-daily -- queue|run'); process.exit(2); }
await commands[command]();
