#!/usr/bin/env node
/**
 * book-coverage-commit.mjs — 書籍の網羅の展開で、記事 1 本をコミットして develop へ push する（DN-0621）。
 * 展開の workflow（.claude/workflows/book-coverage-expand.js・book-coverage-photos.js）の commit 担当が回す。
 *
 *   node scripts/book-coverage-commit.mjs <資格>/<slug> --ids <書籍 id,…> [--adds <件数>] [--dn DN-####]
 *   node scripts/book-coverage-commit.mjs <資格>/<slug> --subject "<件名>" [--with-ai-ledgers]   # 写真の段（trailer を付けない）
 *
 * やること（2026-10-08〜09 の展開で記事 300 本超を回して要った手当て）:
 *   1. 排他: 並行する commit 担当とぶつからないよう、OS の一時ディレクトリの lock を mkdir で取る（最大 10 分待つ）
 *   2. 図のサイズ上限（check-image-assets --ci）を先に見る。pre-commit では止まらず CI の image-assets で落ちるため。
 *      書きかけのほかの記事の違反では止めず、この記事の違反だけで止める
 *   3. その記事のディレクトリ（と写真の台帳）だけを pathspec でコミットする。展開のコミットには trailer `Book-Coverage: <書籍 id>` を
 *      書く（audit-reference-book-coverage の要約が、この trailer のあるコミットだけを展開として数える）
 *   4. origin/develop を取り込み、静的インデックス（refresh-indexes の生成物）を一時の作業ツリーで作り直してコミットする。
 *      作業中のツリーで回すと、ほかの記事の書きかけまで生成物に入り、CI の generated-indexes が落ちる（2026-10-08）
 *   5. develop へ push する
 *
 * exit 0 = コミットした（または変更なし） / 1 = pre-commit などで失敗（出力を読んで直す） / 2 = 引数の不備
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { datasetPath } from './lib/datasets.mjs';
import { REPO_ROOT } from './lib/repository-paths.mjs';

const NAME = 'book-coverage-commit';
const argv = process.argv.slice(2);
const val = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] ?? null : null; };
const article = argv[0] && !argv[0].startsWith('--') ? argv[0] : null;
const ids = val('--ids');
const adds = val('--adds');
const dn = val('--dn');
const subject = val('--subject');
const extra = argv.includes('--with-ai-ledgers') ? [datasetPath('config.figure-sources'), datasetPath('state.ai-image-review-ledger')] : [];
const usage = () => {
  console.error(`usage: node scripts/${NAME}.mjs <資格>/<slug> --ids <書籍 id,…> [--adds N] [--dn DN-####]`);
  console.error(`       node scripts/${NAME}.mjs <資格>/<slug> --subject "<件名>" [--with-ai-ledgers]`);
  process.exit(2);
};
if (!article || !/^[a-z0-9-]+\/[a-z0-9-]+$/.test(article) || (!ids && !subject)) usage();

const dir = `content/site/${article}`;
if (!existsSync(join(REPO_ROOT, dir))) { console.error(`[${NAME}] 記事のディレクトリが無い: ${dir}`); process.exit(2); }
const paths = [dir, ...extra];

const gitIn = (dir, args) => execFileSync('git', ['-c', 'core.quotepath=false', '-C', dir, ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
const git = (args) => gitIn(REPO_ROOT, args);
const tryGit = (args) => { try { return { ok: true, out: git(args) }; } catch (e) { return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` }; } };
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// 1. 排他
const lock = join(tmpdir(), 'doboku-book-coverage-commit.lock');
let locked = false;
for (let i = 0; i < 300 && !locked; i += 1) {
  try { mkdirSync(lock); locked = true; } catch { sleep(2000); }
}
if (!locked) { console.error(`[${NAME}] 排他を取れなかった（${lock}）`); process.exit(1); }
const release = () => { try { rmdirSync(lock); } catch { /* 既に無い */ } };
process.on('exit', release);

function main() {
  if (!git(['status', '--porcelain', '--', ...paths]).trim()) { console.log(`[${NAME}] 変更なし: ${dir}`); return 0; }

  // 2. 図のサイズ上限
  const img = spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/check-image-assets.mjs'), '--ci'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const imgBad = `${img.stdout}${img.stderr}`.split('\n').filter((l) => l.includes(`${dir}/`) && /size-new|size-grown|danger|危険/.test(l));
  if (imgBad.length) {
    console.error(imgBad.join('\n'));
    console.error('→ 図を軽くする（同じ値の属性を親の <g> にまとめる・既定値の属性を省く。見た目を変えない）');
    return 1;
  }

  // 3. コミット
  const msgFile = join(mkdtempSync(join(tmpdir(), `${NAME}-`)), 'msg.txt');
  const lines = subject
    ? [`content(${article}): ${subject}`, '']
    : [`content(${article}): 書籍の網羅から追記する${adds ? `（${adds} 件）` : ''}${dn ? `・${dn}` : ''}`, '', `Book-Coverage: ${ids}`];
  writeFileSync(msgFile, [...lines, 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>', ''].join('\n'));
  try {
    const added = tryGit(['add', '--', ...paths]);
    if (!added.ok) { console.error(added.out); return 1; }
    let committed = false;
    for (let t = 0; t < 3 && !committed; t += 1) {
      const r = tryGit(['commit', '-q', '-F', msgFile, '--', ...paths]);
      if (r.ok) { committed = true; break; }
      if (r.out.includes('index.lock')) { sleep(5000); continue; }
      console.error(r.out.split('\n').slice(-40).join('\n'));
      tryGit(['reset', '-q', '--', ...paths]);
      return 1;
    }
    if (!committed) { console.error(`[${NAME}] index.lock が空かず、コミットできなかった`); tryGit(['reset', '-q', '--', ...paths]); return 1; }
  } finally {
    rmSync(join(msgFile, '..'), { recursive: true, force: true });
  }

  // 4. develop の取り込みと静的インデックスの作り直し
  const merged = tryGit(['fetch', '-q', 'origin', 'develop']).ok && tryGit(['merge', '-q', '--no-edit', 'origin/develop']).ok;
  if (!merged) { console.error(`[${NAME}] origin/develop の取り込みに失敗（コミットは手元にある）`); console.log(git(['log', '--oneline', '-1'])); return 1; }
  refreshIndexes();

  // 5. push
  const pushed = tryGit(['push', '-q', 'origin', 'HEAD:develop']);
  if (!pushed.ok) { console.error(pushed.out.split('\n').filter((l) => !l.startsWith('remote:')).join('\n')); return 1; }
  console.log(git(['log', '--oneline', '-1']).trim());
  return 0;
}

/** 書きかけの記事を含まない HEAD で refresh-indexes を回し、生成物が変われば別のコミットにして取り込む。 */
function refreshIndexes() {
  const tmp = join(REPO_ROOT, '.claude', 'worktrees', 'refresh-indexes-tmp');
  if (!existsSync(tmp)) {
    const made = tryGit(['worktree', 'add', '-q', '--detach', tmp, 'HEAD']);
    if (!made.ok) { console.error(`[${NAME}] 警告: 一時の作業ツリーを作れなかった（生成物は作り直していない）\n${made.out}`); return; }
    try { symlinkSync(join(REPO_ROOT, 'node_modules'), join(tmp, 'node_modules'), 'junction'); } catch { /* 既にある */ }
  }
  const head = git(['rev-parse', 'HEAD']).trim();
  gitIn(tmp, ['checkout', '-q', '--detach', head]);
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const r = spawnSync(npm, ['run', '-s', 'refresh-indexes'], { cwd: tmp, encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.status !== 0) { console.error(`[${NAME}] 警告: refresh-indexes が失敗した（生成物は作り直していない）`); return; }
  if (!gitIn(tmp, ['status', '--porcelain']).trim()) return;
  gitIn(tmp, ['add', '-A']);
  gitIn(tmp, ['commit', '-q', '-m', 'chore(indexes): 展開した記事に合わせて静的インデックスを作り直す（refresh-indexes）\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>']);
  const generated = gitIn(tmp, ['diff', '--name-only', 'HEAD~1', 'HEAD']).split('\n').filter(Boolean);
  // 作業中のツリーの同じ生成物に pre-commit が作った手元の変更があると ff できないので、生成物だけコミットの版に戻す
  if (generated.length) tryGit(['checkout', '-q', '--', ...generated]);
  const ff = tryGit(['merge', '-q', '--ff-only', gitIn(tmp, ['rev-parse', 'HEAD']).trim()]);
  if (!ff.ok) console.error(`[${NAME}] 警告: 作り直した生成物を取り込めなかった\n${ff.out}`);
}

process.exitCode = main();
