import './lib/isolate-git-env.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { renderWeeklyReviewBootstrap, renderWeeklyReviewPlist } from '../scripts/lib/weekly-review-launchd.mjs';

// 収集と GSC の記録の段を stub で全部回す回は、負荷の無い Mac でも 13 秒かかる。上限が近いと負荷のある時に打ち切られて揺れる（2026-10-25）
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

// 回す範囲は収集の記録から決まる（--resume-plan）。再起動で後段が消えた週は post だけ、済んだ週は何もしない（2026-11-14・DN-1196）
const SCENARIOS = [
  { name: 'gscNeeded=false', gscNeeded: false, plan: 'all', order: ['pre', 'post'] },
  { name: 'gscNeeded=true', gscNeeded: true, plan: 'all', order: ['pre', 'gsc-claude', 'gsc-apply', 'post'] },
  { name: 'pre は済み・post だけ回し直す', gscNeeded: true, plan: 'post', order: ['post'] },
  { name: '今週の収集が済んでいれば何もしない', gscNeeded: true, plan: 'none', order: [] },
  { name: '同じ週に 3 回起動して終わらなければ、それ以上は回さない', gscNeeded: false, plan: 'all', attempts: 3, order: [] },
  { name: '「今すぐ実行」の印があれば、済んでいても最初から回す', gscNeeded: false, plan: 'none', force: true, order: ['pre', 'post'] },
];
for (const { name, gscNeeded, plan, order: expected, attempts = 0, force = false } of SCENARIOS) test(`installed runner collects and records GSC without running the review (${name})`, () => {
  const tmp = mkdtempSync(join(tmpdir(), 'review-cycle-'));
  try {
    const remote = join(tmp, 'origin.git'), repo = join(tmp, 'repo'), home = join(tmp, 'home');
    const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    git('init', '--bare', remote); git('clone', remote, repo); git('-C', repo, 'checkout', '-b', 'develop');
    git('-C', repo, 'config', 'user.name', 'Test'); git('-C', repo, 'config', 'user.email', 'test@example.invalid'); git('-C', repo, 'config', 'core.hooksPath', '/dev/null');
    const put = (path, text, mode = 0o644) => { mkdirSync(join(repo, path, '..'), { recursive: true }); writeFileSync(join(repo, path), text, { mode }); };
    put('.gitignore', '/node_modules\n/.env.local\n/doc-index-ready\n');
    put('scripts/report-automation-failure.mjs', 'process.exitCode=0;\n');
    put('.claude/scripts/build-doc-meta-index.mjs', "import {writeFileSync} from 'node:fs'; writeFileSync('doc-index-ready','ready');\n");
    // 土曜の収集（前・後）（DN-0817）
    put('scripts/weekly-collect.mjs', "import {appendFileSync,existsSync} from 'node:fs'; if(!existsSync('doc-index-ready')) throw new Error('metadata not prepared'); if (process.argv[2] === '--resume-plan') console.log(process.env.TEST_RESUME_PLAN ?? 'all'); else appendFileSync(process.env.HOME + '/order', process.argv[3] + '\\n');\n");
    // GSC の記録層（DN-0849）: 要るときだけ Claude を回し、断片の追記は apply-gsc-records が行う
    put('scripts/check-gsc-auto-review.mjs', "console.log(JSON.stringify({ logPath: 'gsc.md', gates: {} }));\n");
    put('scripts/apply-gsc-records.mjs', "import {appendFileSync} from 'node:fs'; if (process.argv.includes('--needed')) process.exitCode = process.env.TEST_GSC_NEEDED === '1' ? 0 : 3; else appendFileSync(process.env.HOME + '/order', 'gsc-apply\\n');\n");
    put('scripts/scheduled/gsc-record-prompt.md', 'GSC 計測「記録層」 テスト用の指示\n');
    git('-C', repo, 'add', '.gitignore', 'scripts', '.claude'); git('-C', repo, 'commit', '-m', 'fixture'); git('-C', repo, 'push', 'origin', 'develop');
    mkdirSync(join(home, '.local/bin'), { recursive: true });
    writeFileSync(join(home, '.local/bin/caffeinate'), '#!/bin/bash\nexit 0\n', { mode: 0o755 });
    // レビューの指示で呼ばれたら失敗させる（週次レビューは自動では回さない・2026-11-08）
    writeFileSync(join(home, '.local/bin/claude'), '#!/bin/bash\nset -eu\nif [[ "$2" == *"GSC 計測「記録層」"* ]]; then echo gsc-claude >> "$HOME/order"; exit 0; fi\necho unexpected-claude >> "$HOME/order"\nexit 9\n', { mode: 0o755 });
    const runner = new URL('../scripts/scheduled/weekly-review.sh', import.meta.url);
    const env = { ...process.env, HOME: home, DOBOKU_WEEKLY_REPO: repo, TEST_GSC_NEEDED: gscNeeded ? '1' : '0', TEST_RESUME_PLAN: plan, DOBOKU_WEEKLY_SKIP_DAY_GATE: '1' };
    const logDir = join(home, 'Library/Logs/doboku-note');
    mkdirSync(logDir, { recursive: true });
    const week = execFileSync('date', ['+%G-W%V'], { encoding: 'utf8' }).trim();
    if (attempts) writeFileSync(join(logDir, `weekly-collect-attempts-${week}`), `${attempts}\n`);
    if (force) writeFileSync(join(logDir, 'weekly-review.force'), 'now\n');
    try { execFileSync('/bin/bash', [runner.pathname], { env, timeout: RUNNER_TIMEOUT_MS }); }
    catch (e) { assert.fail(`${e.message}\n${readFileSync(join(home, 'Library/Logs/doboku-note/weekly-review.log'), 'utf8')}`); }
    const logOf = () => readFileSync(join(home, 'Library/Logs/doboku-note/weekly-review.log'), 'utf8');
    if (!expected.length) {
      assert.equal(existsSync(join(home, 'order')), false, logOf());
      // 何も回さない回は、失敗の通知も「ok」の記録も出さない・ロックを残さない
      assert.doesNotMatch(logOf(), /\[weekly-review\] ok|FAILED/);
      assert.equal(existsSync(join(logDir, 'weekly-review.lock')), false);
      return;
    }
    if (!existsSync(join(home, 'order'))) assert.fail(`収集が 1 段も回っていない\n${logOf()}`);
    const order = readFileSync(join(home, 'order'), 'utf8').trim().split('\n');
    // GSC の記録層は収集の前段と後段の間。要らない回は Claude を回さない。レビューの Claude は一度も呼ばない
    assert.deepEqual(order, expected);
    assert.equal(existsSync(join(logDir, 'weekly-review.force')), false, '「今すぐ実行」の印が残っている');
    const log = readFileSync(join(home, 'Library/Logs/doboku-note/weekly-review.log'), 'utf8');
    assert.match(log, /\[weekly-review\] ok/);
    // 自動実行用の worktree は 1 本だけ（レビュー専用の worktree を作らない）
    const worktrees = git('-C', repo, 'worktree', 'list', '--porcelain').split('\n').filter((l) => l.startsWith('worktree ')).map((l) => l.slice(9));
    assert.deepEqual(worktrees.slice(1).map((w) => w.split('/').at(-1)), ['weekly-collect']);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
