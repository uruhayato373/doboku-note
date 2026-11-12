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
import { cpSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { loadRegistry } from './lib/content-registry.mjs';
import { readDataset } from './lib/dataset-io.mjs';
import { REPO_ROOT as ROOT } from './lib/repository-paths.mjs';
import { shortsStatus } from './lib/shorts-factory.mjs';
import { nextSlot, readPolicy, uploadsLeft } from './lib/video-publish-gate.mjs';
import { releaseQueue } from './lib/youtube-daily-release.mjs';
import { datasetPath } from './lib/datasets.mjs';
import { todayJst } from './lib/jst-date.mjs';

const command = process.argv[2] ?? 'queue';
// R2 への配置（registry stage-youtube・stage-youtube-renders-r2）は環境変数の資格情報を読む。子の工程へ引き継ぐため最初に読み込む
if (existsSync(join(ROOT, '.env.local'))) process.loadEnvFile(join(ROOT, '.env.local'));

function queue({ longformPerDay } = {}) {
  const policy = readPolicy(ROOT);
  const reg = loadRegistry(ROOT);
  const stocked = shortsStatus(ROOT).filter((s) => s.stage === 'stocked');
  return releaseQueue({
    publications: reg.publications, stocked, plan: readDataset(ROOT, 'config.channel-annual-plan'),
    uploadsLeft: uploadsLeft(reg.publications, policy), today: todayJst(), longformPerDay: longformPerDay ?? (policy.uploadPriority === 'longform' ? Infinity : policy.slot.maxPerDay),
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

/**
 * 関門の「完成動画の照合」（media verify-render）は描画の作業場 .tmp/video-render/<作品> を読む。描画した checkout（メインの作業ツリー）にしか無く、
 * Drive の在庫にも入らないので、専用の worktree に無ければメインの作業ツリーから複製する（2026-11-12・初回の実行が 4 本とも関門で落ちた）
 */
function ensureRenderWorkspace(work) {
  const here = join(ROOT, '.tmp/video-render', work);
  if (existsSync(join(here, 'render-manifest.json'))) return;
  const main = dirname(resolve(ROOT, git('rev-parse', '--git-common-dir').trim()));
  const source = join(main, '.tmp/video-render', work);
  if (main === ROOT || !existsSync(join(source, 'render-manifest.json'))) throw new Error(`${work}: 描画の作業場（.tmp/video-render）が無い`);
  cpSync(source, here, { recursive: true });
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
  const replaced = queue().toReplace;
  if (replaced.length) {
    for (const pack of replaced) node('scripts/video-factory.mjs', 'unapprove', '--pack', pack);
    pushRegistry(`content(video): 前倒しの前に承認した通常動画 ${replaced.length} 本の承認を外し、空き枠から日時を付け直す`);
  }
  const q = queue();
  const done = [], failed = [];
  const attempt = (kind, id, fn) => { try { fn(); done.push(`${kind} ${id}`); } catch (e) { failed.push({ kind, id, error: e.message.slice(0, 800) }); } };
  for (const pub of q.toSchedule) attempt('schedule-short', pub, () => scheduleShort(pub));
  if (q.longforms.length) {
    const packs = q.longforms.map((l) => l.pack).join(',');
    attempt('longform', packs, () => {
      for (const l of q.longforms) ensureRenderWorkspace(l.pack.split('/')[1]);
      const rows = JSON.parse(node('scripts/video-factory.mjs', 'schedule', '--packs', packs));
      for (const r of rows.filter((x) => !x.ok)) failed.push({ kind: 'longform-gate', id: r.pack, error: r.failed });
      const ok = rows.filter((x) => x.ok).map((x) => x.pack);
      // wire が書いた文面（youtube.json）を先に出す。publish は台帳だけを commit して pull するので、残ると止まる
      pushRegistry('content(video): 前倒しの予約で通常動画の公開日時を決め、方針で承認する');
      // 投稿の digest は手元の動画（.tmp/media）を読む。専用の worktree には無いので Drive から戻す
      for (const pack of ok) node('scripts/media.mjs', 'pull', '--work', pack, '--commit');
      if (ok.length) node('scripts/video-factory.mjs', 'publish', '--packs', ok.join(','));
    });
  }
  // 通常動画の予約で親が増えたので、ショートの候補を数え直す
  // 投稿の時刻（times.uploaded）は CI が develop に書く。取り込んでから割当の残りを数える（数え漏れでショートを割当の外へ流しかけた・2026-11-12）
  git('pull', '--rebase', 'origin', 'develop');
  // 通常動画は済んだので、割当の残りを全部ショートに回す
  for (const item of queue({ longformPerDay: 0 }).shorts) attempt('short', item.pub, () => releaseShort(item, policy));
  const after = queue();
  console.log(JSON.stringify({ done, failed, needRelated: after.needRelated, expired: after.expired, remaining: after.remaining }, null, 2));
  if (failed.length) process.exit(1);
}

const commands = { queue: () => console.log(JSON.stringify(queue(), null, 2)), run };
if (!commands[command]) { console.error('Usage: npm run youtube-daily -- queue|run'); process.exit(2); }
await commands[command]();
