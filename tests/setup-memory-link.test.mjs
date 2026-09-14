import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { join, resolve } from 'node:path';

import { claudeProjectKey, defaultMemoryTarget, setupMemoryLink, setupSettingsLink } from '../scripts/setup-memory-link.mjs';

const isWin = process.platform === 'win32';

test('claudeProjectKey: 英数字以外を - にする（Claude Code の ~/.claude/projects/<key> と一致）', () => {
  if (isWin) assert.equal(claudeProjectKey('C:\\Users\\m004195\\doboku-note'), 'C--Users-m004195-doboku-note');
  assert.equal(claudeProjectKey('/Users/minamidaisuke/doboku-note'), isWin ? claudeProjectKey('/Users/minamidaisuke/doboku-note') : '-Users-minamidaisuke-doboku-note');
  assert.match(claudeProjectKey(resolve('.')), /^[A-Za-z0-9-]+$/);
});

test('defaultMemoryTarget: worktree でもメイン作業ツリーの .claude/memory を指す', () => {
  const root = mkdtempSync(join(tmpdir(), 'memlink-'));
  try {
    execFileSync('git', ['init', '-q', root]);
    writeFileSync(join(root, 'a.txt'), 'a');
    execFileSync('git', ['-C', root, 'add', 'a.txt']);
    execFileSync('git', ['-C', root, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'init']);
    const wt = join(root, '.claude', 'worktrees', 'x');
    execFileSync('git', ['-C', root, 'worktree', 'add', '-q', wt]);
    assert.equal(resolve(defaultMemoryTarget(root)).toLowerCase(), resolve(join(root, '.claude', 'memory')).toLowerCase());
    const fromWt = defaultMemoryTarget(wt);
    assert.equal(resolve(fromWt).toLowerCase(), resolve(join(root, '.claude', 'memory')).toLowerCase());
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('setupMemoryLink: 実ディレクトリは --migrate で target へ移してからリンク、2 回目は already linked、target 不在は中止', () => {
  const home = mkdtempSync(join(tmpdir(), 'memlink-home-'));
  const cwd = mkdtempSync(join(tmpdir(), 'memlink-repo-'));
  try {
    const key = claudeProjectKey(cwd);
    const live = join(home, '.claude', 'projects', key, 'memory');
    mkdirSync(live, { recursive: true });
    writeFileSync(join(live, 'MEMORY.md'), '# idx\n');
    writeFileSync(join(live, 'note_a.md'), 'a\n');
    const target = join(cwd, '.claude', 'memory');

    const stop = setupMemoryLink({ cwd, home, target, dryRun: false, migrate: false });
    assert.equal(stop.ok, false, 'target 不在・--migrate 無しは中止');
    const bak = readdirSync(join(home, '.claude', 'projects', key)).find((n) => n.startsWith('memory.bak-'));
    assert.ok(bak, '実ディレクトリは消さず退避');
    // 退避を戻して migrate 経路を試す
    execFileSync(isWin ? 'cmd' : 'mv', isWin ? ['/c', 'move', join(home, '.claude', 'projects', key, bak), live] : [join(home, '.claude', 'projects', key, bak), live]);

    const r = setupMemoryLink({ cwd, home, target, dryRun: false, migrate: true });
    assert.equal(r.ok, true, r.log.join('\n'));
    assert.ok(lstatSync(live).isSymbolicLink(), 'live は symlink/junction');
    assert.equal(readFileSync(join(live, 'note_a.md'), 'utf8'), 'a\n');
    assert.equal(readFileSync(join(target, 'MEMORY.md'), 'utf8'), '# idx\n');

    const again = setupMemoryLink({ cwd, home, target, dryRun: false, migrate: true });
    assert.equal(again.changed, false);
    assert.ok(again.log.some((l) => l.startsWith('already linked')));

    // リンク越しの書き込みが target へ届く（Claude が memory を書く経路）
    writeFileSync(join(live, 'note_b.md'), 'b\n');
    assert.ok(existsSync(join(target, 'note_b.md')));
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('setupMemoryLink --migrate: target 既存なら無い／新しいファイルだけ複製し、元を .bak へ退避', () => {
  const home = mkdtempSync(join(tmpdir(), 'memlink-home-'));
  const cwd = mkdtempSync(join(tmpdir(), 'memlink-repo-'));
  try {
    const key = claudeProjectKey(cwd);
    const live = join(home, '.claude', 'projects', key, 'memory');
    const target = join(cwd, '.claude', 'memory');
    mkdirSync(live, { recursive: true });
    mkdirSync(target, { recursive: true });
    writeFileSync(join(target, 'old.md'), 'target版\n');
    writeFileSync(join(live, 'old.md'), 'live版\n');
    const future = new Date(Date.now() + 60_000);
    utimesSync(join(live, 'old.md'), future, future); // 同一 ms に書くと mtime が並ぶので live を明示的に新しくする
    writeFileSync(join(live, 'only-live.md'), 'x\n');
    const r = setupMemoryLink({ cwd, home, target, dryRun: false, migrate: true });
    assert.equal(r.ok, true, r.log.join('\n'));
    assert.equal(readFileSync(join(target, 'only-live.md'), 'utf8'), 'x\n');
    assert.equal(readFileSync(join(target, 'old.md'), 'utf8'), 'live版\n', 'live の方が新しいので上書き');
    assert.ok(readdirSync(join(home, '.claude', 'projects', key)).some((n) => n.startsWith('memory.bak-')));
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('setupSettingsLink: dotfiles の JSON を .claude/settings.local.json へ link か copy', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'memlink-repo-'));
  const dot = mkdtempSync(join(tmpdir(), 'memlink-dot-'));
  try {
    const src = join(dot, 'doboku-note.local.json');
    writeFileSync(src, '{"permissions":{"allow":[]}}\n');
    const r = setupSettingsLink({ cwd, settings: src, dryRun: false });
    assert.equal(r.ok, true, r.log.join('\n'));
    const dst = join(cwd, '.claude', 'settings.local.json');
    assert.equal(readFileSync(dst, 'utf8'), '{"permissions":{"allow":[]}}\n');
    assert.ok(r.log[0].startsWith('settings linked') || r.log[0].startsWith('settings copied'));
    assert.equal(setupSettingsLink({ cwd, settings: join(dot, 'missing.json'), dryRun: false }).ok, false);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
    rmSync(dot, { recursive: true, force: true });
  }
});
