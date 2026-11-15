import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inspectAuthFreshness, run } from '../scripts/check-auth-freshness.mjs';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

test('鮮度は印あり・古い・新しい・欠測を区別し、対象0件もPASSにしない', () => {
  const root = mkdtempSync(join(tmpdir(), 'auth-freshness-'));
  const options = { cwd: REPO_ROOT, repoRoot: REPO_ROOT, overrideRoot: root, env: {} };
  const nowMs = Date.parse('2026-11-15T00:00:00Z');
  const inspect = () => inspectAuthFreshness({ options, nowMs, services: ['note'] });
  try {
    assert.equal(inspect().checked, 0); assert.equal(inspect().ok, false);
    assert.equal(inspectAuthFreshness({ options, services: [] }).ok, false);
    mkdirSync(join(root, 'metadata'));
    const path = join(root, 'metadata/note.last-status.json');
    writeFileSync(path, JSON.stringify({ status: 'authenticated', checkedAt: '2026-11-14T00:00:00Z' }));
    assert.equal(inspect().ok, true);
    writeFileSync(path, JSON.stringify({ status: 'authenticated', checkedAt: '2026-11-08T00:00:00Z' }));
    assert.equal(inspect().ok, false); assert.match(inspect().results[0].command, /auth:status/);
    writeFileSync(join(root, 'metadata/note.autologin-failed'), '2026-11-14T00:00:00Z human_required');
    assert.equal(inspect().results[0].needsLogin, true);
    assert.match(run({ quiet: true, options, services: ['note'], nowMs }).stdout, /npm run auth:login -- --service note/);
    writeFileSync(path, '{broken');
    assert.equal(inspect().ok, false);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
