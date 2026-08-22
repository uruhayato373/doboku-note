import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HEALTH = join(ROOT, 'scripts/check-backlog-health.mjs');
const SKILL = join(ROOT, '.claude/skills/management/backlog-sweep/SKILL.md');

/**
 * 「棚卸しをいつ回すか」の判定が、散文と実装で食い違わないことを固定する。
 *
 * 守りたい事故: 起動条件は 2026-08-18 まで SKILL.md の散文にしか無く、機械が誰も判定していなかった。
 * 条件をコードへ移した以上、散文と実装が別々に動くと「書いてあるのに発火しない」に戻る。
 */

function dueRuleIds() {
  const src = readFileSync(HEALTH, 'utf8');
  const block = src.slice(src.indexOf('const DUE_RULES'), src.indexOf('/** JST の'));
  assert.ok(block.length > 100, 'DUE_RULES ブロックを取り出せない（実装の形が変わった）');
  return [...block.matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
}

test('DUE_RULES の各シグナルが SKILL の起動条件にも書かれている', () => {
  const ids = dueRuleIds();
  assert.ok(ids.length >= 5, `DUE_RULES が少なすぎる: ${ids.join(',')}`);

  const skill = readFileSync(SKILL, 'utf8');
  const start = skill.indexOf('### 起動条件');
  const section = skill.slice(start, skill.indexOf('### 手順', start));
  assert.ok(section.length > 100, '起動条件の節が見つからない');

  const missing = ids.filter((id) => !section.includes(id));
  assert.deepEqual(missing, [], `実装にあるが SKILL に書かれていない条件: ${missing.join(', ')}`);
});

test('棚卸しの実施記録が state に閉じている（docs 側に台帳を作らない）', () => {
  const src = readFileSync(HEALTH, 'utf8');
  assert.match(src, /\.claude\/state\/backlog\/audit-log\.json/, '記録先が .claude/state 配下でない');
  const skill = readFileSync(SKILL, 'utf8');
  assert.match(skill, /--record-audit/, 'SKILL の手順に記録ステップが無い（記録されないと月初条件が永久に真になる）');
});

test('npm run check-backlog-due が package.json に存在する', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['check-backlog-due'], 'node scripts/check-backlog-health.mjs --due');
});
