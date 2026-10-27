// tests/branch-hygiene.test.mjs
//
// DN-0638: 中身が develop に入り済みのブランチ（squash マージ含む）・止まった未マージのブランチ・
// 未コミットのまま止まった worktree を、一時 git リポジトリで検出する。squash でマージ済みを「未マージ」と誤って挙げない。
// 前提: 一時リポジトリは base を `develop`（origin が無いときの代替）にして、リモート側は bare を origin に置いて確かめる。

import './lib/isolate-git-env.mjs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyze } from '../scripts/lib/branch-hygiene.mjs';
import { run } from '../scripts/check-branch-hygiene.mjs';

const NOW = Date.parse('2026-10-12T00:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 86_400_000).toISOString();

let root;
const sh = (cwd, args, date) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.com', '-c', 'commit.gpgsign=false', '-C', cwd, ...args], {
  encoding: 'utf8',
  env: { ...process.env, ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {}) },
});
const write = (repo, file, text) => { mkdirSync(join(repo, file, '..'), { recursive: true }); writeFileSync(join(repo, file), text); };
const commit = (repo, file, text, msg, date) => { write(repo, file, text); sh(repo, ['add', file]); sh(repo, ['commit', '-q', '-m', msg], date); };

let repo;
let origin;

before(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'branch-hygiene-')));
  repo = join(root, 'repo');
  origin = join(root, 'origin.git');
  mkdirSync(repo);
  sh(repo, ['init', '-q', '-b', 'develop']);
  commit(repo, 'base.txt', 'base\n', 'base', daysAgo(90));

  // 1. 通常のマージ（祖先）
  sh(repo, ['checkout', '-q', '-b', 'merged-ff']);
  commit(repo, 'ff.txt', 'ff\n', 'ff', daysAgo(50));
  sh(repo, ['checkout', '-q', 'develop']);
  sh(repo, ['merge', '-q', '--no-ff', 'merged-ff', '-m', 'merge ff'], daysAgo(49));

  // 2. squash マージ（祖先ではない。tree は一致）。古い日付でも「未マージ」に挙げない
  sh(repo, ['checkout', '-q', '-b', 'squashed']);
  commit(repo, 'sq1.txt', 'one\n', 'sq1', daysAgo(40));
  commit(repo, 'sq2.txt', 'two\n', 'sq2', daysAgo(39));
  sh(repo, ['checkout', '-q', 'develop']);
  sh(repo, ['merge', '--squash', 'squashed']);
  sh(repo, ['commit', '-q', '-m', 'squash (#1)'], daysAgo(38));

  // 3. squash マージのあと develop 側が同じ行を直した（tree 一致にならない）。PR の記録だけが頼り
  sh(repo, ['checkout', '-q', '-b', 'squashed-then-edited']);
  commit(repo, 'edit.txt', 'v1\n', 'edit v1', daysAgo(37));
  sh(repo, ['checkout', '-q', 'develop']);
  sh(repo, ['merge', '--squash', 'squashed-then-edited']);
  sh(repo, ['commit', '-q', '-m', 'squash edited (#2)'], daysAgo(36));
  commit(repo, 'edit.txt', 'v2\n', 'develop edits the same line', daysAgo(35));

  // 4. 未マージで古い / 5. 未マージで新しい
  sh(repo, ['checkout', '-q', '-b', 'stale-unmerged', 'develop']);
  commit(repo, 'stale.txt', 'stale\n', 'stale', daysAgo(60));
  sh(repo, ['checkout', '-q', '-b', 'fresh-unmerged', 'develop']);
  commit(repo, 'fresh.txt', 'fresh\n', 'fresh', daysAgo(2));
  sh(repo, ['checkout', '-q', 'develop']);

  // リモート: develop と、リモートだけに残る squash 済みブランチ・古い未マージ
  sh(root, ['init', '-q', '--bare', origin]);
  sh(repo, ['remote', 'add', 'origin', origin]);
  sh(repo, ['push', '-q', 'origin', 'develop', 'squashed:remote-squashed', 'stale-unmerged:remote-stale']);
  sh(repo, ['fetch', '-q', 'origin']);

  // worktree: 古い未コミット / 新しい未コミット / 古いがきれい
  const wtOld = join(root, 'wt-old');
  sh(repo, ['worktree', 'add', '-q', '-b', 'wt-old-branch', wtOld, 'stale-unmerged']);
  write(wtOld, 'stale.txt', 'edited and abandoned\n');
  const oldTime = new Date(NOW - 30 * 86_400_000);
  utimesSync(join(wtOld, 'stale.txt'), oldTime, oldTime);
  const wtNew = join(root, 'wt-new');
  sh(repo, ['worktree', 'add', '-q', '-b', 'wt-new-branch', wtNew, 'stale-unmerged']);
  write(wtNew, 'stale.txt', 'edited just now\n');
  utimesSync(join(wtNew, 'stale.txt'), new Date(NOW - 3_600_000), new Date(NOW - 3_600_000));
  const wtClean = join(root, 'wt-clean');
  sh(repo, ['worktree', 'add', '-q', '-b', 'wt-clean-branch', wtClean, 'stale-unmerged']);
});

after(() => rmSync(root, { recursive: true, force: true }));

const names = (rows) => rows.map((r) => r.name).sort();

test('通常のマージと squash マージを「入り済み」に挙げ、squash を未マージ（stale）に誤って挙げない', () => {
  const r = analyze(repo, { base: 'develop', days: 14, now: NOW });
  const merged = Object.fromEntries(r.merged.map((b) => [b.name, b.via]));
  assert.equal(merged['merged-ff'], 'ancestor');
  assert.equal(merged.squashed, 'tree');
  assert.ok(!names(r.stale).includes('squashed'), 'squash でマージ済みのブランチを未マージとして挙げた');
  assert.ok(!names(r.stale).includes('merged-ff'));
});

test('リモートのブランチも同じ判定で入り済みに挙がる（origin/develop が base）', () => {
  const r = analyze(repo, { days: 14, now: NOW });
  assert.equal(r.base, 'origin/develop');
  assert.ok(r.merged.some((b) => b.name === 'origin/remote-squashed' && b.kind === 'remote' && b.via === 'tree'));
  assert.ok(r.stale.some((b) => b.name === 'origin/remote-stale' && b.kind === 'remote'));
});

test('squash のあと base が同じ行を直した場合は、マージ済み PR の最終コミットの記録で入り済みと判定する', () => {
  const tip = sh(repo, ['rev-parse', 'squashed-then-edited']).trim();
  const without = analyze(repo, { base: 'develop', days: 14, now: NOW });
  assert.ok(names(without.stale).includes('squashed-then-edited'), '記録が無ければ tree では判定できない（この見本の前提）');
  const withPr = analyze(repo, { base: 'develop', days: 14, now: NOW, mergedPrTips: new Set([tip]) });
  assert.equal(withPr.merged.find((b) => b.name === 'squashed-then-edited')?.via, 'pr');
  assert.ok(!names(withPr.stale).includes('squashed-then-edited'));
});

test('未マージで N 日以上動いていないブランチだけを stale に挙げる（新しいものは挙げない）', () => {
  const r = analyze(repo, { base: 'develop', days: 14, now: NOW });
  assert.ok(names(r.stale).includes('stale-unmerged'));
  assert.ok(!names(r.stale).includes('fresh-unmerged'));
  assert.equal(r.stale.find((b) => b.name === 'stale-unmerged').ageDays, 60);
  const loose = analyze(repo, { base: 'develop', days: 90, now: NOW });
  assert.ok(!names(loose.stale).includes('stale-unmerged'), '閾値 90 日なら 60 日前のブランチは挙げない');
});

test('未コミットの変更のまま N 日以上動いていない worktree だけを挙げる', () => {
  const r = analyze(repo, { base: 'develop', days: 14, now: NOW });
  assert.deepEqual(r.idleWorktrees.map((w) => w.branch), ['wt-old-branch']);
  assert.equal(r.idleWorktrees[0].dirtyFiles, 1);
  assert.equal(r.counts.worktrees, 3);
  assert.equal(r.counts.worktreesChecked, 3);
});

test('base が無ければ検査不成立（exit 2）で、緑にしない', async () => {
  const bare = join(root, 'no-base');
  mkdirSync(bare);
  sh(bare, ['init', '-q', '-b', 'trunk']);
  commit(bare, 'a.txt', 'a\n', 'a');
  assert.ok(analyze(bare, { now: NOW }).inconclusive);
  const res = await run({ argv: ['--no-gh'], quiet: true, repo: bare });
  assert.equal(res.code, 2);
  assert.match(res.stderr, /検査不成立/);
});

test('CLI は検査件数を出し、見つかっても exit 0（報告だけで何も削除しない）', async () => {
  const res = await run({ argv: ['--no-gh', '--base', 'develop'], quiet: true, repo });
  assert.equal(res.code, 0);
  assert.match(res.stdout, /ローカル \d+ 本・リモート \d+ 本・worktree 3 本/);
  assert.match(res.stdout, /1\. 中身が develop に入り済みのブランチ/);
  assert.match(res.stdout, /2\. 未マージで 14 日以上/);
  assert.match(res.stdout, /3\. 未コミットの変更のまま 14 日以上動いていない worktree: \d+ 本/);
  assert.match(sh(repo, ['branch', '--list', 'squashed']), /squashed/, 'ブランチが消えている');
});
