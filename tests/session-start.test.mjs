/**
 * session-start.mjs（SessionStart の検査を 1 プロセス内で順次実行）の契約を固定する（DN-0236）。
 * - CHECKS の各 script は run() を export し、import しただけでは CLI が走らない
 * - run({ quiet: true }) は process.exit せず { code, stdout, stderr } を返す
 * - quiet の出力は CLI（node で直接起動）の出力と同じ
 * - session-start 自体は子の node を spawn しない
 * git fetch（git-sync）と Playwright（x-sync）は実行しない。
 */
import process from 'node:process';
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CHECKS, runCheck } from '../scripts/session-start.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('CHECKS の全 script が run() を export している（import で CLI が走らない）', async () => {
  assert.ok(CHECKS.length >= 8, `CHECKS が ${CHECKS.length} 件しかない`);
  for (const c of CHECKS) {
    const mod = await import(pathToFileURL(join(ROOT, c.script)).href);
    assert.equal(typeof mod.run, 'function', `${c.script} が run() を export していない`);
  }
});

test('session-start.mjs は子プロセスを起動しない（child_process を import しない）', () => {
  const src = readFileSync(join(ROOT, 'scripts/session-start.mjs'), 'utf8');
  assert.doesNotMatch(src, /from ['"]node:child_process['"]|require\(['"](node:)?child_process['"]\)/);
});

for (const name of ['plan-staleness', 'weekly-review-due', 'shared-policy']) {
  test(`${name}: run({ quiet: true }) は exit せず、CLI と同じ出力と exit code を返す`, async () => {
    const check = CHECKS.find((c) => c.name === name);
    const { run } = await import(pathToFileURL(join(ROOT, check.script)).href);
    const r = await run({ argv: check.args, quiet: true });
    assert.equal(typeof r.code, 'number');
    assert.equal(typeof r.stdout, 'string');
    assert.equal(typeof r.stderr, 'string');
    const cli = spawnSync(process.execPath, [join(ROOT, check.script), ...check.args], { cwd: ROOT, encoding: 'utf8', timeout: 30_000 });
    assert.equal(r.stdout, cli.stdout);
    assert.equal(r.stderr, cli.stderr);
    assert.equal(r.code, cli.status);
  });
}

test('runCheck は旧 spawn 版と同じ形 { name, status, ms, out } を返す', async () => {
  const r = await runCheck(CHECKS.find((c) => c.name === 'weekly-review-due'));
  assert.equal(r.name, 'weekly-review-due');
  assert.ok([0, 1].includes(r.status), `status=${r.status}`);
  assert.equal(typeof r.ms, 'number');
  assert.equal(typeof r.out, 'string');
});

test('runCheck は script の読込失敗を error として返し、throw しない', async () => {
  const r = await runCheck({ name: 'missing', script: 'scripts/__no_such_check__.mjs', args: [], timeout: 1000 });
  assert.equal(r.status, 'error');
  assert.ok(r.out.length > 0);
});
