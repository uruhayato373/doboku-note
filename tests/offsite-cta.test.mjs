/**
 * offsite-cta（サイト → ココナラ導線）のルールが、恒久廃止した出品を指して無言で消えないことを固定する。
 * 2026-09-30、ルールが retired と一時休止の出品だけを指し、出品中の商品が配線されず、2級・主任技士のページに導線が 1 枚も出ていなかった。
 * 一時休止（pauseReason:'absence'）は復帰するので許す（不在のたびに赤くしない）。
 */
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

function tsx(code) {
  const cli = join(ROOT, 'node_modules/tsx/dist/cli.mjs');
  return execFileSync(process.execPath, [cli, '-e', code], { cwd: ROOT, encoding: 'utf8' });
}

// ルールは export せず（knip の未使用 export を増やさない）、ソースの test/coconala の組を読む。
const src = readFileSync(join(ROOT, 'src/lib/offsite-cta.ts'), 'utf8');
const body = src.slice(src.indexOf('const OFFSITE_RULES'), src.indexOf('\n];', src.indexOf('const OFFSITE_RULES')));
const parsed = [...body.matchAll(/test:\s*(\/.*\/),\s*\n\s*coconala:\s*\[([^\]]*)\]/g)]
  .map((m) => ({ test: m[1], ids: [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1]) }));
const services = JSON.parse(tsx(`
  import { COCONALA_SERVICES } from './src/lib/coconala-services.ts';
  process.stdout.write(JSON.stringify(COCONALA_SERVICES));
`));
const rules = parsed.map((r) => ({ test: r.test, ids: r.ids.map((id) => ({ id, svc: services[id] ?? null })) }));

test('ルールが指す出品 ID はすべて台帳に実在し、恒久廃止（retired）でない', () => {
  const bad = rules.flatMap((r) => r.ids
    .filter(({ svc }) => !svc || (svc.status === 'paused' && svc.pauseReason === 'retired'))
    .map(({ id, svc }) => `${r.test} → ${id}（${svc ? 'retired' : '台帳に無い'}）`));
  assert.deepEqual(bad, []);
});

test('各ルールに出品が 1 件以上ある', () => {
  assert.equal(rules.length, (body.match(/\btest:/g) || []).length, 'ルールの読み取り漏れ');
  assert.ok(rules.length > 0);
  assert.deepEqual(rules.filter((r) => r.ids.length === 0).map((r) => r.test), []);
});
