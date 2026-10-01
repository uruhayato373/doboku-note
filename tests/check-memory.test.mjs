/**
 * エージェントの記憶（.claude/memory）の 1 本化ゲート（check-memory）のテスト。
 *
 * 守りたい事故（2026-10-02）: Mac だけ ~/.claude/projects/<key>/memory が実ディレクトリのまま
 *   別リポジトリへ自動同期され、repo の .claude/memory と 188 件 vs 143 件に分裂した。
 *   MEMORY.md も 332 行に膨らみ、読み込み上限（200 行）を超えた分は黙って読まれていなかった。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditGlobalHooks, auditLink, auditMemoryFiles, INDEX_MAX_LINES, run } from '../scripts/check-memory.mjs';
import { claudeProjectKey } from '../scripts/setup-memory-link.mjs';

const mem = (name, type = 'feedback', desc = '説明') => `---\nname: ${name}\ndescription: ${desc}\nmetadata:\n  type: ${type}\n---\n本文\n`;

test('健全な記憶と索引は違反 0', () => {
  const r = auditMemoryFiles({ 'a.md': mem('a'), 'b.md': mem('b', 'project') }, '- [a](a.md) — x\n- [b](./b.md) — y\n');
  assert.deepEqual(r.problems, []);
  assert.equal(r.count, 2);
});

test('frontmatter の欠落・壊れ・型違い・名前重複を検出する', () => {
  const r = auditMemoryFiles({
    'a.md': mem('dup'),
    'b.md': mem('dup'),
    'c.md': '---\nname: c\ndescription: a: b: c\n---\n',
    'd.md': mem('d', 'note'),
  }, '- [a](a.md)\n- [b](b.md)\n- [c](c.md)\n- [d](d.md)\n');
  const text = r.problems.join('\n');
  assert.match(text, /c\.md: frontmatter が YAML として読めない/);
  assert.match(text, /d\.md: type が/);
  assert.match(text, /name "dup" が重複/);
});

test('索引に無い記憶・索引の死んだリンク・行数上限を検出する', () => {
  const lines = Array.from({ length: INDEX_MAX_LINES + 1 }, (_, i) => `- 行${i}`).join('\n');
  const r = auditMemoryFiles({ 'a.md': mem('a'), 'b.md': mem('b') }, `- [a](a.md)\n- [x](gone.md)\n${lines}`);
  const text = r.problems.join('\n');
  assert.match(text, /載っていない記憶 1 件: b\.md/);
  assert.match(text, /リンク先が無い: gone\.md/);
  assert.match(text, /行（上限 200/);
});

test('リンクでなく実ディレクトリなら分裂として検出し、正しいリンクなら通す', () => {
  const home = mkdtempSync(join(tmpdir(), 'mem-home-'));
  const target = mkdtempSync(join(tmpdir(), 'mem-target-'));
  const cwd = '/tmp/some-repo';
  const memDir = join(home, '.claude', 'projects', claudeProjectKey(cwd), 'memory');
  mkdirSync(memDir, { recursive: true });
  writeFileSync(join(memDir, 'x.md'), 'x');
  assert.match(auditLink({ cwd, home, target }).problems.join(), /実ディレクトリ/);

  const home2 = mkdtempSync(join(tmpdir(), 'mem-home-'));
  const link = join(home2, '.claude', 'projects', claudeProjectKey(cwd), 'memory');
  mkdirSync(join(link, '..'), { recursive: true });
  symlinkSync(target, link, 'dir');
  assert.deepEqual(auditLink({ cwd, home: home2, target }).problems, []);
});

test('記憶を別経路で同期するフックを検出する', () => {
  const settings = JSON.stringify({ hooks: { SessionEnd: [{ hooks: [{ type: 'command', command: '$HOME/.claude/hooks/sync-memory.sh push' }] }], Stop: [{ hooks: [{ command: 'echo ok' }] }] } });
  assert.equal(auditGlobalHooks(settings).length, 1);
  assert.deepEqual(auditGlobalHooks(JSON.stringify({ hooks: {} })), []);
});

test('記憶 0 件は検査不成立（exit 2）', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mem-root-'));
  mkdirSync(join(root, '.claude', 'memory'), { recursive: true });
  writeFileSync(join(root, '.claude', 'memory', 'MEMORY.md'), '# Memory Index\n');
  const r = await run({ argv: [], quiet: true, root });
  assert.equal(r.code, 2);
});
