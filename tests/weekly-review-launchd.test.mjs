import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderWeeklyReviewBootstrap, renderWeeklyReviewPlist } from '../scripts/lib/weekly-review-launchd.mjs';

test('persistent bootstrap executes committed runner without reading dirty checkout', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'weekly-launchd-'));
  try {
    const remote = join(tmp, 'origin.git'), repo = join(tmp, "repo ' & space"), bootstrap = join(tmp, 'weekly-review.sh');
    const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    git('init', '--bare', remote);
    git('clone', remote, repo);
    git('-C', repo, 'checkout', '-b', 'develop');
    mkdirSync(join(repo, 'scripts/scheduled'), { recursive: true });
    const script = join(repo, 'scripts/scheduled/weekly-review.sh');
    writeFileSync(script, '#!/bin/bash\nprintf "committed runner: %s\\n" "$DOBOKU_WEEKLY_REPO"\n');
    git('-C', repo, 'add', 'scripts/scheduled/weekly-review.sh');
    git('-C', repo, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-m', 'fixture');
    git('-C', repo, 'push', '-u', 'origin', 'develop');
    writeFileSync(script, '#!/bin/bash\necho wrong-dirty-runner\nexit 99\n');
    writeFileSync(bootstrap, renderWeeklyReviewBootstrap(repo));
    const before = git('-C', repo, 'status', '--porcelain');
    const output = execFileSync('/bin/bash', [bootstrap], { encoding: 'utf8' });
    assert.equal(output.trim(), `committed runner: ${repo}`);
    assert.equal(git('-C', repo, 'status', '--porcelain'), before);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

test('plist points to permanent bootstrap and escapes paths for XML', () => {
  const out = renderWeeklyReviewPlist('<string>__BOOTSTRAP__</string><string>__REPO__</string><string>__HOME__</string>', { bootstrapPath: '/stable/job.sh', repoRoot: '/repo & data', homeDir: '/home/"name"' });
  assert.equal(out, '<string>/stable/job.sh</string><string>/repo &amp; data</string><string>/home/&quot;name&quot;</string>');
});
