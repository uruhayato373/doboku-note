/**
 * offsite-cta（サイト → ココナラ導線）のルールが、恒久廃止した出品を指して無言で消えないことを固定する。
 * 2026-09-30、ルールが retired と一時休止の出品だけを指し、出品中の商品が配線されず、2級・主任技士のページに導線が 1 枚も出ていなかった。
 * 一時休止（pauseReason:'absence'）は復帰するので許す（不在のたびに赤くしない）。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function tsx(code) {
  const cli = join(ROOT, 'node_modules/tsx/dist/cli.mjs');
  return execFileSync(process.execPath, [cli, '-e', code], { cwd: ROOT, encoding: 'utf8' });
}

const rules = JSON.parse(tsx(`
  import { OFFSITE_RULES } from './src/lib/offsite-cta.ts';
  import { COCONALA_SERVICES } from './src/lib/coconala-services.ts';
  process.stdout.write(JSON.stringify(OFFSITE_RULES.map((r) => ({
    test: String(r.test),
    ids: (r.coconala ?? []).map((id) => ({ id, svc: COCONALA_SERVICES[id] ?? null })),
  }))));
`));

test('ルールが指す出品 ID はすべて台帳に実在し、恒久廃止（retired）でない', () => {
  const bad = rules.flatMap((r) => r.ids
    .filter(({ svc }) => !svc || (svc.status === 'paused' && svc.pauseReason === 'retired'))
    .map(({ id, svc }) => `${r.test} → ${id}（${svc ? 'retired' : '台帳に無い'}）`));
  assert.deepEqual(bad, []);
});

test('各ルールに出品が 1 件以上ある', () => {
  assert.ok(rules.length > 0);
  assert.deepEqual(rules.filter((r) => r.ids.length === 0).map((r) => r.test), []);
});
