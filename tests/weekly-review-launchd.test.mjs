import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderWeeklyReviewBootstrap, renderWeeklyReviewPlist } from '../scripts/lib/weekly-review-launchd.mjs';

// 収集・GSC の記録・レビューの段を stub で全部回す回は、負荷の無い Mac でも 13 秒かかる。上限が近いと負荷のある時に打ち切られて揺れる（2026-10-25）
const RUNNER_TIMEOUT_MS = 60_000;

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

for (const [weeklyNeeded, dirtyAfter, gscNeeded = false] of [[false, false], [true, false], [true, true], [true, false, true]]) test(`installed runner checks evidence and clean exit (weeklyNeeded=${weeklyNeeded}, dirtyAfter=${dirtyAfter}, gscNeeded=${gscNeeded})`, () => {
  const tmp = mkdtempSync(join(tmpdir(), 'review-cycle-'));
  try {
    const remote = join(tmp, 'origin.git'), repo = join(tmp, 'repo'), home = join(tmp, 'home');
    const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    git('init', '--bare', remote); git('clone', remote, repo); git('-C', repo, 'checkout', '-b', 'develop');
    git('-C', repo, 'config', 'user.name', 'Test'); git('-C', repo, 'config', 'user.email', 'test@example.invalid'); git('-C', repo, 'config', 'core.hooksPath', '/dev/null');
    const put = (path, text, mode = 0o644) => { mkdirSync(join(repo, path, '..'), { recursive: true }); writeFileSync(join(repo, path), text, { mode }); };
    put('.gitignore', '/node_modules\n/.env.local\n/doc-index-ready\n');
    put('scripts/lib/review-week.mjs', "export const reviewWeekOfDay=()=> '2026-W42';\n");
    put('scripts/lib/jst-date.mjs', "export const todayJst=()=> '2026-10-17';\n");
    put('scripts/check-weekly-review.mjs', "import {existsSync} from 'node:fs'; process.exitCode=process.env.TEST_WEEKLY_NEEDED === '1' && !existsSync('monthly-done.txt') ? 1 : 0;\n");
    put('scripts/asset-hydrate.mjs', "import {existsSync} from 'node:fs'; if(!existsSync('doc-index-ready')) throw new Error('metadata not prepared');\n");
    put('scripts/check-backlog-verify.mjs', "import {existsSync,writeFileSync} from 'node:fs'; if(!existsSync('doc-index-ready')) throw new Error('metadata not prepared'); writeFileSync('precheck-result.txt','verified');\n");
    put('scripts/check-monthly-review-due.mjs', "import {existsSync} from 'node:fs'; const done=existsSync('monthly-done.txt'); if(process.argv.includes('--due-key')) console.log(done?'':'2026-09'); else process.exitCode=done?0:1;\n");
    put('scripts/report-automation-failure.mjs', 'process.exitCode=0;\n');
    put('.claude/scripts/build-doc-meta-index.mjs', "import {writeFileSync} from 'node:fs'; writeFileSync('doc-index-ready','ready');\n");
    // 土曜の収集（前・後）・Claude の書いた .claude/ のファイルの写し・下書きの作り直し（DN-0817・DN-0829）
    put('scripts/weekly-collect.mjs', "import {appendFileSync,existsSync} from 'node:fs'; if(!existsSync('doc-index-ready')) throw new Error('metadata not prepared'); appendFileSync(process.env.HOME + '/collect-calls', process.argv[3] + '\\n'); appendFileSync(process.env.HOME + '/order', process.argv[3] + '\\n');\n");
    // GSC の記録層（DN-0849）: 要るときだけ Claude を回し、断片の追記は apply-gsc-records が行う
    put('scripts/check-gsc-auto-review.mjs', "console.log(JSON.stringify({ logPath: 'gsc.md', gates: {} }));\n");
    put('scripts/apply-gsc-records.mjs', "import {appendFileSync} from 'node:fs'; if (process.argv.includes('--needed')) process.exitCode = process.env.TEST_GSC_NEEDED === '1' ? 0 : 3; else appendFileSync(process.env.HOME + '/order', 'gsc-apply\\n');\n");
    put('scripts/scheduled/gsc-record-prompt.md', 'GSC 計測「記録層」 テスト用の指示\n');
    put('scripts/apply-claude-out.mjs', 'process.exitCode=0;\n');
    put('scripts/build-weekly-review-draft.mjs', 'process.exitCode=0;\n');
    git('-C', repo, 'add', '.gitignore', 'scripts', '.claude'); git('-C', repo, 'commit', '-m', 'fixture'); git('-C', repo, 'push', 'origin', 'develop');
    mkdirSync(join(home, '.local/bin'), { recursive: true });
    writeFileSync(join(home, '.local/bin/caffeinate'), '#!/bin/bash\nexit 0\n', { mode: 0o755 });
    writeFileSync(join(home, '.local/bin/claude'), '#!/bin/bash\nset -eu\nif [[ "$2" == *"GSC 計測「記録層」"* ]]; then echo gsc-claude >> "$HOME/order"; exit 0; fi\n[[ "$2" == *"/monthly-review 2026-09"* ]]\necho review >> "$HOME/order"\n[[ "$DOBOKU_SNS_PAUSED" == "1" ]]\necho called >> "$HOME/calls"\necho done > monthly-done.txt\ngit add monthly-done.txt\nif [ -f precheck-result.txt ]; then\n  [[ "$2" == *"precheck-result.txt"* ]]\n  git add precheck-result.txt\nfi\ngit commit -m monthly\ngit push origin HEAD:develop\nif [ "$TEST_REVIEW_DIRTY" == "1" ]; then echo leftover > leftover.txt; fi\n', { mode: 0o755 });
    const runner = new URL('../scripts/scheduled/weekly-review.sh', import.meta.url);
    const env = { ...process.env, HOME: home, DOBOKU_WEEKLY_REPO: repo, TEST_WEEKLY_NEEDED: weeklyNeeded ? '1' : '0', TEST_REVIEW_DIRTY: dirtyAfter ? '1' : '0', TEST_GSC_NEEDED: gscNeeded ? '1' : '0' };
    if (dirtyAfter) {
      assert.throws(() => execFileSync('/bin/bash', [runner.pathname], { env, timeout: RUNNER_TIMEOUT_MS }), (e) => e.status === 1);
      const log = readFileSync(join(home, 'Library/Logs/doboku-note/weekly-review.log'), 'utf8');
      assert.match(log, /今回の未保存変更/);
      assert.doesNotMatch(log, /evidence complete/);
      // レビューが落ちても、後の収集は回る
      assert.equal(readFileSync(join(home, 'collect-calls'), 'utf8'), 'pre\npost\n');
      return;
    }
    try { execFileSync('/bin/bash', [runner.pathname], { env, timeout: RUNNER_TIMEOUT_MS }); }
    catch (e) { assert.fail(`${e.message}\n${readFileSync(join(home, 'Library/Logs/doboku-note/weekly-review.log'), 'utf8')}`); }
    try { execFileSync('/bin/bash', [runner.pathname], { env, timeout: RUNNER_TIMEOUT_MS }); }
    catch (e) { assert.fail(`${e.message}\n${readFileSync(join(home, 'Library/Logs/doboku-note/weekly-review.log'), 'utf8')}`); }
    assert.equal(readFileSync(join(home, 'calls'), 'utf8'), 'called\n');
    // 収集は毎回、レビューの前と後に回る（レビューが要らない回も）
    assert.equal(readFileSync(join(home, 'collect-calls'), 'utf8'), 'pre\npost\npre\npost\n');
    assert.equal(git('-C', repo, 'show', 'origin/develop:monthly-done.txt').trim(), 'done');
    // GSC の記録層は収集の前段の後・レビューの前。要らない回は Claude を回さない
    const order = readFileSync(join(home, 'order'), 'utf8').trim().split('\n');
    assert.deepEqual(order.slice(0, 5), gscNeeded ? ['pre', 'gsc-claude', 'gsc-apply', 'review', 'post'] : ['pre', 'review', 'post', 'pre', 'post']);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
