import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import process from 'node:process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  classifyStaged,
  decisionDocsChanged,
  docSyncMessages,
  hasReplacementChar,
  isGeminiBilling,
  isGitCommitCommand,
  isMdxPath,
  parseHookInput,
  parseNameStatus,
  strayAtRoot,
} from '../scripts/lib/agent-hooks.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = join(REPO, 'scripts', 'hooks', 'agent-hook.mjs');

function runHook(name, stdin = '', env = {}) {
  const r = spawnSync(process.execPath, [HOOK, name], { cwd: REPO, input: stdin, encoding: 'utf8', env: { ...process.env, ...env } });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

test('parseHookInput: stdin JSON を優先し、env と生テキストへフォールバックする', () => {
  assert.equal(parseHookInput('{"tool_input":{"command":"git commit -m x"}}').command, 'git commit -m x');
  assert.equal(parseHookInput('{"tool_input":{"file_path":"a.mdx"}}').filePath, 'a.mdx');
  assert.equal(parseHookInput('', { CLAUDE_TOOL_INPUT: 'npm run ogp-backgrounds' }).command, 'npm run ogp-backgrounds');
  assert.equal(parseHookInput('not json').command, 'not json');
  assert.equal(parseHookInput('').filePath, '');
});

test('isGeminiBilling: 課金パターンを拾い --dry-run は素通し', () => {
  assert.equal(isGeminiBilling('npm run ogp-backgrounds'), true);
  assert.equal(isGeminiBilling('curl https://generativelanguage.googleapis.com/v1/x:generateContent'), true);
  assert.equal(isGeminiBilling('gemini -p "hi"'), true);
  assert.equal(isGeminiBilling('npm run ogp-backgrounds -- --dry-run'), false);
  assert.equal(isGeminiBilling('git status'), false);
  assert.equal(isGeminiBilling('cat .claude/knowledge/reference/notebooklm-cli-gotchas.md'), false);
});

test('check-mojibake: U+FFFD を含む .mdx は exit 2、正常な .mdx と .md は exit 0', () => {
  assert.equal(isMdxPath('x.mdx'), true);
  assert.equal(isMdxPath('x.md'), false);
  assert.equal(hasReplacementChar('a�b'), true);
  assert.equal(hasReplacementChar('ok'), false);
});

test('parseNameStatus / classifyStaged: skills 変更・registry 未更新・新規 script を分類', () => {
  const staged = parseNameStatus('M\t.claude/agents/x.md\nA\tscripts/new-tool.mjs\nR100\tscripts/a.mjs\tscripts/b.mjs\nM\tdocs/strategy/決定_x.md\n');
  const c = classifyStaged(staged);
  assert.deepEqual(c.skillsChanged, ['.claude/agents/x.md']);
  assert.deepEqual(c.registryChanged, []);
  assert.deepEqual(c.newTools, ['scripts/new-tool.mjs']);
  assert.deepEqual(c.decisionChanged, ['docs/strategy/決定_x.md']);
  const msgs = docSyncMessages(c, 7);
  assert.ok(msgs.some((m) => m.startsWith('WARNING')));
  assert.ok(msgs.some((m) => m.includes('新しいスクリプト')));
  assert.ok(msgs.some((m) => m.includes('active handoff が 7 本')));
  assert.equal(docSyncMessages(classifyStaged([]), 0).length, 0);
  assert.equal(isGitCommitCommand('git add x && git commit -m y'), true);
  assert.equal(isGitCommitCommand('git status'), false);
});

test('strayAtRoot / decisionDocsChanged', () => {
  assert.deepEqual(strayAtRoot(['shot.png', 'docs/a.png', '', 'x.tmp', 'shot.png']), ['shot.png', 'x.tmp']);
  const changed = decisionDocsChanged(' M .claude/knowledge/reference/x.md\n?? scripts/y.mjs\nR  a.md -> content/note/技術士総監/noteコンテンツ計画.md\n');
  assert.deepEqual(changed, ['.claude/knowledge/reference/x.md', 'content/note/技術士総監/noteコンテンツ計画.md']);
});

test('CLI: check-gemini-cost は ask の JSON を stdout に出し、それ以外は無出力・exit 0', () => {
  const ask = runHook('check-gemini-cost', JSON.stringify({ tool_input: { command: 'npm run ogp-backgrounds' } }));
  assert.equal(ask.status, 0);
  assert.equal(JSON.parse(ask.stdout).hookSpecificOutput.permissionDecision, 'ask');
  const ok = runHook('check-gemini-cost', JSON.stringify({ tool_input: { command: 'git status' } }));
  assert.equal(ok.status, 0);
  assert.equal(ok.stdout, '');
});

test('CLI: check-mojibake は .mdx の U+FFFD で exit 2（stderr に BLOCK）、無ければ 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hook-mojibake-'));
  try {
    const bad = join(dir, 'bad.mdx');
    const good = join(dir, 'good.mdx');
    writeFileSync(bad, 'x � y');
    writeFileSync(good, 'fine');
    const r1 = runHook('check-mojibake', JSON.stringify({ tool_input: { file_path: bad } }));
    assert.equal(r1.status, 2);
    assert.match(r1.stderr, /BLOCK: MDXファイルに文字化け/);
    const r2 = runHook('check-mojibake', JSON.stringify({ tool_input: { file_path: good } }));
    assert.equal(r2.status, 0);
    const r3 = runHook('check-mojibake', JSON.stringify({ tool_input: { file_path: bad.replace(/\.mdx$/, '.md') } }));
    assert.equal(r3.status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CLI: unknown name は usage を出して exit 1、advisory 系は空入力でも exit 0', () => {
  assert.equal(runHook('nope').status, 1);
  for (const n of ['check-stray-files', 'decision-doc-checkpoint', 'check-doc-sync']) assert.equal(runHook(n, '').status, 0, n);
});
