// record-usage hook（DN-0789）: Skill・Agent・スラッシュコマンドの呼び出しをリポジトリの外へ 1 行ずつ記録する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { usageLogPath, usageRecord } from '../scripts/lib/agent-hooks.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

const NOW = new Date('2026-10-21T03:04:05Z');

test('Skill・Agent・Task の PreToolUse を記録する', () => {
  assert.deepEqual(usageRecord({ hook_event_name: 'PreToolUse', tool_name: 'Skill', tool_input: { skill: 'deploy' }, session_id: 's1' }, NOW),
    { at: '2026-10-21T03:04:05.000Z', session: 's1', fromAgent: null, kind: 'skill', name: 'deploy' });
  assert.equal(usageRecord({ hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_input: { subagent_type: 'guide-qa' } }, NOW).name, 'guide-qa');
  assert.equal(usageRecord({ hook_event_name: 'PreToolUse', tool_name: 'Task', tool_input: {} }, NOW).name, 'general-purpose');
  assert.equal(usageRecord({ hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_input: { subagent_type: 'Explore' }, agent_type: 'strategy-advisor' }, NOW).fromAgent, 'strategy-advisor');
});

test('人が打ったスラッシュコマンドは名前だけを残し、本文は残さない', () => {
  const r = usageRecord({ hook_event_name: 'UserPromptSubmit', prompt: '/weekly-review 先週の分 秘密のメモ' }, NOW);
  assert.equal(r.kind, 'command');
  assert.equal(r.name, 'weekly-review');
  assert.ok(!JSON.stringify(r).includes('秘密'));
  assert.equal(usageRecord({ hook_event_name: 'UserPromptSubmit', prompt: 'ふつうの依頼 /path/to' }, NOW), null);
});

test('記録しないイベント・ツールは null', () => {
  assert.equal(usageRecord({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' } }, NOW), null);
  assert.equal(usageRecord({ hook_event_name: 'Stop' }, NOW), null);
  assert.equal(usageRecord(null, NOW), null);
});

test('記録先は月ごとのファイル', () => {
  assert.equal(usageLogPath('/x', NOW), '/x/doboku-note-2026-10.jsonl');
});

test('hook を通すと記録先へ 1 行追記し、exit 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'usage-'));
  try {
    const run = (input) => spawnSync(process.execPath, [join(REPO_ROOT, 'scripts/hooks/agent-hook.mjs'), 'record-usage'],
      { cwd: REPO_ROOT, input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, DOBOKU_USAGE_LOG_DIR: dir } });
    assert.equal(run({ hook_event_name: 'PreToolUse', tool_name: 'Skill', tool_input: { skill: 'doc-sync' } }).status, 0);
    assert.equal(run({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' } }).status, 0);
    const files = readdirSync(dir);
    assert.equal(files.length, 1);
    const lines = readFileSync(join(dir, files[0]), 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    assert.equal(JSON.parse(lines[0]).name, 'doc-sync');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('settings.json に PreToolUse(Skill|Agent|Task) と UserPromptSubmit で登録されている', () => {
  const s = JSON.parse(readFileSync(join(REPO_ROOT, '.claude/settings.json'), 'utf8'));
  const has = (list, matcher) => (list ?? []).some((e) => (matcher == null || e.matcher === matcher) && e.hooks.some((h) => h.command.includes('record-usage')));
  assert.ok(has(s.hooks.PreToolUse, 'Skill|Agent|Task'));
  assert.ok(has(s.hooks.UserPromptSubmit));
});
