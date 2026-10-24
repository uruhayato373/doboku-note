// .claude/config/ の JSON は型で守る（DN-0524・案B）。認証の許可リストや CI の書き込み許可が壊れると、
// ログインや書き戻しが黙って止まる。型の無い JSON・常に通る型も検査で止める。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkAgentConfigFile } from '../scripts/check-agent-config.mjs';
import { AGENT_CONFIG_SCHEMAS } from '../scripts/lib/dataset-schemas-agent-config.mjs';
import { AGENT_CONFIG_ROOT } from '../scripts/lib/repository-paths.mjs';

const files = readdirSync(AGENT_CONFIG_ROOT).filter((f) => f.endsWith('.json'));
const read = (f) => readFileSync(join(AGENT_CONFIG_ROOT, f), 'utf8');

test('.claude/config/ の JSON はすべて型があり、型に合う', () => {
  assert.ok(files.length > 0, '検査対象が 0 件');
  for (const f of files) assert.deepEqual(checkAgentConfigFile(f, read(f)), [], f);
});

test('どの型も、実データから必須の欄を 1 つ消すと落ちる（常に通る型にしない）', () => {
  for (const f of files) {
    const value = JSON.parse(read(f));
    const key = Object.keys(value).find((k) => !AGENT_CONFIG_SCHEMAS[f].safeParse({ ...value, [k]: undefined }).success);
    assert.ok(key, `${f}: どの欄を消しても通る`);
  }
});

test('型の無い JSON・読めない JSON・誤記の欄は止める', () => {
  assert.match(checkAgentConfigFile('new-baseline.json', '{}')[0], /型が無い/);
  assert.match(checkAgentConfigFile('gate-parity-baseline.json', '{')[0], /JSON として読めない/);
  const auth = JSON.parse(read('playwright-auth-profiles.json'));
  const first = Object.keys(auth.services)[0];
  auth.services[first].sessionMode = 'cookie';
  assert.ok(checkAgentConfigFile('playwright-auth-profiles.json', JSON.stringify(auth)).some((e) => e.includes('sessionMode')));
});
