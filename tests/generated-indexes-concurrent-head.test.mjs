import './lib/isolate-git-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('index inspection reports inconclusive when a concurrent commit changes HEAD', () => {
  const root = mkdtempSync(join(tmpdir(), 'index-head-'));
  try {
    const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    git('init'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid'); git('config', 'core.hooksPath', '/dev/null');
    mkdirSync(join(root, 'scripts/lib'), { recursive: true });
    copyFileSync(new URL('../scripts/check-generated-indexes.mjs', import.meta.url), join(root, 'scripts/check-generated-indexes.mjs'));
    writeFileSync(join(root, 'scripts/lib/repository-paths.mjs'), `export const REPO_ROOT = ${JSON.stringify(root)};`);
    writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: { 'refresh-indexes': 'node refresh.mjs' } }));
    writeFileSync(join(root, 'refresh.mjs'), "import {execFileSync} from 'node:child_process'; execFileSync('git',['commit','--allow-empty','-m','concurrent']);");
    git('add', 'scripts', 'package.json', 'refresh.mjs'); git('commit', '-m', 'fixture');
    const result = spawnSync(process.execPath, ['scripts/check-generated-indexes.mjs'], { cwd: root, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 2, result.stdout + result.stderr);
    assert.match(result.stderr, /HEAD が変わった/);
    assert.doesNotMatch(result.stdout, /生成物はコミットと一致/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
