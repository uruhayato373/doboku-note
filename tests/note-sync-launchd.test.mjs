import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, realpathSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { renderNoteSyncBootstrap, renderNoteSyncPlist, validateCatchUpUntil } from '../scripts/lib/note-sync-launchd.mjs';

test('catch-up requires a real date and renders a single existing job', () => {
  assert.equal(validateCatchUpUntil('2026-10-24'), '2026-10-24');
  for (const bad of ['2026-02-30', 'tomorrow', '2026-1-01', '2026-13-01']) assert.throws(() => validateCatchUpUntil(bad));
  const template = readFileSync(new URL('../scripts/scheduled/com.doboku-note.note-sync.plist.tmpl', import.meta.url), 'utf8');
  const paths = { repoRoot: '/repo & data', homeDir: '/home/"user"', bootstrapPath: '/stable/note-sync.sh' };
  const weekly = renderNoteSyncPlist(template, paths);
  const daily = renderNoteSyncPlist(template, { ...paths, catchUpUntil: '2026-10-24' });
  assert.match(weekly, /<key>Weekday<\/key>/);
  assert.doesNotMatch(daily, /<key>Weekday<\/key>/);
  assert.match(daily, /<string>--scheduled<\/string>/);
  assert.match(daily, /<string>\/stable\/note-sync.sh<\/string>/);
  assert.match(daily, /\/repo &amp; data/);
  assert.match(daily, /\/home\/&quot;user&quot;/);
  assert.doesNotMatch(daily, /__\w+__/);
});

test('installed bootstrap expires extra daily work, keeps Sundays and manual runs, and ignores dirty checkout', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'note-sync-launchd-'));
  try {
    const remote = join(tmp, 'origin.git'), repo = join(tmp, "repo ' & space"), bootstrap = join(tmp, 'note-sync.sh');
    const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    git('init', '--bare', remote); git('clone', remote, repo); git('-C', repo, 'checkout', '-b', 'develop');
    mkdirSync(join(repo, 'scripts/scheduled'), { recursive: true });
    const runner = join(repo, 'scripts/scheduled/note-sync.sh');
    writeFileSync(runner, '#!/bin/bash\nprintf "committed: %s args=%s\\n" "$DOBOKU_NOTE_SYNC_REPO" "$*"\n');
    git('-C', repo, 'add', 'scripts/scheduled/note-sync.sh');
    git('-C', repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'fixture');
    git('-C', repo, 'push', '-u', 'origin', 'develop');
    writeFileSync(runner, '#!/bin/bash\nexit 99\n');
    const before = git('-C', repo, 'status', '--porcelain');
    const run = (date, weekday, ...args) => {
      const fakeClock = `date() { if [ "$1" = '+%F' ]; then echo '${date}'; else echo '${weekday}'; fi; }\n`;
      writeFileSync(bootstrap, renderNoteSyncBootstrap(repo, '2026-10-24').replace('set -euo pipefail\n', `set -euo pipefail\n${fakeClock}`));
      return execFileSync('/bin/bash', [bootstrap, ...args], { encoding: 'utf8' }).trim();
    };
    assert.equal(run('2026-10-24', 6, '--scheduled'), `committed: ${repo} args=`);
    assert.match(run('2026-10-26', 1, '--scheduled'), /catch-up expired/);
    assert.equal(run('2026-10-25', 0, '--scheduled'), `committed: ${repo} args=`);
    assert.equal(run('2026-10-26', 1, '--max', '1'), `committed: ${repo} args=--max 1`);
    assert.equal(git('-C', repo, 'status', '--porcelain'), before);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('a second runner cannot reset the dedicated worktree while its lock owner is alive', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'note-sync-lock-'));
  try {
    const dir = join(tmp, 'Library/Logs/doboku-note');
    mkdirSync(join(dir, 'note-sync.lock'), { recursive: true });
    writeFileSync(join(dir, 'note-sync.lock/pid'), String(process.pid));
    execFileSync('/bin/bash', [new URL('../scripts/scheduled/note-sync.sh', import.meta.url).pathname], {
      encoding: 'utf8', env: { ...process.env, HOME: tmp, DOBOKU_NOTE_SYNC_REPO: '/must-not-fetch-or-reset' },
    });
    assert.match(readFileSync(join(dir, 'note-sync.log'), 'utf8'), /already running/);
    assert.equal(readFileSync(join(dir, 'note-sync.lock/pid'), 'utf8'), String(process.pid));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('next run preserves uncommitted or unpushed state after a failed writeback', () => {
  const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'note-sync-recovery-')));
  try {
    const remote = join(tmp, 'origin.git'), repo = join(tmp, 'repo'), home = join(tmp, 'user');
    const wt = join(repo, '.claude/worktrees/note-sync');
    const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    git('init', '--bare', remote); git('clone', remote, repo); git('-C', repo, 'checkout', '-b', 'develop');
    writeFileSync(join(repo, 'state.json'), '{}\n');
    git('-C', repo, 'add', 'state.json');
    const commit = (root, message) => git('-C', root, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-am', message);
    commit(repo, 'fixture'); git('-C', repo, 'push', '-u', 'origin', 'develop');
    git('-C', repo, 'worktree', 'add', '--detach', wt, 'origin/develop');
    const invoke = () => spawnSync('/bin/bash', [new URL('../scripts/scheduled/note-sync.sh', import.meta.url).pathname], {
      encoding: 'utf8', env: { ...process.env, HOME: home, DOBOKU_NOTE_SYNC_REPO: repo },
    });
    writeFileSync(join(wt, 'state.json'), '{"updated":1}\n');
    assert.equal(invoke().status, 1);
    assert.equal(readFileSync(join(wt, 'state.json'), 'utf8'), '{"updated":1}\n');
    assert.match(readFileSync(join(home, 'Library/Logs/doboku-note/note-sync.log'), 'utf8'), /uncommitted state remains/);
    commit(wt, 'record published update');
    const head = git('-C', wt, 'rev-parse', 'HEAD');
    assert.equal(invoke().status, 1);
    assert.equal(git('-C', wt, 'rev-parse', 'HEAD'), head);
    assert.match(readFileSync(join(home, 'Library/Logs/doboku-note/note-sync.log'), 'utf8'), /unpushed commits remain/);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
