import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from '../scripts/lib/repository-paths.mjs';

test('metadata-only validates the real ledger without inspecting a mounted vault', () => {
  const vault = mkdtempSync(join(tmpdir(), 'vault-metadata-'));
  try {
    // This resolves as a mount, but contains none of the ledger's assets.
    writeFileSync(join(vault, 'README.md'), 'fixture');
    const result = spawnSync(process.execPath, ['scripts/check-drive-vault.mjs', '--metadata-only', '--json'], {
      cwd: REPO_ROOT, encoding: 'utf8', timeout: 15000,
      env: { ...process.env, DOBOKU_DRIVE_VAULT: vault },
    });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    const data = JSON.parse(result.stdout.slice(0, result.stdout.lastIndexOf('}') + 1));
    assert.ok(data.manifestEntries > 0);
    assert.ok(data.audienceChecked > 0);
    assert.ok(data.paths > 0);
    assert.equal(data.metadataOnly, true);
    assert.equal(data.existence, 0);
    assert.equal(data.hashed, 0);
    assert.match(data.physicalCheckReason, /--metadata-only/);
  } finally { rmSync(vault, { recursive: true, force: true }); }
});
