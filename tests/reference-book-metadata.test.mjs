import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';
test('metadata-only verifies real manifests without reading Drive assets', () => {
  const result = spawnSync(process.execPath, ['scripts/check-reference-book-pages.mjs', '--metadata-only'], { cwd: REPO_ROOT, encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  const out = result.stdout + result.stderr;
  const counts = /対象 (\d+) 冊 \/ manifest (\d+) 冊/.exec(out);
  assert.ok(counts && Number(counts[1]) > 0);
  assert.equal(counts[1], counts[2]);
  assert.match(out, /--metadata-only/);
  assert.match(out, /原本 0 ファイル/);
});
