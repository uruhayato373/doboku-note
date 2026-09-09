import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync, existsSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { join } from 'node:path';

import {
  automationFreshness,
  bytesHuman,
  classifyWorktree,
  claudeProjectKey,
  evaluateClaudeSettings,
  evaluateFreeSpace,
  hasGitEntry,
  itemsForPlatform,
  parseCleanupPeriodDays,
  parseWorktreeList,
  planArtifactRemoval,
  referencedNpxIds,
  selectStaleDirs,
  summarize,
  worktreePlacement,
} from '../scripts/lib/disk-hygiene.mjs';
import { pruneTmp } from '../scripts/prune-tmp.mjs';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 10, 0, 0, 0);

// ─── parseWorktreeList ─────────────────────────────────────────────────────
// 実機の `git worktree list --porcelain` 相当（main / ブランチ付き / detached / locked / prunable）
const PORCELAIN = [
  'worktree /repo',
  'HEAD aaaa1111',
  'branch refs/heads/develop',
  '',
  'worktree /repo/.claude/worktrees/feat',
  'HEAD bbbb2222',
  'branch refs/heads/feat/x',
  '',
  'worktree /repo/.tmp/detached',
  'HEAD cccc3333',
  'detached',
  '',
  'worktree /home/.codex/worktrees/locked',
  'HEAD dddd4444',
  'branch refs/heads/codex/y',
  'locked 長期保持',
  '',
  'worktree /repo/gone',
  'HEAD eeee5555',
  'branch refs/heads/gone',
  'prunable gitdir file points to non-existent location',
  '',
].join('\n');

test('parseWorktreeList: 先頭が main・各フィールドを取り出す', () => {
  const list = parseWorktreeList(PORCELAIN);
  assert.equal(list.length, 5);
  assert.equal(list[0].path, '/repo');
  assert.equal(list[0].branch, 'refs/heads/develop');
  assert.equal(list[1].path, '/repo/.claude/worktrees/feat');
  assert.equal(list[2].detached, true);
  assert.equal(list[2].branch, null);
  assert.equal(list[3].locked, '長期保持');
  assert.equal(list[4].prunable, 'gitdir file points to non-existent location');
});

test('parseWorktreeList: 空入力でも落ちない', () => {
  assert.deepEqual(parseWorktreeList(''), []);
  assert.deepEqual(parseWorktreeList(null), []);
});

// ─── classifyWorktree ──────────────────────────────────────────────────────
const base = {
  isMain: false,
  merged: true,
  dirtyPaths: [],
  locked: false,
  prunable: false,
  recentlyActive: false,
  inUse: false,
};

test('classifyWorktree: 5 つのガードを全部満たしたときだけ remove', () => {
  assert.equal(classifyWorktree({ path: '/w' }, base).decision, 'remove');
});

test('classifyWorktree: 迷ったら残す（判定不能・使用中・稼働中）', () => {
  assert.equal(classifyWorktree({ path: '/w' }, { ...base, inUse: 'unknown' }).decision, 'keep-unknown');
  assert.equal(classifyWorktree({ path: '/w' }, { ...base, inUse: true }).decision, 'keep-in-use');
  assert.equal(classifyWorktree({ path: '/w' }, { ...base, recentlyActive: true }).decision, 'keep-active');
});

test('classifyWorktree: 未マージ・未コミット・lock・main・prunable', () => {
  assert.equal(classifyWorktree({ path: '/w' }, { ...base, merged: false }).decision, 'keep-unmerged');
  const dirty = classifyWorktree({ path: '/w' }, { ...base, dirtyPaths: ['?? a.txt', '?? b.txt'] });
  assert.equal(dirty.decision, 'keep-dirty');
  assert.match(dirty.reason, /a\.txt/);
  assert.equal(classifyWorktree({ path: '/w' }, { ...base, locked: '理由' }).decision, 'keep-locked');
  assert.equal(classifyWorktree({ path: '/w' }, { ...base, isMain: true }).decision, 'keep-main');
  assert.equal(classifyWorktree({ path: '/w' }, { ...base, prunable: 'gone' }).decision, 'prunable');
});

test('classifyWorktree: main は他の条件より優先（main を消す事故を作らない）', () => {
  const v = classifyWorktree({ path: '/repo' }, { ...base, isMain: true, merged: true, inUse: false });
  assert.equal(v.decision, 'keep-main');
});

// ─── worktreePlacement ─────────────────────────────────────────────────────
const placeOpts = { repoRoot: '/repo', home: '/home/me', allowedRoots: ['.claude/worktrees', '~/.codex/worktrees'] };

test('worktreePlacement: 許可された 2 つの置き場だけ ok', () => {
  assert.equal(worktreePlacement('/repo/.claude/worktrees/x', placeOpts).ok, true);
  assert.equal(worktreePlacement('/home/me/.codex/worktrees/x', placeOpts).ok, true);
  assert.equal(worktreePlacement('/repo', placeOpts).ok, true); // main
});

test('worktreePlacement: .tmp 配下は理由付きで違反（prune が中身を消す置き場）', () => {
  const v = worktreePlacement('/repo/.tmp/character-framing', placeOpts);
  assert.equal(v.ok, false);
  assert.match(v.reason, /\.tmp/);
  assert.equal(worktreePlacement('/tmp/x', placeOpts).ok, false);
});

// ─── hasGitEntry ───────────────────────────────────────────────────────────
test('hasGitEntry: .git はファイルでもディレクトリでも名前で拾う', () => {
  assert.equal(hasGitEntry(['.git', 'src']), true);
  assert.equal(hasGitEntry(['.gitkeep', '.gitignore']), false);
  assert.equal(hasGitEntry([]), false);
});

// ─── planArtifactRemoval ───────────────────────────────────────────────────
test('planArtifactRemoval: 古い・停止中のときだけ削除', () => {
  const common = { kind: '.next', path: '/repo/.next', now: NOW, maxAgeDays: 7 };
  assert.equal(planArtifactRemoval({ ...common, newestMtimeMs: NOW - 10 * DAY }).action, 'delete');
  assert.equal(planArtifactRemoval({ ...common, newestMtimeMs: NOW - 3 * DAY }).action, 'keep');
  assert.equal(
    planArtifactRemoval({ ...common, newestMtimeMs: NOW - 10 * DAY, buildOrServeRunning: true }).action,
    'keep',
  );
  assert.equal(planArtifactRemoval({ ...common, newestMtimeMs: null }).action, 'keep');
});

// ─── selectStaleDirs ───────────────────────────────────────────────────────
test('selectStaleDirs: 境界は「以上」で削除・使用中と時刻不明は残す', () => {
  const entries = [
    { path: '/a', newestMtimeMs: NOW - 14 * DAY }, // ちょうど 14 日 → 削除
    { path: '/b', newestMtimeMs: NOW - 13 * DAY },
    { path: '/c', newestMtimeMs: NOW - 30 * DAY }, // 使用中
    { path: '/d', newestMtimeMs: null },
  ];
  const r = selectStaleDirs(entries, { now: NOW, maxAgeDays: 14, inUse: new Set(['/c']) });
  assert.deepEqual(r.remove.map((e) => e.path), ['/a']);
  assert.deepEqual(r.keep.map((e) => e.path).sort(), ['/b', '/c', '/d']);
  assert.equal(r.keep.find((e) => e.path === '/c').reason, '使用中');
});

// ─── referencedNpxIds ──────────────────────────────────────────────────────
test('referencedNpxIds: 稼働中プロセスが参照する _npx の id を拾う', () => {
  const ids = referencedNpxIds(
    [
      'node /Users/x/.npm/_npx/9833c18b2d85bc59/node_modules/.bin/playwright-mcp',
      'npm exec chrome-devtools-mcp@latest',
    ],
    '/Users/x/.npm/_npx',
  );
  assert.deepEqual([...ids], ['9833c18b2d85bc59']);
});

// ─── しきい値まわり ────────────────────────────────────────────────────────
test('evaluateFreeSpace: 三値＋測れなかったときの unknown', () => {
  const t = { warnBytes: 30, failBytes: 15 };
  assert.equal(evaluateFreeSpace({ freeBytes: 40, ...t }), 'ok');
  assert.equal(evaluateFreeSpace({ freeBytes: 20, ...t }), 'warn');
  assert.equal(evaluateFreeSpace({ freeBytes: 10, ...t }), 'fail');
  assert.equal(evaluateFreeSpace({ freeBytes: null, ...t }), 'unknown');
});

test('parseCleanupPeriodDays / evaluateClaudeSettings: 未設定は違反（既定 30 日で溜まる）', () => {
  assert.equal(parseCleanupPeriodDays('{"cleanupPeriodDays": 7}'), 7);
  assert.equal(parseCleanupPeriodDays('{}'), null);
  assert.equal(parseCleanupPeriodDays('{壊れた'), null);
  assert.equal(evaluateClaudeSettings({ days: null, maxDays: 7 }).ok, false);
  assert.equal(evaluateClaudeSettings({ days: 30, maxDays: 7 }).ok, false);
  assert.equal(evaluateClaudeSettings({ days: 7, maxDays: 7 }).ok, true);
});

test('automationFreshness: 未導入・停止・正常', () => {
  assert.equal(automationFreshness({ stampMtimeMs: null, now: NOW }).status, 'missing');
  assert.equal(automationFreshness({ stampMtimeMs: NOW - 5 * DAY, now: NOW, maxAgeDays: 3 }).status, 'stale');
  assert.equal(automationFreshness({ stampMtimeMs: NOW - 1 * DAY, now: NOW, maxAgeDays: 3 }).status, 'ok');
});

test('claudeProjectKey / bytesHuman', () => {
  assert.equal(claudeProjectKey('/Users/x/doboku-note'), '-Users-x-doboku-note');
  assert.equal(bytesHuman(1024), '1.0 KB');
  assert.equal(bytesHuman(1536), '1.5 KB');
  assert.equal(bytesHuman(null), '-');
});

// ─── プラットフォームと集計（検査ゼロを PASS と呼ばない）──────────────────
test('itemsForPlatform: darwin 専用は他 OS で unsupported（落とさず未検査と言う）', () => {
  const items = [{ id: 'a' }, { id: 'b', platform: ['darwin'] }];
  const win = itemsForPlatform(items, 'win32');
  assert.equal(win[0].status, undefined);
  assert.equal(win[1].status, 'unsupported');
  assert.equal(itemsForPlatform(items, 'darwin')[1].status, undefined);
});

test('summarize: 未検査ありは exit 2＝検査不成立・quick は常に 0', () => {
  const withUnsupported = [{ status: 'ok' }, { status: 'unsupported' }];
  assert.equal(summarize(withUnsupported, { mode: 'full' }).exitCode, 2);
  assert.equal(summarize(withUnsupported, { mode: 'quick' }).exitCode, 0);
  assert.equal(summarize([], { mode: 'full' }).exitCode, 2);
  assert.equal(summarize([{ status: 'fail' }, { status: 'ok' }], { mode: 'full' }).exitCode, 1);
  const s = summarize([{ status: 'ok' }, { status: 'warn' }, { status: 'fail' }], { mode: 'full' });
  assert.equal(s.examined, 3);
  assert.equal(s.fail, 1);
  assert.equal(s.warn, 1);
});

// ─── pruneTmp（実ファイル）─────────────────────────────────────────────────
test('pruneTmp: 古いスクラッチは消すが、worktree（.git を持つ）は丸ごと守る', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'prune-tmp-test-')));
  const old = (NOW - 10 * DAY) / 1000;

  writeFileSync(join(root, 'old.png'), 'x');
  utimesSync(join(root, 'old.png'), old, old);
  writeFileSync(join(root, 'fresh.png'), 'x');
  writeFileSync(join(root, '.gitkeep'), '');
  utimesSync(join(root, '.gitkeep'), old, old);

  // Codex が .tmp に作った worktree を模す（linked worktree の .git は**ファイル**）
  const wt = join(root, 'character-framing');
  mkdirSync(join(wt, 'src'), { recursive: true });
  writeFileSync(join(wt, '.git'), 'gitdir: /repo/.git/worktrees/character-framing');
  writeFileSync(join(wt, 'src', 'a.ts'), 'x');
  utimesSync(join(wt, 'src', 'a.ts'), old, old);

  const res = pruneTmp({ root, days: 3, now: NOW });

  assert.equal(existsSync(join(root, 'old.png')), false, '古いスクラッチは消える');
  assert.equal(existsSync(join(root, 'fresh.png')), true);
  assert.equal(existsSync(join(root, '.gitkeep')), true, 'トップレベルの .gitkeep は保護');
  assert.equal(existsSync(join(wt, 'src', 'a.ts')), true, 'worktree の中は触らない');
  assert.equal(res.count, 1);
  assert.deepEqual(res.skippedWorktrees, [wt]);

  rmSync(root, { recursive: true, force: true });
});

// ─── 実 git での統合（worktree の分類と削除）───────────────────────────────
function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf-8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null' } });
}

test('統合: マージ済みだけが remove、未マージ・dirty・lock は残る（--force しない）', () => {
  // macOS の tmpdir は symlink（/var → /private/var）で、git は解決済みパスを返す。
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'disk-hygiene-git-')));
  const repo = join(root, 'repo');
  mkdirSync(repo);
  git(repo, 'init', '-b', 'develop', '-q');
  git(repo, 'config', 'user.email', 'test@example.com');
  git(repo, 'config', 'user.name', 'test');
  writeFileSync(join(repo, 'a.txt'), 'a');
  git(repo, 'add', 'a.txt');
  git(repo, 'commit', '-qm', 'init');

  const wtMerged = join(root, 'wt-merged');
  const wtOpen = join(root, 'wt-open');
  const wtDirty = join(root, 'wt-dirty');
  const wtLocked = join(root, 'wt-locked');
  git(repo, 'worktree', 'add', '-q', wtMerged, '-b', 'f1');
  writeFileSync(join(wtMerged, 'b.txt'), 'b');
  git(wtMerged, 'add', 'b.txt');
  git(wtMerged, 'commit', '-qm', 'f1');
  git(repo, 'merge', '-q', 'f1');

  git(repo, 'worktree', 'add', '-q', wtOpen, '-b', 'f2');
  writeFileSync(join(wtOpen, 'c.txt'), 'c');
  git(wtOpen, 'add', 'c.txt');
  git(wtOpen, 'commit', '-qm', 'f2');

  git(repo, 'worktree', 'add', '-q', wtDirty, '-b', 'f3');
  git(repo, 'merge', '-q', 'f3');
  writeFileSync(join(wtDirty, 'untracked.txt'), 'keep me');

  git(repo, 'worktree', 'add', '-q', wtLocked, '-b', 'f4');
  git(repo, 'merge', '-q', 'f4');
  git(repo, 'worktree', 'lock', wtLocked);

  // 判定に使う事実は本物の git から取る（純関数側の分類を実データで確かめる）
  const list = parseWorktreeList(git(repo, 'worktree', 'list', '--porcelain'));
  const merged = new Set(
    git(repo, 'branch', '--merged', 'develop', '--format=%(refname)').split('\n').filter(Boolean).map((s) => s.trim()),
  );
  const decisions = {};
  for (const [idx, wt] of list.entries()) {
    const dirty = git(wt.path, 'status', '--porcelain').split('\n').filter(Boolean);
    decisions[wt.path] = classifyWorktree(wt, {
      isMain: idx === 0,
      merged: merged.has(wt.branch),
      dirtyPaths: dirty,
      locked: wt.locked,
      prunable: wt.prunable,
      recentlyActive: false,
      inUse: false,
    }).decision;
  }

  assert.equal(decisions[repo], 'keep-main');
  assert.equal(decisions[wtMerged], 'remove');
  assert.equal(decisions[wtOpen], 'keep-unmerged');
  assert.equal(decisions[wtDirty], 'keep-dirty');
  assert.equal(decisions[wtLocked], 'keep-locked');

  // remove を実行しても、ブランチは残り、dirty の untracked は無事
  git(repo, 'worktree', 'remove', wtMerged);
  const after = parseWorktreeList(git(repo, 'worktree', 'list', '--porcelain')).map((w) => w.path);
  assert.equal(after.includes(wtMerged), false);
  assert.equal(after.includes(wtOpen), true);
  assert.match(git(repo, 'branch', '--list', 'f1'), /f1/, 'ブランチは消さない（履歴は残す）');
  assert.equal(existsSync(join(wtDirty, 'untracked.txt')), true);

  // --force なしの remove は dirty を拒否する（最後の砦が生きていること）
  assert.throws(() => git(repo, 'worktree', 'remove', wtDirty), /untracked|contains modified/i);

  git(repo, 'worktree', 'unlock', wtLocked);
  rmSync(root, { recursive: true, force: true });
});

// ─── 設定ファイルの妥当性（閾値の書き間違いを検知）─────────────────────────
test('disk-hygiene.json: 必須キーと閾値の整合', async () => {
  const { readFileSync } = await import('node:fs');
  const cfg = JSON.parse(readFileSync('.claude/config/disk-hygiene.json', 'utf-8'));
  assert.ok(cfg.thresholds.freeFailBytes < cfg.thresholds.freeWarnBytes, 'fail は warn より小さい');
  assert.ok(Array.isArray(cfg.allowedWorktreeRoots) && cfg.allowedWorktreeRoots.length > 0);
  assert.ok(Array.isArray(cfg.baseRefs) && cfg.baseRefs.length > 0);
  assert.ok(cfg.reportOnly.every((e) => e.path && e.note), 'reportOnly は path と note を持つ');
  // .tmp が許可置き場に混ざっていないこと（prune が中身を消すため）
  assert.equal(cfg.allowedWorktreeRoots.some((r) => r.includes('.tmp')), false);
});
