// lint-ja --staged を CI で回すと staged が無く毎回 0 件で緑になっていた（DN-1124）。
// CI では比較元（REGISTRY_BASE）との差分を対象にし、比較元が無ければ検査不成立（exit 2）にする。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { REPO_ROOT as ROOT } from '../scripts/lib/repository-paths.mjs';

const run = (env) =>
  spawnSync(process.execPath, [join(ROOT, 'scripts/lint-ja.mjs'), '--staged'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, CI: '', REGISTRY_BASE: '', DOBOKU_PRE_COMMIT: '', ...env },
  });

test('CI で比較元が無いときは 0 件の緑にせず、検査不成立（exit 2）にする', () => {
  const r = run({ CI: 'true' });
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /検査不成立/);
});

test('CI で比較元があれば、その差分を対象として件数を出す（HEAD 自身との差分は 0 件）', () => {
  const r = run({ CI: 'true', REGISTRY_BASE: 'HEAD' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /対象 0 件（CI・HEAD との差分/);
});

test('CI の中でも pre-commit（bot の commit）では staged を見る。比較元が無くても止めない（2026-11-13・OGP Supply）', () => {
  const r = run({ CI: 'true', DOBOKU_PRE_COMMIT: '1' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stderr, /検査不成立/);
});
